"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendDirectChallenge } from "@/lib/email";

const NewChallenge = z.object({
  city_id: z.string().uuid(),
  level: z.enum([
    "beginner",
    "recreational",
    "intermediate",
    "strong_club",
    "competitive",
    "former_pro",
  ]),
  format: z.enum(["singles", "doubles", "both"]),
  club_ids: z.array(z.string().uuid()).default([]),
  note: z.string().max(500).optional().or(z.literal("")),
  /** Optional — when set, the challenge is directed at this member only. */
  target_id: z.string().uuid().optional(),
});

export async function createChallenge(input: z.infer<typeof NewChallenge>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const parsed = NewChallenge.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  const v = parsed.data;

  if (v.target_id && v.target_id === user.id)
    return { ok: false, error: "You can't challenge yourself." } as const;

  const { data: ch, error } = await supabase
    .from("challenges")
    .insert({
      author_id: user.id,
      city_id: v.city_id,
      level: v.level,
      format: v.format,
      note: v.note || null,
      target_id: v.target_id ?? null,
    })
    .select("id")
    .single();
  if (error || !ch)
    return { ok: false, error: error?.message ?? "insert failed" } as const;

  if (v.club_ids.length > 0) {
    await supabase
      .from("challenge_clubs")
      .insert(v.club_ids.map((club_id) => ({ challenge_id: ch.id, club_id })));
  }

  // Direct-challenge email notification
  if (v.target_id) {
    const [{ data: target }, { data: me }, { data: city }] = await Promise.all([
      supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", v.target_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("cities")
        .select("name")
        .eq("id", v.city_id)
        .maybeSingle(),
    ]);
    const targetEmail = (target as { email?: string } | null)?.email;
    const targetName = (target as { full_name?: string | null } | null)?.full_name;
    const myName = (me as { full_name?: string | null } | null)?.full_name;
    const cityName = (city as { name?: string } | null)?.name ?? "your city";
    if (targetEmail && myName) {
      void sendDirectChallenge({
        to: targetEmail,
        firstName: targetName?.split(" ")[0],
        authorName: myName,
        cityName,
        format: v.format,
        note: v.note || undefined,
      }).catch((e) =>
        console.error("[email] sendDirectChallenge failed:", e),
      );
    }
  }

  revalidatePath("/app/challenges");
  revalidatePath("/app/profile");
  return { ok: true } as const;
}

export async function acceptChallenge(challengeId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { error } = await supabase
    .from("challenges")
    .update({
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
      status: "accepted",
    })
    .eq("id", challengeId);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/app/challenges");
  revalidatePath("/app/profile");
  return { ok: true } as const;
}

export async function passChallenge(challengeId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;
  const { error } = await supabase
    .from("challenge_passes")
    .insert({ challenge_id: challengeId, profile_id: user.id });
  if (error && !error.message.includes("duplicate key"))
    return { ok: false, error: error.message } as const;
  revalidatePath("/app/challenges");
  return { ok: true } as const;
}

/** Used by the target to decline a direct challenge. RLS only lets the
 * target flip a still-open challenge to 'cancelled'. */
export async function declineDirectChallenge(challengeId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("challenges")
    .update({ status: "cancelled" })
    .eq("id", challengeId);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/app/challenges");
  revalidatePath("/app/profile");
  return { ok: true } as const;
}

export async function cancelChallenge(challengeId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("challenges")
    .update({ status: "cancelled" })
    .eq("id", challengeId);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/app/challenges");
  return { ok: true } as const;
}
