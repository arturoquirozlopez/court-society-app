import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSeason,
  getCityMap,
  getClubMap,
  getSeasonStandings,
} from "@/lib/queries";
import { Hero } from "@/components/Hero";
import { RankingClient } from "./RankingClient";
import type { GroupWithContext, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const me = await requireApproved();
  const supabase = createClient();

  const [{ data: members }, cityMap, clubMap, season] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("status", "approved")
      .order("full_name"),
    getCityMap(),
    getClubMap(),
    getActiveSeason(),
  ]);

  const standings = season ? await getSeasonStandings(season.id) : new Map();
  const players = ((members ?? []) as unknown as Profile[]).map((p) => {
    const s = standings.get(p.id) ?? { wins: 0, losses: 0 };
    return { ...p, wins: s.wins, losses: s.losses };
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: vps } = await supabase
    .from("visiting_plans")
    .select("profile_id, city_id, end_date")
    .or(`end_date.is.null,end_date.gte.${today}`);
  const visitingByProfile: Record<string, string> = {};
  for (const v of vps ?? [])
    visitingByProfile[v.profile_id as string] = v.city_id as string;

  // Groups I belong to (RLS only returns those where I'm a member)
  const { data: myGroups } = await supabase
    .from("groups")
    .select("id, name, creator_id, created_at")
    .order("created_at", { ascending: false });

  const groupIds = (myGroups ?? []).map((g) => g.id as string);
  const { data: gmRows } = groupIds.length
    ? await supabase
        .from("group_members")
        .select("group_id, profile_id")
        .in("group_id", groupIds)
    : { data: [] as { group_id: string; profile_id: string }[] };

  const memberIdsByGroup = new Map<string, string[]>();
  for (const row of gmRows ?? []) {
    const gid = row.group_id as string;
    const arr = memberIdsByGroup.get(gid) ?? [];
    arr.push(row.profile_id as string);
    memberIdsByGroup.set(gid, arr);
  }

  const groups: GroupWithContext[] = ((myGroups ?? []) as unknown as {
    id: string;
    name: string;
    creator_id: string;
    created_at: string;
  }[]).map((g) => ({
    ...g,
    member_ids: memberIdsByGroup.get(g.id) ?? [],
    is_creator: g.creator_id === me.id,
  }));

  const cities = Array.from(cityMap.entries()).map(([id, c]) => ({
    id,
    name: c.name,
  }));
  const clubs = Array.from(clubMap.entries()).map(([id, c]) => ({
    id,
    name: c.name,
    city_id: c.city_id,
  }));

  return (
    <div>
      <Hero
        title={<>Ranking</>}
        subtitle={`${season ? `Season ${season.year}` : "—"} · ${players.length} members · by win rate`}
      />
      <RankingClient
        meId={me.id}
        meCityId={me.home_city_id}
        meClubId={me.home_club_id}
        meLevel={me.level}
        players={players}
        cities={cities}
        clubs={clubs}
        visitingByProfile={visitingByProfile}
        groups={groups}
      />
    </div>
  );
}
