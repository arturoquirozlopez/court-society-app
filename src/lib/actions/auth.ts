"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const EmailSchema = z.string().email();

export type LoginResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Sign in via Supabase magic link (email OTP).
 * Triggered from the /login form (Client Component → Server Action).
 */
export async function sendMagicLink(formData: FormData): Promise<LoginResult> {
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = EmailSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      shouldCreateUser: true,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, email: parsed.data };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
