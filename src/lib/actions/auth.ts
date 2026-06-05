"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const EmailSchema = z.string().email();
const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export type LoginResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export type PasswordSignInResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string; needsPassword?: boolean };

export type PasswordSignUpResult =
  | { ok: true }
  | { ok: false; error: string };

export type GenericResult = { ok: true } | { ok: false; error: string };

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

/* ─────────── PASSWORD AUTH (new primary path) ─────────── */

/**
 * Email + password sign-up. Establishes the session immediately, so the
 * caller can navigate to `/apply` without a magic-link round-trip — the
 * conversion-leak we're closing.
 *
 * The `handle_new_user()` DB trigger still seeds `profiles` and
 * `applications` rows. `password_set_at` is filled here.
 */
export async function signUpWithPassword(
  formData: FormData,
): Promise<PasswordSignUpResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EmailSchema.safeParse(email).success)
    return { ok: false, error: "Enter a valid email." };
  if (!PasswordSchema.safeParse(password).success)
    return { ok: false, error: "Password must be at least 8 characters." };
  if (password !== confirm)
    return { ok: false, error: "Passwords don't match." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Email confirmation is OFF at the Supabase project level — the
      // session is live on success. emailRedirectTo is only used if the
      // operator turns confirmation back on; harmless to set.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (error) {
    // Supabase returns "User already registered" — guide the user to sign in
    if (/already (registered|exists)/i.test(error.message))
      return {
        ok: false,
        error:
          "An account with that email already exists. Sign in instead, or reset your password.",
      };
    return { ok: false, error: error.message };
  }
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ password_set_at: new Date().toISOString() })
      .eq("id", data.user.id);
  }
  return { ok: true };
}

/**
 * Email + password sign-in. On the "wrong password" path we transparently
 * fall back to a magic link + `next=/app/account/password`, so legacy users
 * (who only ever had magic links) can set a password the first time they
 * try to sign in the new way.
 */
export async function signInWithPassword(
  formData: FormData,
): Promise<PasswordSignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  const next = safeNext(nextRaw);

  if (!EmailSchema.safeParse(email).success)
    return { ok: false, error: "Enter a valid email." };
  if (!password)
    return { ok: false, error: "Enter your password." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    // Legacy migration: if the user has no password yet, send a magic link
    // pointing at /app/account/password and tell the caller to surface a
    // friendly notice.
    if (/invalid login credentials/i.test(error.message)) {
      const callback = new URL(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      );
      callback.searchParams.set("next", "/app/account/password");
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callback.toString(),
          shouldCreateUser: false,
        },
      });
      return {
        ok: false,
        error:
          "Looks like you haven't set a password yet. We've sent you a sign-in link — open it to set one.",
        needsPassword: true,
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, redirect: next || "/" };
}

/**
 * "Forgot password" — fires Supabase's recovery email. Lands on
 * /auth/reset?type=recovery on the user's browser.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<GenericResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EmailSchema.safeParse(email).success)
    return { ok: false, error: "Enter a valid email." };
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Update password for the currently-signed-in user. Used by /auth/reset
 * (after the recovery code is exchanged) and /app/account/password
 * (first-time set for legacy users).
 */
export async function updatePassword(
  formData: FormData,
): Promise<GenericResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!PasswordSchema.safeParse(password).success)
    return { ok: false, error: "Password must be at least 8 characters." };
  if (password !== confirm)
    return { ok: false, error: "Passwords don't match." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("profiles")
    .update({ password_set_at: new Date().toISOString() })
    .eq("id", user.id);
  return { ok: true };
}

/* ─────────── helpers ─────────── */

function safeNext(raw: string): string {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  if (raw.length > 256) return "";
  return raw;
}
