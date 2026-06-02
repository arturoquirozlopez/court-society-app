import { createClient } from "@/lib/supabase/server";
import { getCityMap, getClubMap } from "@/lib/queries";
import { ApplicationsClient } from "./ApplicationsClient";
import type { Application, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const filter = (searchParams.status ?? "pending") as
    | "pending"
    | "approved"
    | "waitlisted"
    | "rejected"
    | "all";

  let q = supabase.from("applications").select("*").order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data: applications } = await q;

  const applicantIds = Array.from(
    new Set((applications ?? []).map((a) => a.profile_id as string)),
  );
  const { data: profiles } = applicantIds.length
    ? await supabase.from("profiles").select("*").in("id", applicantIds)
    : { data: [] as Profile[] };

  const profileById = new Map<string, Profile>(
    (profiles ?? []).map((p) => [p.id as string, p as unknown as Profile]),
  );

  // Nominations attached to these applicants (so we can show "Nominated by X")
  const { data: noms } = applicantIds.length
    ? await supabase
        .from("nominations")
        .select("applied_profile_id, nominator_id, note")
        .in("applied_profile_id", applicantIds)
    : { data: [] as { applied_profile_id: string; nominator_id: string; note: string | null }[] };

  const nominatorIds = Array.from(
    new Set((noms ?? []).map((n) => n.nominator_id as string)),
  );
  const { data: nominators } = nominatorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", nominatorIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const nominatorById = new Map(
    (nominators ?? []).map((n) => [n.id as string, n.full_name as string | null]),
  );

  const nominationByProfile: Record<
    string,
    { nominatorName: string | null; note: string | null }
  > = {};
  for (const n of noms ?? []) {
    nominationByProfile[n.applied_profile_id as string] = {
      nominatorName: nominatorById.get(n.nominator_id as string) ?? null,
      note: (n.note as string | null) ?? null,
    };
  }

  const [cityMap, clubMap] = await Promise.all([getCityMap(), getClubMap()]);

  return (
    <ApplicationsClient
      filter={filter}
      applications={(applications ?? []) as unknown as Application[]}
      profileById={Object.fromEntries(profileById)}
      cityById={Object.fromEntries(cityMap)}
      clubById={Object.fromEntries(clubMap)}
      nominationByProfile={nominationByProfile}
    />
  );
}
