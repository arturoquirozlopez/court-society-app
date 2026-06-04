"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendApplicationReceived } from "@/lib/email";

const ApplicationSchema = z.object({
  full_name: z.string().min(2, "Your name is required."),
  headline: z.string().max(160).optional().or(z.literal("")),
  linkedin_url: z
    .string()
    .url("Enter a valid LinkedIn URL.")
    .refine(
      (u) => /linkedin\.com\//i.test(u),
      "URL must be a LinkedIn profile (linkedin.com/in/...)",
    ),
  gender: z.enum(["M", "F"]).optional(),
  whatsapp: z
    .string()
    .min(6, "WhatsApp with country code is required.")
    .max(32),
  home_city_id: z.string().uuid("Pick a city."),
  home_club_id: z.string().uuid("Pick a club."),
  other_club_name: z.string().max(120).optional().or(z.literal("")),
  level: z.enum([
    "beginner",
    "recreational",
    "intermediate",
    "strong_club",
    "competitive",
    "former_pro",
  ]),
  format: z.enum(["singles", "doubles", "both"]),
  frequency: z.enum([
    "less_than_weekly",
    "weekly",
    "two_to_three",
    "four_plus",
  ]),
  travel_city_ids: z.array(z.string().uuid()).default([]),
  nominated_by_text: z.string().max(160).optional().or(z.literal("")),
});

export type ApplicationFormValues = z.infer<typeof ApplicationSchema>;

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function submitApplication(
  values: ApplicationFormValues,
  opts?: { nominationId?: string | null },
): Promise<SubmitResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = ApplicationSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const v = parsed.data;

  // Update profile fields (RLS: self can update their own row, except role/status)
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name: v.full_name,
      headline: v.headline || null,
      linkedin_url: v.linkedin_url || null,
      whatsapp: v.whatsapp,
      gender: v.gender ?? null,
      home_city_id: v.home_city_id,
      home_club_id: v.home_club_id,
      other_club_name: v.other_club_name || null,
      level: v.level,
      format: v.format,
      frequency: v.frequency,
      travel_city_ids: v.travel_city_ids,
      nominated_by_text: v.nominated_by_text || null,
    })
    .eq("id", user.id);

  if (profileErr) return { ok: false, error: profileErr.message };

  // Update the open application row (one per user, created by trigger).
  const { error: appErr } = await supabase
    .from("applications")
    .update({ payload: v })
    .eq("profile_id", user.id)
    .eq("status", "pending");

  if (appErr) return { ok: false, error: appErr.message };

  // If the applicant arrived via a nomination link, mark that nomination
  // as "applied" and connect it to this profile. Done with the service role
  // because the nominee may not have visibility into the nominations row
  // until they're approved.
  if (opts?.nominationId) {
    const admin = createServiceClient();
    await admin
      .from("nominations")
      .update({
        status: "applied",
        applied_profile_id: user.id,
        applied_at: new Date().toISOString(),
      })
      .eq("id", opts.nominationId)
      .eq("status", "pending");
  }

  // Best-effort transactional email — never block the response on it.
  void sendApplicationReceived({
    to: user.email!,
    firstName: v.full_name.split(" ")[0],
  }).catch((err) =>
    console.error("[email] sendApplicationReceived failed:", err),
  );

  revalidatePath("/pending");
  redirect("/pending");
}
