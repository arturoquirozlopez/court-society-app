"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Mark the first-time onboarding as completed for the current user.
 * Idempotent — calling twice is safe.
 */
export async function completeOnboarding() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/app", "layout");
  return { ok: true } as const;
}
