import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ApplyWizard } from "./ApplyWizard";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status === "approved") redirect("/app/profile");
  if (profile.status === "waitlisted") redirect("/waitlisted");
  if (profile.status === "rejected") redirect("/rejected");

  const supabase = createClient();
  const [{ data: cities }, { data: clubs }] = await Promise.all([
    supabase.from("cities").select("*").order("name"),
    supabase.from("clubs").select("*").order("name"),
  ]);

  return (
    <ApplyWizard
      profile={profile}
      cities={(cities ?? []) as never}
      clubs={(clubs ?? []) as never}
    />
  );
}
