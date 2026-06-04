import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSeason,
  getCityMap,
  getClubMap,
  getProfilesByIds,
  getSeasonRanking,
} from "@/lib/queries";
import { Hero } from "@/components/Hero";
import { RankingClient } from "./RankingClient";
import type {
  GroupInvitation,
  GroupWithContext,
  Profile,
} from "@/lib/types";

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

  const { ranking } = season
    ? await getSeasonRanking(season.id)
    : { ranking: new Map() };
  const players = ((members ?? []) as unknown as Profile[]).map((p) => {
    const r = ranking.get(p.id);
    return {
      ...p,
      wins: r?.wins ?? 0,
      losses: r?.losses ?? 0,
      total_points: r?.total_points ?? 0,
      total_matches: r?.total_matches ?? 0,
      base_points: r?.base_points ?? 0,
      matches_last_30: r?.matches_last_30 ?? 0,
      activity_multiplier: r?.activity_multiplier ?? 1,
      days_since_last: r?.days_since_last ?? null,
      decay_factor: r?.decay_factor ?? 1,
      avg_opponent_level: r?.avg_opponent_level ?? null,
      recent_results: r?.recent_results ?? [],
    };
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: vps } = await supabase
    .from("visiting_plans")
    .select("profile_id, city_id, end_date")
    .or(`end_date.is.null,end_date.gte.${today}`);
  const visitingByProfile: Record<string, string> = {};
  for (const v of vps ?? [])
    visitingByProfile[v.profile_id as string] = v.city_id as string;

  // All groups I'm in (any status), via RLS
  const { data: groupsData } = await supabase
    .from("groups")
    .select("id, name, creator_id, created_at")
    .order("created_at", { ascending: false });

  const groupIds = (groupsData ?? []).map((g) => g.id as string);

  // My membership status per group + all-accepted member ids per group
  const { data: myMemberships } = groupIds.length
    ? await supabase
        .from("group_members")
        .select("group_id, status, joined_at")
        .eq("profile_id", me.id)
    : { data: [] as { group_id: string; status: string; joined_at: string }[] };

  const myStatusByGroup = new Map<string, { status: string; joined_at: string }>();
  for (const m of myMemberships ?? [])
    myStatusByGroup.set(m.group_id as string, {
      status: m.status as string,
      joined_at: m.joined_at as string,
    });

  // Member ids per group (only accepted, RLS already enforces this when I'm accepted)
  const { data: allMembers } = groupIds.length
    ? await supabase
        .from("group_members")
        .select("group_id, profile_id, status")
        .in("group_id", groupIds)
        .eq("status", "accepted")
    : { data: [] as { group_id: string; profile_id: string; status: string }[] };

  const memberIdsByGroup = new Map<string, string[]>();
  for (const row of allMembers ?? []) {
    const gid = row.group_id as string;
    const arr = memberIdsByGroup.get(gid) ?? [];
    arr.push(row.profile_id as string);
    memberIdsByGroup.set(gid, arr);
  }

  // Split into joined groups vs pending invitations
  const acceptedGroups: GroupWithContext[] = [];
  const pendingGroupRows: typeof groupsData = [];
  for (const g of (groupsData ?? []) as unknown as {
    id: string;
    name: string;
    creator_id: string;
    created_at: string;
  }[]) {
    const ms = myStatusByGroup.get(g.id);
    if (ms?.status === "accepted") {
      acceptedGroups.push({
        ...g,
        member_ids: memberIdsByGroup.get(g.id) ?? [],
        is_creator: g.creator_id === me.id,
      });
    } else if (ms?.status === "pending") {
      pendingGroupRows.push(g);
    }
  }

  // Hydrate inviter names for pending invitations
  const inviterIds = Array.from(
    new Set(pendingGroupRows.map((g) => g.creator_id as string)),
  );
  const inviters = await getProfilesByIds(inviterIds);
  const inviterById = new Map(inviters.map((p) => [p.id, p] as const));

  const invitations: GroupInvitation[] = pendingGroupRows.map((g) => ({
    group_id: g.id as string,
    group_name: g.name as string,
    inviter_id: g.creator_id as string,
    inviter_name: inviterById.get(g.creator_id as string)?.full_name ?? null,
    invited_at: myStatusByGroup.get(g.id as string)?.joined_at ?? g.created_at as string,
  }));

  // Only active cities / clubs surface in the filter chips. Inactive ones
  // are still resolvable for display (a member can still belong to a city
  // that was hidden by admin), but they don't show up as filter options.
  const cities = Array.from(cityMap.entries())
    .filter(([, c]) => c.active)
    .map(([id, c]) => ({ id, name: c.name }));
  const clubs = Array.from(clubMap.entries())
    .filter(([, c]) => c.active)
    .map(([id, c]) => ({ id, name: c.name, city_id: c.city_id }));

  return (
    <div>
      <Hero
        title={<>Ranking</>}
        subtitle={`${season ? `Season ${season.year}` : "—"} · ${players.length} members · by Court Society Points`}
      />
      <RankingClient
        meId={me.id}
        meCityId={me.home_city_id}
        meClubId={me.home_club_id}
        meLevel={me.level}
        meGender={me.gender}
        players={players}
        cities={cities}
        clubs={clubs}
        visitingByProfile={visitingByProfile}
        groups={acceptedGroups}
        invitations={invitations}
      />
    </div>
  );
}
