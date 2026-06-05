import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Password-reset landing. Supabase sends the user here with `?code=<pkce>`
 * (the standard SSR recovery flow). We exchange the code for a session and
 * forward to /auth/reset/set so the user can type a new password while
 * authenticated.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    const back = new URL("/login", url.origin);
    back.searchParams.set(
      "e",
      "Reset link is missing its verification code. Request a new one.",
    );
    return NextResponse.redirect(back);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const back = new URL("/login", url.origin);
    back.searchParams.set(
      "e",
      `Reset failed: ${error.message}. Request a fresh link.`,
    );
    return NextResponse.redirect(back);
  }
  return NextResponse.redirect(new URL("/auth/reset/set", url.origin));
}
