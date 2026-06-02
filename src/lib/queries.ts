import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Match, Profile } from "@/lib/types";

/** Look up the currently active season, creating none — assumes seed.sql ran. */
export async function getActiveSeason() {
  const supabase = createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return data as { id: string; year: number } | null;
}

/** Build profile_id → {wins, losses, played} stats for the given season. */
export async function getSeasonStandings(seasonId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("matches")
    .select("author_id, opponent_id, author_result")
    .eq("season_id", seasonId)
    .eq("status", "confirmed");

  const stats = new Map<string, { wins: number; losses: number }>();
  const bump = (id: string, key: "wins" | "losses") => {
    const cur = stats.get(id) ?? { wins: 0, losses: 0 };
    cur[key] += 1;
    stats.set(id, cur);
  };
  for (const m of data ?? []) {
    if (m.author_result === "W") {
      bump(m.author_id as string, "wins");
      bump(m.opponent_id as string, "losses");
    } else {
      bump(m.author_id as string, "losses");
      bump(m.opponent_id as string, "wins");
    }
  }
  return stats;
}

/** All confirmed matches between me and `opponentId`, newest first. */
export async function getHeadToHead(meId: string, opponentId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("matches")
    .select("*")
    .or(
      `and(author_id.eq.${meId},opponent_id.eq.${opponentId}),and(author_id.eq.${opponentId},opponent_id.eq.${meId})`,
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as Match[];
}

/** Distinct opponents I have any match with (pending + confirmed). */
export async function getMyRivals(meId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("matches")
    .select("author_id, opponent_id, status, author_result")
    .or(`author_id.eq.${meId},opponent_id.eq.${meId}`);

  const rivals = new Map<string, { wins: number; losses: number }>();
  for (const m of data ?? []) {
    if (m.status !== "confirmed") continue;
    const isAuthor = m.author_id === meId;
    const opponentId = isAuthor ? (m.opponent_id as string) : (m.author_id as string);
    const cur = rivals.get(opponentId) ?? { wins: 0, losses: 0 };
    const iWon = (isAuthor && m.author_result === "W") || (!isAuthor && m.author_result === "L");
    if (iWon) cur.wins += 1;
    else cur.losses += 1;
    rivals.set(opponentId, cur);
  }
  return rivals;
}

/** Profile rows for a set of ids (one round-trip). */
export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (!ids.length) return [];
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  return (data ?? []) as Profile[];
}

/** Cities (id → name) lookup. */
export async function getCityMap() {
  const supabase = createClient();
  const { data } = await supabase.from("cities").select("id, name, slug");
  const map = new Map<string, { name: string; slug: string }>();
  for (const c of data ?? []) map.set(c.id as string, { name: c.name as string, slug: c.slug as string });
  return map;
}

/** Clubs (id → {name, city_id, is_other}) lookup. */
export async function getClubMap() {
  const supabase = createClient();
  const { data } = await supabase.from("clubs").select("id, name, city_id, is_other");
  const map = new Map<
    string,
    { name: string; city_id: string; is_other: boolean }
  >();
  for (const c of data ?? [])
    map.set(c.id as string, {
      name: c.name as string,
      city_id: c.city_id as string,
      is_other: Boolean(c.is_other),
    });
  return map;
}

/** Active visiting plan(s) for a profile. MVP returns the most recent. */
export async function getActiveVisiting(profileId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("visiting_plans")
    .select("*")
    .eq("profile_id", profileId)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as { city_id: string; start_date: string | null; end_date: string | null } | undefined) ?? null;
}
