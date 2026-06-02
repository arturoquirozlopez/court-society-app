import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/types";

/**
 * Refresh Supabase session and apply the status-based routing rules.
 *
 * Reachable without auth: /login, /apply, /auth/*, /, static assets.
 * Authed by status:
 *   pending     → forced to /pending  (can still hit /apply to edit)
 *   waitlisted  → forced to /waitlisted
 *   rejected    → forced to /rejected
 *   approved    → can access /app/*; /admin/* requires steward|admin role
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isPublic =
    path === "/" ||
    path === "/login" ||
    path === "/apply" ||
    path.startsWith("/auth/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/favicon");

  // Not signed in: only public routes; everything else → /login
  if (!user) {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Signed in: look up status + role
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return response; // trigger hasn't run yet — let the page handle

  const status = profile.status;
  const role = profile.role;

  // Admin gating
  if (path.startsWith("/admin")) {
    if (role !== "admin" && role !== "steward") {
      const url = request.nextUrl.clone();
      url.pathname = "/app/profile";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Member app gating
  if (path.startsWith("/app")) {
    if (status !== "approved") {
      const url = request.nextUrl.clone();
      url.pathname =
        status === "waitlisted"
          ? "/waitlisted"
          : status === "rejected"
            ? "/rejected"
            : "/pending";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Block sign-in/apply for already-authenticated approved members
  if (status === "approved" && (path === "/login" || path === "/pending")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/profile";
    return NextResponse.redirect(url);
  }

  return response;
}
