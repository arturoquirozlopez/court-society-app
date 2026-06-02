"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ProfilePatch = z.object({
  full_name: z.string().min(2).max(120).optional(),
  headline: z.string().max(160).optional(),
  whatsapp: z.string().min(6).max(32).optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
});

export async function updateProfile(values: z.infer<typeof ProfilePatch>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const parsed = ProfilePatch.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/app/profile");
  return { ok: true } as const;
}

/** Set / clear the visiting city. MVP: latest insert wins. */
export async function setVisitingCity(cityId: string | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  if (!cityId) {
    // Clear: end-date all open plans
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("visiting_plans")
      .update({ end_date: today })
      .eq("profile_id", user.id)
      .is("end_date", null);
  } else {
    await supabase.from("visiting_plans").insert({
      profile_id: user.id,
      city_id: cityId,
    });
  }
  revalidatePath("/app/profile");
  revalidatePath("/app/challenges");
  return { ok: true } as const;
}

/**
 * Avatar upload. Accepts a base64 data URL or raw bytes via FormData.
 * Stores at `{user_id}/avatar.{ext}` and writes the public URL to profile.
 */
export async function uploadAvatar(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "No file provided." } as const;
  if (file.size > 5 * 1024 * 1024)
    return { ok: false, error: "Max file size is 5MB." } as const;

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) return { ok: false, error: uploadErr.message } as const;

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?t=${Date.now()}`; // bust CDN cache after replace
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ photo_url: url })
    .eq("id", user.id);
  if (profileErr) return { ok: false, error: profileErr.message } as const;

  revalidatePath("/app/profile");
  return { ok: true, url } as const;
}
