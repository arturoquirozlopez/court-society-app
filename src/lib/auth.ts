import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Read the current authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Read the current member profile joined with auth, or null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as unknown as Profile | null) ?? null;
}

/** Require approved status or redirect. */
export async function requireApproved(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!p) redirect("/login");
  if (p.status !== "approved") {
    redirect(
      p.status === "waitlisted"
        ? "/waitlisted"
        : p.status === "rejected"
          ? "/rejected"
          : "/pending",
    );
  }
  return p;
}

/** Require admin or steward, redirect otherwise. */
export async function requireAdmin(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!p) redirect("/login");
  if (p.role !== "admin" && p.role !== "steward") redirect("/app/profile");
  return p;
}
