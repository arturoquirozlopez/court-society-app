"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason } from "@/lib/queries";
import { sendMatchConfirmationRequest } from "@/lib/email";

/**
 * Standardised score format: each set is a "G-G" pair separated by spaces.
 * Example: "6-4"  ·  "6-4 7-5"  ·  "6-4 3-6 9-7".  The regex accepts 1 to 3
 * sets, each game count 0–9 (loose enough for long deciding sets), plus an
 * optional tiebreak suffix "(10-7)".
 */
const SCORE_RE = /^[0-9]-[0-9]( [0-9]-[0-9]){0,2}(\(\d{1,2}-\d{1,2}\))?$/;

const NewMatch = z.object({
  opponent_id: z.string().uuid(),
  author_result: z.enum(["W", "L"]),
  score: z
    .string()
    .max(40)
    .refine((s) => s === "" || SCORE_RE.test(s), "Invalid score format.")
    .optional()
    .or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),
});

export async function logMatch(input: z.infer<typeof NewMatch>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const parsed = NewMatch.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  const v = parsed.data;

  if (v.opponent_id === user.id)
    return { ok: false, error: "You can't log a match against yourself." } as const;

  const season = await getActiveSeason();
  if (!season) return { ok: false, error: "No active season." } as const;

  const { error } = await supabase.from("matches").insert({
    season_id: season.id,
    author_id: user.id,
    opponent_id: v.opponent_id,
    author_result: v.author_result,
    score: v.score || null,
    note: v.note || null,
  });
  if (error) return { ok: false, error: error.message } as const;

  // Notify the opponent that they need to confirm/dispute (best-effort)
  const [{ data: opponent }, { data: me }] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", v.opponent_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const opEmail = (opponent as { email?: string } | null)?.email;
  const opName = (opponent as { full_name?: string | null } | null)?.full_name;
  const myName = (me as { full_name?: string | null } | null)?.full_name;
  if (opEmail && myName) {
    void sendMatchConfirmationRequest({
      to: opEmail,
      firstName: opName?.split(" ")[0],
      authorName: myName,
      // Opponent won iff author's result is 'L'
      opponentWon: v.author_result === "L",
      score: v.score || null,
      note: v.note || undefined,
    }).catch((e) =>
      console.error("[email] sendMatchConfirmationRequest failed:", e),
    );
  }

  revalidatePath("/app/h2h");
  revalidatePath("/app/ranking");
  revalidatePath("/app/profile");
  return { ok: true } as const;
}

export async function confirmMatch(matchId: string, accept: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      status: accept ? "confirmed" : "disputed",
      confirmed_at: accept ? new Date().toISOString() : null,
    })
    .eq("id", matchId);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/app/h2h");
  revalidatePath("/app/profile");
  revalidatePath("/app/ranking");
  return { ok: true } as const;
}
