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
    (profiles ?? []).map((p) => [p.id as string, p as Profile]),
  );

  const [cityMap, clubMap] = await Promise.all([getCityMap(), getClubMap()]);

  return (
    <ApplicationsClient
      filter={filter}
      applications={(applications ?? []) as Application[]}
      profileById={Object.fromEntries(profileById)}
      cityById={Object.fromEntries(cityMap)}
      clubById={Object.fromEntries(clubMap)}
    />
  );
}
