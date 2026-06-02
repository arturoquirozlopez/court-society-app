import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link callback. Supabase sends the user here with `?code=...`.
 * We exchange the code for a session and then route by status.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) return NextResponse.redirect(new URL("/login?e=missing_code", url.origin));

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?e=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // Look up profile to route by status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // The trigger should have created it; give it a beat and send to /apply.
    return NextResponse.redirect(new URL("/apply", url.origin));
  }

  const target =
    profile.status === "approved"
      ? "/app/profile"
      : profile.status === "waitlisted"
        ? "/waitlisted"
        : profile.status === "rejected"
          ? "/rejected"
          : "/apply";

  return NextResponse.redirect(new URL(next === "/" ? target : next, url.origin));
}
