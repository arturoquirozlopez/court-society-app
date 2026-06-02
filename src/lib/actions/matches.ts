"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason } from "@/lib/queries";

const NewMatch = z.object({
  opponent_id: z.string().uuid(),
  author_result: z.enum(["W", "L"]),
  score: z.string().max(40).optional().or(z.literal("")),
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

  revalidatePath("/app/h2h");
  revalidatePath("/app/ranking");
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
