import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

/**
 * Root route:
 *   - signed-out → /login
 *   - signed-in pending/waitlisted/rejected → corresponding gate
 *   - signed-in approved → /app/profile
 *
 * The marketing landing lives on courtsociety.org, not here.
 */
export default async function Home() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  // Post-login lands on Profile — same on mobile and desktop. Desktop users
  // reach the dashboard via the sidebar (or via the brand mark).
  if (profile.status === "approved") redirect("/app/profile");
  if (profile.status === "waitlisted") redirect("/waitlisted");
  if (profile.status === "rejected") redirect("/rejected");
  redirect("/pending");
}
