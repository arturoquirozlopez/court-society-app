import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Match, PlayLevel, Profile } from "@/lib/types";
import {
  activityMultiplier,
  basePoints,
  decayFactor,
  levelToIdx,
} from "@/lib/points";

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
  return (data ?? []) as unknown as Match[];
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
  return (data ?? []) as unknown as Profile[];
}

/** Cities (id → name) lookup. Always returns ALL cities — callers filter
 * by `active` when building user-facing filter chips / selectors. Inactive
 * cities still need to be looked up for members whose home_city points to
 * one (e.g. for display purposes). */
export async function getCityMap() {
  const supabase = createClient();
  const { data } = await supabase
    .from("cities")
    .select("id, name, slug, active");
  const map = new Map<
    string,
    { name: string; slug: string; active: boolean }
  >();
  for (const c of data ?? [])
    map.set(c.id as string, {
      name: c.name as string,
      slug: c.slug as string,
      active: Boolean(c.active),
    });
  return map;
}

/** Clubs (id → {name, city_id, is_other, active}) lookup. Same active rule
 * as getCityMap — callers should filter active=true when building user-facing
 * selectors. */
export async function getClubMap() {
  const supabase = createClient();
  const { data } = await supabase
    .from("clubs")
    .select("id, name, city_id, is_other, active");
  const map = new Map<
    string,
    { name: string; city_id: string; is_other: boolean; active: boolean }
  >();
  for (const c of data ?? [])
    map.set(c.id as string, {
      name: c.name as string,
      city_id: c.city_id as string,
      is_other: Boolean(c.is_other),
      active: Boolean(c.active),
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

/** Full Court Society Points breakdown for one player. */
export interface PlayerRanking {
  profile_id: string;
  wins: number;
  losses: number;
  total_matches: number;
  base_points: number;
  matches_last_30: number;
  activity_multiplier: number;
  days_since_last: number | null;
  decay_factor: number;
  total_points: number;
  /** Average level index (0–5, fractional) of confirmed opponents this season. */
  avg_opponent_level: number | null;
  /** Newest-first booleans for the last up-to-5 confirmed matches. */
  recent_results: boolean[];
}

/**
 * Court Society Points ranking for a given season. Pulls all confirmed
 * matches + every approved member's level, runs the points formula in JS,
 * and returns both an id-keyed Map (for lookups) and a sorted array
 * (for the ranking list / rank-position queries).
 */
export async function getSeasonRanking(seasonId: string): Promise<{
  ranking: Map<string, PlayerRanking>;
  sorted: PlayerRanking[];
}> {
  const supabase = createClient();
  const [{ data: matches }, { data: profiles }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, author_id, opponent_id, author_result, created_at")
      .eq("season_id", seasonId)
      .eq("status", "confirmed"),
    supabase
      .from("profiles")
      .select("id, level, gender")
      .eq("status", "approved"),
  ]);

  const levelById = new Map<string, number>();
  const genderById = new Map<string, "M" | "F" | null>();
  for (const p of (profiles ?? []) as {
    id: string;
    level: PlayLevel | null;
    gender: "M" | "F" | null;
  }[]) {
    const idx = levelToIdx(p.level);
    if (idx !== null) levelById.set(p.id, idx);
    genderById.set(p.id, p.gender);
  }

  type Bucket = {
    base: number;
    rows: { won: boolean; created_at: string; oppLevel: number | null }[];
  };
  const bucket = new Map<string, Bucket>();
  const ensure = (id: string): Bucket => {
    let b = bucket.get(id);
    if (!b) {
      b = { base: 0, rows: [] };
      bucket.set(id, b);
    }
    return b;
  };

  for (const m of (matches ?? []) as {
    author_id: string;
    opponent_id: string;
    author_result: "W" | "L";
    created_at: string;
  }[]) {
    const aLvl = levelById.get(m.author_id);
    const oLvl = levelById.get(m.opponent_id);
    if (aLvl === undefined || oLvl === undefined) continue;

    // Mixed-gender matches still count for activity / decay / form, but
    // they don't award ranking points (so the per-gender ranking stays
    // clean).
    const aGender = genderById.get(m.author_id) ?? null;
    const oGender = genderById.get(m.opponent_id) ?? null;
    const mixed = !!(aGender && oGender && aGender !== oGender);

    // Author POV — v2 uses the opponent's absolute level only.
    const authorWon = m.author_result === "W";
    const a = ensure(m.author_id);
    if (!mixed) a.base += basePoints(authorWon, oLvl);
    a.rows.push({ won: authorWon, created_at: m.created_at, oppLevel: oLvl });

    // Opponent POV
    const o = ensure(m.opponent_id);
    if (!mixed) o.base += basePoints(!authorWon, aLvl);
    o.rows.push({ won: !authorWon, created_at: m.created_at, oppLevel: aLvl });
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const thirty = now - 30 * day;

  const ranking = new Map<string, PlayerRanking>();
  for (const [id, b] of bucket.entries()) {
    const total = b.rows.length;
    const wins = b.rows.filter((r) => r.won).length;
    const matchesLast30 = b.rows.filter(
      (r) => new Date(r.created_at).getTime() >= thirty,
    ).length;
    const mult = activityMultiplier(matchesLast30);
    const lastTime = b.rows.reduce(
      (max, r) => Math.max(max, new Date(r.created_at).getTime()),
      0,
    );
    const days = lastTime > 0 ? Math.floor((now - lastTime) / day) : null;
    const decay = days !== null ? decayFactor(days) : 1;
    const total_points = Math.round(b.base * mult * decay);

    const oppLvls = b.rows
      .map((r) => r.oppLevel)
      .filter((l): l is number => l !== null);
    const avg_opponent_level =
      oppLvls.length > 0
        ? oppLvls.reduce((s, l) => s + l, 0) / oppLvls.length
        : null;

    const recent_results = b.rows
      .slice()
      .sort(
        (a, c) =>
          new Date(c.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5)
      .map((r) => r.won);

    ranking.set(id, {
      profile_id: id,
      wins,
      losses: total - wins,
      total_matches: total,
      base_points: Math.round(b.base),
      matches_last_30: matchesLast30,
      activity_multiplier: mult,
      days_since_last: days,
      decay_factor: decay,
      total_points,
      avg_opponent_level,
      recent_results,
    });
  }

  const sorted = Array.from(ranking.values()).sort((a, b) => {
    if (a.total_points !== b.total_points)
      return b.total_points - a.total_points;
    return b.total_matches - a.total_matches;
  });

  return { ranking, sorted };
}
