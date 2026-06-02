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
  // Only honour same-origin paths to prevent open-redirects
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "";

  if (!code) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("e", "missing_code");
    if (next) back.searchParams.set("next", next);
    return NextResponse.redirect(back);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("e", error.message);
    if (next) back.searchParams.set("next", next);
    return NextResponse.redirect(back);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const back = new URL("/login", url.origin);
    if (next) back.searchParams.set("next", next);
    return NextResponse.redirect(back);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  // If a `next` was provided, honour it for pending/no-profile users so the
  // nomination token survives the round-trip. /apply will gate-check the
  // status itself and the trigger has another beat to populate the row.
  if (!profile || profile.status === "pending") {
    return NextResponse.redirect(new URL(next || "/apply", url.origin));
  }

  const target =
    profile.status === "approved"
      ? "/app/profile"
      : profile.status === "waitlisted"
        ? "/waitlisted"
        : "/rejected";

  // For waitlisted/rejected we ignore `next` — gates own the routing.
  return NextResponse.redirect(new URL(target, url.origin));
}
