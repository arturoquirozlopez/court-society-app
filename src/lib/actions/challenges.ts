"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
});

export async function createChallenge(input: z.infer<typeof NewChallenge>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const parsed = NewChallenge.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  const v = parsed.data;

  const { data: ch, error } = await supabase
    .from("challenges")
    .insert({
      author_id: user.id,
      city_id: v.city_id,
      level: v.level,
      format: v.format,
      note: v.note || null,
    })
    .select("id")
    .single();
  if (error || !ch) return { ok: false, error: error?.message ?? "insert failed" } as const;

  if (v.club_ids.length > 0) {
    await supabase
      .from("challenge_clubs")
      .insert(v.club_ids.map((club_id) => ({ challenge_id: ch.id, club_id })));
  }
  revalidatePath("/app/challenges");
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
