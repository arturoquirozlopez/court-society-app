import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link callback. Supabase sends the user here with `?code=...`.
 * We exchange the code for a session and then route by status, preserving
 * any `next` query parameter (used by the nominations flow to carry the
 * `?nom=<token>` back to /apply).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "";
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "";

  console.log("[auth/callback] hit", {
    hasCode: Boolean(code),
    next,
    referer: request.headers.get("referer"),
  });

  if (!code) {
    console.warn("[auth/callback] missing code in request");
    const back = new URL("/login", url.origin);
    back.searchParams.set(
      "e",
      "Sign-in link is missing its verification code. Try requesting a new one.",
    );
    if (next) back.searchParams.set("next", next);
    return NextResponse.redirect(back);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error(
      "[auth/callback] exchangeCodeForSession failed:",
      error.message,
      { name: error.name, status: error.status },
    );
    const back = new URL("/login", url.origin);
    back.searchParams.set(
      "e",
      `Sign-in failed: ${error.message}. Make sure you opened the link in the same browser where you requested it.`,
    );
    if (next) back.searchParams.set("next", next);
    return NextResponse.redirect(back);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error(
      "[auth/callback] getUser returned null after successful exchange",
    );
    const back = new URL("/login", url.origin);
    back.searchParams.set(
      "e",
      "Session was not established. Please request a new sign-in link from this browser.",
    );
    if (next) back.searchParams.set("next", next);
    return NextResponse.redirect(back);
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    console.error(
      "[auth/callback] profile lookup failed:",
      profileErr.message,
    );
  }

  console.log("[auth/callback] resolved", {
    userId: user.id,
    email: user.email,
    status: (profile as { status?: string } | null)?.status ?? "(no profile yet)",
    nextTarget: next || "(default)",
  });

  // For pending/no-profile users, honour `next` so the nomination token survives.
  if (!profile || (profile as { status?: string }).status === "pending") {
    return NextResponse.redirect(new URL(next || "/apply", url.origin));
  }

  const status = (profile as { status: string }).status;
  const target =
    status === "approved"
      ? "/app/profile"
      : status === "waitlisted"
        ? "/waitlisted"
        : "/rejected";
  return NextResponse.redirect(new URL(target, url.origin));
}
