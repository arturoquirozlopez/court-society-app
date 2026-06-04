import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getNominationByToken } from "@/lib/actions/nominations";
import { ApplyWizard } from "./ApplyWizard";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: { nom?: string };
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    // Preserve the nomination token through the login round-trip
    const next = searchParams.nom
      ? `/apply?nom=${encodeURIComponent(searchParams.nom)}`
      : "/apply";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (profile.status === "approved") redirect("/app/profile");
  if (profile.status === "waitlisted") redirect("/waitlisted");
  if (profile.status === "rejected") redirect("/rejected");

  // If a ?nom=<token> is present, look it up for the "nominated by X" banner.
  const nomination = searchParams.nom
    ? await getNominationByToken(searchParams.nom)
    : null;

  const supabase = createClient();
  const [{ data: cities }, { data: clubs }] = await Promise.all([
    supabase
      .from("cities")
      .select("*")
      .eq("active", true)
      .order("name"),
    supabase
      .from("clubs")
      .select("*")
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <ApplyWizard
      profile={profile}
      cities={(cities ?? []) as never}
      clubs={(clubs ?? []) as never}
      nomination={nomination}
    />
  );
}
