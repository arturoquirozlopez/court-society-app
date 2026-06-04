import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCityMap, getClubMap } from "@/lib/queries";
import { Hero } from "@/components/Hero";
import { MembersClient } from "./MembersClient";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const me = await requireApproved();
  const supabase = createClient();

  const [{ data: profiles }, cityMap, clubMap] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("status", "approved")
      .order("full_name"),
    getCityMap(),
    getClubMap(),
  ]);

  // RLS already filters to approved-visible, but defensive filter:
  const members = ((profiles ?? []) as unknown as Profile[]).filter(
    (p) => p.status === "approved",
  );

  // Active visiting plans → city_id → member ids (for "visiting X" badge)
  const today = new Date().toISOString().slice(0, 10);
  const { data: vps } = await supabase
    .from("visiting_plans")
    .select("profile_id, city_id, end_date")
    .or(`end_date.is.null,end_date.gte.${today}`);
  const visitingByProfile = new Map<string, string>();
  for (const v of vps ?? [])
    visitingByProfile.set(v.profile_id as string, v.city_id as string);

  const cities = Array.from(cityMap.entries())
    .filter(([, c]) => c.active)
    .map(([id, c]) => ({ id, name: c.name }));
  const clubs = Array.from(clubMap.entries())
    .filter(([, c]) => c.active)
    .map(([id, c]) => ({
    id,
    name: c.name,
    city_id: c.city_id,
  }));

  return (
    <div>
      <Hero
        title={<>Members</>}
        subtitle={`${members.length} members across ${cities.length} cities`}
      />
      <MembersClient
        meId={me.id}
        meHomeCityId={me.home_city_id}
        meHomeClubId={me.home_club_id}
        members={members}
        cities={cities}
        clubs={clubs}
        visitingByProfile={Object.fromEntries(visitingByProfile)}
      />
    </div>
  );
}
