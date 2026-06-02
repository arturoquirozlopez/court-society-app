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

  // Preserve the post-login destination through the magic-link round-trip
  // (used by the nominations flow so the nominee lands back on /apply?nom=…).
  const nextRaw = String(formData.get("next") ?? "");
  const nextOk =
    nextRaw &&
    nextRaw.startsWith("/") &&
    !nextRaw.startsWith("//") &&
    nextRaw.length < 256;
  const callbackUrl = new URL(
    `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  );
  if (nextOk) callbackUrl.searchParams.set("next", nextRaw);

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: callbackUrl.toString(),
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
