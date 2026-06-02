import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveVisiting,
  getCityMap,
  getClubMap,
  getProfilesByIds,
} from "@/lib/queries";
import { Hero } from "@/components/Hero";
import { ChallengesClient } from "./ChallengesClient";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const me = await requireApproved();
  const supabase = createClient();
  const [cityMap, clubMap, visiting] = await Promise.all([
    getCityMap(),
    getClubMap(),
    getActiveVisiting(me.id),
  ]);

  // Active city = visiting (if set) else home.
  const activeCityId = visiting?.city_id ?? me.home_city_id ?? null;

  let challenges: {
    id: string;
    author_id: string;
    city_id: string;
    level: string;
    format: string;
    note: string | null;
    status: string;
    accepted_by: string | null;
    target_id: string | null;
    expires_at: string;
    created_at: string;
  }[] = [];

  if (activeCityId) {
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .eq("city_id", activeCityId)
      .neq("status", "cancelled")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    challenges = (data ?? []) as never;
  }

  // Hide challenges I've passed
  const { data: passes } = await supabase
    .from("challenge_passes")
    .select("challenge_id")
    .eq("profile_id", me.id);
  const passedIds = new Set((passes ?? []).map((p) => p.challenge_id as string));
  challenges = challenges.filter((c) => !passedIds.has(c.id) || c.author_id === me.id);

  // Authors + accepted-by profiles
  const peopleIds = Array.from(
    new Set(
      challenges
        .flatMap((c) => [c.author_id, c.accepted_by, c.target_id])
        .filter((x): x is string => Boolean(x) && x !== me.id),
    ),
  );
  const people = await getProfilesByIds(peopleIds);
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p] as const));

  // Clubs by challenge (one query)
  const ids = challenges.map((c) => c.id);
  const { data: cclubs } = ids.length
    ? await supabase.from("challenge_clubs").select("challenge_id, club_id").in("challenge_id", ids)
    : { data: [] as { challenge_id: string; club_id: string }[] };
  const clubsByChallenge: Record<string, string[]> = {};
  for (const r of cclubs ?? []) {
    const id = r.challenge_id as string;
    (clubsByChallenge[id] ||= []).push(r.club_id as string);
  }

  const cities = Array.from(cityMap.entries()).map(([id, c]) => ({
    id,
    name: c.name,
  }));
  const clubs = Array.from(clubMap.entries()).map(([id, c]) => ({
    id,
    name: c.name,
    city_id: c.city_id,
  }));

  const activeCityName = activeCityId ? cityMap.get(activeCityId)?.name ?? "" : "Select your city";

  // Approved members (excluding self) — for the target-picker search in the
  // New challenge sheet.
  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, home_city_id, home_club_id")
    .eq("status", "approved")
    .neq("id", me.id)
    .order("full_name");

  return (
    <div>
      <Hero
        title={<>Challenges</>}
        subtitle={`${activeCityName} · ${challenges.length} active`}
      />
      <ChallengesClient
        meId={me.id}
        meLevel={me.level}
        meHomeClubId={me.home_club_id}
        defaultCityId={activeCityId}
        cities={cities}
        clubs={clubs}
        challenges={challenges}
        clubsByChallenge={clubsByChallenge}
        peopleById={peopleById}
        targetCandidates={(candidates ?? []) as never}
      />
    </div>
  );
}
