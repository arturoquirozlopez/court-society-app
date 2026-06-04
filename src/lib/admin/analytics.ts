import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin Analytics — one server module that loads every signal the
 * dashboard needs and rolls them into a typed `AnalyticsBundle`. Keeps the
 * query layer in one place so the page component stays declarative.
 *
 * Time semantics: everything trailing is relative to "now" at request time.
 * "This month" = current calendar month in UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/* ────────── types ────────── */

export interface SeriesPoint {
  ts: string;
  count: number;
}

export interface AnalyticsBundle {
  generatedAt: string;
  northStar: NorthStar;
  community: Community;
  matchActivity: MatchActivity;
  growth: Growth;
  referrals: Referrals;
  challenges: ChallengesBlock;
  density: Density;
  retention: Retention;
  travel: Travel;
  insights: string[];
}

export interface NorthStar {
  total: number;
  thisMonth: number;
  last7d: number;
  last30d: number;
  last90d: number;
  growthPct: number;
  spark: SeriesPoint[]; // last 13 weeks
}

export interface Community {
  total: number;
  fullyActive: { count: number; pct: number; delta: number };
  active: { count: number; pct: number; delta: number };
  atRisk: { count: number; pct: number; delta: number };
  dormant: { count: number; pct: number; delta: number };
  cityActivity: {
    cityId: string;
    cityName: string;
    members: number;
    activePct: number;
    matches30d: number;
  }[];
}

export interface MatchActivity {
  total: number;
  thisMonth: number;
  last7d: number;
  last30d: number;
  last90d: number;
  monthDelta: number;
  avgPerActiveMember: number;
  avgPerCity: number;
  avgPerClub: number;
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  daily: SeriesPoint[];
}

export interface Growth {
  total: number;
  new7d: number;
  new30d: number;
  new90d: number;
  monthly: SeriesPoint[];
  cumulativeMonthly: SeriesPoint[];
  funnel: { submitted: number; reviewed: number; approved: number };
  approvalRate: number;
  waitlistRate: number;
  rejectionRate: number;
}

export interface Referrals {
  total: number;
  last30d: number;
  acceptanceRate: number;
  referralRate: number;
  nominatorsCount: number;
  pctWhoNominate: number;
  avgPerMember: number;
  topReferrers: {
    id: string;
    name: string;
    club: string;
    city: string;
    count: number;
  }[];
}

export interface ChallengesBlock {
  sent: number;
  accepted: number;
  cancelled: number;
  expired: number;
  acceptanceRate: number;
  avgTimeToAcceptHours: number | null;
  avgTimeToPlayDays: number | null;
  funnel: { sent: number; accepted: number; played: number; confirmed: number };
}

export interface Density {
  cities: {
    cityId: string;
    cityName: string;
    members: number;
    matches: number;
    density: number;
  }[];
  clubs: {
    clubId: string;
    clubName: string;
    members: number;
    matches: number;
    density: number;
  }[];
}

export interface Retention {
  d30: number;
  d60: number;
  d90: number;
  returning7d: number;
  repeatPlayersPct: number;
}

export interface Travel {
  currentlyTraveling: number;
  visiting30d: number;
  travelMatches30d: number;
  travelMatchRate: number;
  mostVisited: {
    cityId: string;
    cityName: string;
    visits: number;
    uniqueMembers: number;
  }[];
}

/* ────────── helpers ────────── */

function pct(num: number, denom: number): number {
  return denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfWeek(d: Date): Date {
  // ISO week starting Monday, UTC
  const day = d.getUTCDay() || 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 1));
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/* ────────── main ────────── */

export async function getAnalyticsBundle(): Promise<AnalyticsBundle> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = startOfMonth(now);

  // ── Single-round-trip loads ──
  const [
    { data: profiles },
    { data: matches },
    { data: challenges },
    { data: nominations },
    { data: applications },
    { data: visitingPlans },
    { data: cities },
    { data: clubs },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, status, home_city_id, home_club_id, joined_at, created_at, updated_at, last_seen_at",
      ),
    supabase
      .from("matches")
      .select(
        "id, author_id, opponent_id, status, score, city_id, challenge_id, created_at, confirmed_at",
      ),
    supabase
      .from("challenges")
      .select(
        "id, author_id, accepted_by, target_id, status, accepted_at, expires_at, created_at, city_id",
      ),
    supabase.from("nominations").select("id, nominator_id, status, applied_profile_id, created_at"),
    supabase.from("applications").select("id, status, reviewed_at, created_at"),
    supabase
      .from("visiting_plans")
      .select("id, profile_id, city_id, start_date, end_date, created_at"),
    supabase.from("cities").select("id, name"),
    supabase.from("clubs").select("id, name, city_id"),
  ]);

  type Profile = {
    id: string;
    full_name: string | null;
    status: string;
    home_city_id: string | null;
    home_club_id: string | null;
    joined_at: string | null;
    created_at: string;
    updated_at: string;
    last_seen_at: string | null;
  };
  type Match = {
    id: string;
    author_id: string;
    opponent_id: string;
    status: string;
    score: string | null;
    city_id: string | null;
    challenge_id: string | null;
    created_at: string;
    confirmed_at: string | null;
  };
  type Challenge = {
    id: string;
    author_id: string;
    accepted_by: string | null;
    target_id: string | null;
    status: string;
    accepted_at: string | null;
    expires_at: string;
    created_at: string;
    city_id: string | null;
  };
  type Nomination = {
    id: string;
    nominator_id: string;
    status: string;
    applied_profile_id: string | null;
    created_at: string;
  };
  type Application = {
    id: string;
    status: string;
    reviewed_at: string | null;
    created_at: string;
  };
  type VisitingPlan = {
    id: string;
    profile_id: string;
    city_id: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  };
  type City = { id: string; name: string };
  type Club = { id: string; name: string; city_id: string };

  const P = (profiles ?? []) as Profile[];
  const M = (matches ?? []) as Match[];
  const C = (challenges ?? []) as Challenge[];
  const N = (nominations ?? []) as Nomination[];
  const A = (applications ?? []) as Application[];
  const V = (visitingPlans ?? []) as VisitingPlan[];
  const CTY = (cities ?? []) as City[];
  const CLB = (clubs ?? []) as Club[];

  const cityMap = new Map(CTY.map((c) => [c.id, c.name] as const));
  const clubMap = new Map(CLB.map((c) => [c.id, c] as const));
  const profileMap = new Map(P.map((p) => [p.id, p] as const));
  const approved = P.filter((p) => p.status === "approved");
  const approvedIds = new Set(approved.map((p) => p.id));
  const confirmedMatches = M.filter((m) => m.status === "confirmed");

  /* ── North Star ── */
  const total = confirmedMatches.length;
  const thisMonthCount = confirmedMatches.filter(
    (m) => new Date(m.created_at) >= monthStart,
  ).length;
  const last7 = confirmedMatches.filter((m) => new Date(m.created_at) >= daysAgo(7)).length;
  const last30 = confirmedMatches.filter((m) => new Date(m.created_at) >= daysAgo(30)).length;
  const last90 = confirmedMatches.filter((m) => new Date(m.created_at) >= daysAgo(90)).length;
  const prev30Start = daysAgo(60);
  const prev30End = daysAgo(30);
  const prev30 = confirmedMatches.filter((m) => {
    const t = new Date(m.created_at);
    return t >= prev30Start && t < prev30End;
  }).length;
  const growthPct = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : last30 > 0 ? 100 : 0;

  // Last 13 weeks sparkline
  const sparkBuckets = new Map<string, number>();
  for (let i = 12; i >= 0; i--) {
    const wk = startOfWeek(new Date(now.getTime() - i * 7 * DAY_MS));
    sparkBuckets.set(wk.toISOString(), 0);
  }
  for (const m of confirmedMatches) {
    const wk = startOfWeek(new Date(m.created_at)).toISOString();
    if (sparkBuckets.has(wk)) sparkBuckets.set(wk, (sparkBuckets.get(wk) ?? 0) + 1);
  }
  const spark: SeriesPoint[] = Array.from(sparkBuckets.entries()).map(([ts, count]) => ({
    ts,
    count,
  }));

  const northStar: NorthStar = {
    total,
    thisMonth: thisMonthCount,
    last7d: last7,
    last30d: last30,
    last90d: last90,
    growthPct,
    spark,
  };

  /* ── Community Health ── */
  // Last interaction per member = greatest of last_seen_at, last match, last challenge, last nomination created, last visiting_plan created
  const lastInteractionByMember = new Map<string, number>();
  function bumpLast(memberId: string, iso: string | null) {
    if (!iso || !approvedIds.has(memberId)) return;
    const t = new Date(iso).getTime();
    if (!t) return;
    const cur = lastInteractionByMember.get(memberId) ?? 0;
    if (t > cur) lastInteractionByMember.set(memberId, t);
  }
  for (const p of approved) {
    bumpLast(p.id, p.last_seen_at);
    bumpLast(p.id, p.updated_at);
    bumpLast(p.id, p.joined_at);
  }
  for (const m of M) {
    bumpLast(m.author_id, m.created_at);
    bumpLast(m.opponent_id, m.created_at);
  }
  for (const c of C) {
    bumpLast(c.author_id, c.created_at);
    if (c.accepted_by) bumpLast(c.accepted_by, c.accepted_at ?? c.created_at);
  }
  for (const n of N) bumpLast(n.nominator_id, n.created_at);
  for (const v of V) bumpLast(v.profile_id, v.created_at);

  const totalMembers = approved.length;
  const day30 = daysAgo(30).getTime();
  const day60 = daysAgo(60).getTime();
  const day90 = daysAgo(90).getTime();

  // members who played a confirmed match in the last 30d
  const playersInLast30 = new Set<string>();
  for (const m of confirmedMatches) {
    if (new Date(m.created_at).getTime() < day30) continue;
    if (approvedIds.has(m.author_id)) playersInLast30.add(m.author_id);
    if (approvedIds.has(m.opponent_id)) playersInLast30.add(m.opponent_id);
  }

  let fullyActiveCount = 0;
  let activeAnyCount = 0;
  let atRiskCount = 0;
  let dormantCount = 0;
  for (const p of approved) {
    const last = lastInteractionByMember.get(p.id) ?? 0;
    if (last >= day30) {
      activeAnyCount++;
      if (playersInLast30.has(p.id)) fullyActiveCount++;
    } else if (last >= day90) {
      atRiskCount++;
    } else {
      dormantCount++;
    }
  }
  const activeOnly = activeAnyCount - fullyActiveCount;
  // Delta vs previous month: re-run the same buckets but cutoffs shifted by 30
  function bucketAt(refMs: number) {
    let fa = 0,
      a = 0,
      ar = 0,
      dr = 0;
    const shift30 = refMs - 30 * DAY_MS;
    const shift60 = refMs - 60 * DAY_MS;
    const shift90 = refMs - 90 * DAY_MS;
    const players: Set<string> = new Set();
    for (const m of confirmedMatches) {
      const t = new Date(m.created_at).getTime();
      if (t >= shift30 && t < refMs) {
        if (approvedIds.has(m.author_id)) players.add(m.author_id);
        if (approvedIds.has(m.opponent_id)) players.add(m.opponent_id);
      }
    }
    void shift60;
    for (const p of approved) {
      const last = lastInteractionByMember.get(p.id) ?? 0;
      if (last >= shift30 && last < refMs) {
        a++;
        if (players.has(p.id)) fa++;
      } else if (last >= shift90 && last < refMs) {
        ar++;
      } else if (last < shift90) {
        dr++;
      }
    }
    return { fa, a, ar, dr };
  }
  const prevBucket = bucketAt(Date.now() - 30 * DAY_MS);
  function deltaPct(curr: number, prev: number, denom: number): number {
    const c = pct(curr, denom);
    const p = pct(prev, denom);
    return Math.round((c - p) * 10) / 10;
  }
  const community: Community = {
    total: totalMembers,
    fullyActive: {
      count: fullyActiveCount,
      pct: pct(fullyActiveCount, totalMembers),
      delta: deltaPct(fullyActiveCount, prevBucket.fa, totalMembers),
    },
    active: {
      count: activeOnly,
      pct: pct(activeOnly, totalMembers),
      delta: deltaPct(activeOnly, Math.max(prevBucket.a - prevBucket.fa, 0), totalMembers),
    },
    atRisk: {
      count: atRiskCount,
      pct: pct(atRiskCount, totalMembers),
      delta: deltaPct(atRiskCount, prevBucket.ar, totalMembers),
    },
    dormant: {
      count: dormantCount,
      pct: pct(dormantCount, totalMembers),
      delta: deltaPct(dormantCount, prevBucket.dr, totalMembers),
    },
    cityActivity: Array.from(cityMap.entries())
      .map(([cityId, cityName]) => {
        const cityMembers = approved.filter((p) => p.home_city_id === cityId);
        const cityActive = cityMembers.filter(
          (p) => (lastInteractionByMember.get(p.id) ?? 0) >= day30,
        ).length;
        const matches30d = confirmedMatches.filter(
          (m) => m.city_id === cityId && new Date(m.created_at).getTime() >= day30,
        ).length;
        return {
          cityId,
          cityName,
          members: cityMembers.length,
          activePct: pct(cityActive, cityMembers.length),
          matches30d,
        };
      })
      .filter((row) => row.members > 0)
      .sort((a, b) => b.matches30d - a.matches30d),
  };

  /* ── Match Activity ── */
  // monthly + daily + weekly buckets covering last 90 days
  const monthly = bucketSeries(confirmedMatches, "month", 12);
  const weekly = bucketSeries(confirmedMatches, "week", 13);
  const daily = bucketSeries(confirmedMatches, "day", 30);

  // averages
  const activeMembersFor30 = activeAnyCount || 1;
  const citiesWithMembers = new Set(approved.map((p) => p.home_city_id).filter(Boolean)).size || 1;
  const clubsWithMembers = new Set(approved.map((p) => p.home_club_id).filter(Boolean)).size || 1;
  const avgPerActive = Math.round((last30 / activeMembersFor30) * 10) / 10;
  const avgPerCity = Math.round((total / citiesWithMembers) * 10) / 10;
  const avgPerClub = Math.round((total / clubsWithMembers) * 10) / 10;
  const monthDelta = thisMonthCount - prev30; // rough

  const matchActivity: MatchActivity = {
    total,
    thisMonth: thisMonthCount,
    last7d: last7,
    last30d: last30,
    last90d: last90,
    monthDelta,
    avgPerActiveMember: avgPerActive,
    avgPerCity: avgPerCity,
    avgPerClub: avgPerClub,
    weekly,
    monthly,
    daily,
  };

  /* ── Growth ── */
  const new7 = approved.filter(
    (p) => new Date(p.joined_at ?? p.created_at).getTime() >= daysAgo(7).getTime(),
  ).length;
  const new30 = approved.filter(
    (p) => new Date(p.joined_at ?? p.created_at).getTime() >= daysAgo(30).getTime(),
  ).length;
  const new90 = approved.filter(
    (p) => new Date(p.joined_at ?? p.created_at).getTime() >= daysAgo(90).getTime(),
  ).length;

  const submitted = A.length;
  const reviewed = A.filter((a) => a.reviewed_at !== null || a.status !== "pending").length;
  const appsApproved = A.filter((a) => a.status === "approved").length;
  const appsWaitlisted = A.filter((a) => a.status === "waitlisted").length;
  const appsRejected = A.filter((a) => a.status === "rejected").length;

  const growthMonthly = bucketSeries(
    approved.map((p) => ({ created_at: p.joined_at ?? p.created_at })),
    "month",
    12,
  );
  // cumulative version
  let running = totalMembers - growthMonthly.reduce((s, x) => s + x.count, 0);
  const cumulative = growthMonthly.map((pt) => {
    running += pt.count;
    return { ts: pt.ts, count: running };
  });

  const growth: Growth = {
    total: totalMembers,
    new7d: new7,
    new30d: new30,
    new90d: new90,
    monthly: growthMonthly,
    cumulativeMonthly: cumulative,
    funnel: { submitted, reviewed, approved: appsApproved },
    approvalRate: pct(appsApproved, submitted),
    waitlistRate: pct(appsWaitlisted, submitted),
    rejectionRate: pct(appsRejected, submitted),
  };

  /* ── Referrals ── */
  const nomTotal = N.length;
  const nomLast30 = N.filter(
    (n) => new Date(n.created_at).getTime() >= daysAgo(30).getTime(),
  ).length;
  const nomAccepted = N.filter((n) => n.status === "applied" || n.status === "approved").length;
  const nominatedNewMembers = approved
    .filter((p) => new Date(p.joined_at ?? p.created_at).getTime() >= daysAgo(30).getTime())
    .filter((p) =>
      N.some((n) => n.applied_profile_id === p.id && (n.status === "applied" || n.status === "approved")),
    ).length;
  const referralRate = pct(nominatedNewMembers, new30);
  const nominators = new Set(N.map((n) => n.nominator_id));
  const nominatorsCount = nominators.size;

  const countByNominator = new Map<string, number>();
  for (const n of N) {
    if (n.status !== "approved" && n.status !== "applied") continue;
    countByNominator.set(n.nominator_id, (countByNominator.get(n.nominator_id) ?? 0) + 1);
  }
  const topReferrers = Array.from(countByNominator.entries())
    .map(([id, count]) => {
      const p = profileMap.get(id);
      const club = p?.home_club_id ? clubMap.get(p.home_club_id)?.name ?? "—" : "—";
      const city = p?.home_city_id ? cityMap.get(p.home_city_id) ?? "—" : "—";
      return {
        id,
        name: p?.full_name ?? "—",
        club,
        city,
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const referrals: Referrals = {
    total: nomTotal,
    last30d: nomLast30,
    acceptanceRate: pct(nomAccepted, nomTotal),
    referralRate,
    nominatorsCount,
    pctWhoNominate: pct(nominatorsCount, totalMembers),
    avgPerMember: totalMembers > 0 ? Math.round((nomTotal / totalMembers) * 100) / 100 : 0,
    topReferrers,
  };

  /* ── Challenges ── */
  const chSent = C.length;
  const chAccepted = C.filter((c) => c.status === "accepted").length;
  const chCancelled = C.filter((c) => c.status === "cancelled").length;
  const chExpired = C.filter((c) => c.status === "expired").length;
  const chWithMatch = C.filter((c) => M.some((m) => m.challenge_id === c.id)).length;
  const chWithConfirmedMatch = C.filter((c) =>
    M.some((m) => m.challenge_id === c.id && m.status === "confirmed"),
  ).length;

  let acceptDeltaSum = 0,
    acceptDeltaCount = 0;
  for (const c of C) {
    if (!c.accepted_at) continue;
    const dt = new Date(c.accepted_at).getTime() - new Date(c.created_at).getTime();
    if (dt > 0) {
      acceptDeltaSum += dt;
      acceptDeltaCount++;
    }
  }
  const avgAcceptHrs =
    acceptDeltaCount > 0 ? Math.round((acceptDeltaSum / acceptDeltaCount / 3600000) * 10) / 10 : null;

  let playDeltaSum = 0,
    playDeltaCount = 0;
  for (const c of C) {
    if (!c.accepted_at) continue;
    const m = M.find((mm) => mm.challenge_id === c.id);
    if (!m) continue;
    const dt = new Date(m.created_at).getTime() - new Date(c.accepted_at).getTime();
    if (dt > 0) {
      playDeltaSum += dt;
      playDeltaCount++;
    }
  }
  const avgPlayDays =
    playDeltaCount > 0 ? Math.round((playDeltaSum / playDeltaCount / DAY_MS) * 10) / 10 : null;

  const challengesBlock: ChallengesBlock = {
    sent: chSent,
    accepted: chAccepted,
    cancelled: chCancelled,
    expired: chExpired,
    acceptanceRate: pct(chAccepted, chSent),
    avgTimeToAcceptHours: avgAcceptHrs,
    avgTimeToPlayDays: avgPlayDays,
    funnel: {
      sent: chSent,
      accepted: chAccepted,
      played: chWithMatch,
      confirmed: chWithConfirmedMatch,
    },
  };

  /* ── Network Density ── */
  const cityRows = Array.from(cityMap.entries())
    .map(([cityId, cityName]) => {
      const members = approved.filter((p) => p.home_city_id === cityId).length;
      const matches = confirmedMatches.filter((m) => m.city_id === cityId).length;
      const density = members > 0 ? Math.round((matches / members) * 10) / 10 : 0;
      return { cityId, cityName, members, matches, density };
    })
    .filter((r) => r.members > 0)
    .sort((a, b) => b.density - a.density);

  const clubRows = Array.from(clubMap.values())
    .map((c) => {
      const members = approved.filter((p) => p.home_club_id === c.id).length;
      const memberIds = new Set(approved.filter((p) => p.home_club_id === c.id).map((p) => p.id));
      const matches = confirmedMatches.filter(
        (m) => memberIds.has(m.author_id) || memberIds.has(m.opponent_id),
      ).length;
      const density = members > 0 ? Math.round((matches / members) * 10) / 10 : 0;
      return { clubId: c.id, clubName: c.name, members, matches, density };
    })
    .filter((r) => r.members > 0)
    .sort((a, b) => b.density - a.density)
    .slice(0, 8);

  const density: Density = { cities: cityRows, clubs: clubRows };

  /* ── Retention ── */
  const eligible = (windowDays: number) =>
    approved.filter(
      (p) => new Date(p.joined_at ?? p.created_at).getTime() <= Date.now() - windowDays * DAY_MS,
    );
  const activeWithin = (memberId: string, windowDays: number) => {
    const last = lastInteractionByMember.get(memberId) ?? 0;
    return last >= Date.now() - windowDays * DAY_MS;
  };
  const elig30 = eligible(30);
  const elig60 = eligible(60);
  const elig90 = eligible(90);
  const d30 = pct(
    elig30.filter((p) => activeWithin(p.id, 30)).length,
    elig30.length,
  );
  const d60 = pct(
    elig60.filter((p) => activeWithin(p.id, 60)).length,
    elig60.length,
  );
  const d90 = pct(
    elig90.filter((p) => activeWithin(p.id, 90)).length,
    elig90.length,
  );
  const returning7d = pct(
    elig30.filter((p) => activeWithin(p.id, 7)).length,
    elig30.length,
  );
  const playedAny = new Map<string, number>();
  for (const m of confirmedMatches) {
    if (approvedIds.has(m.author_id))
      playedAny.set(m.author_id, (playedAny.get(m.author_id) ?? 0) + 1);
    if (approvedIds.has(m.opponent_id))
      playedAny.set(m.opponent_id, (playedAny.get(m.opponent_id) ?? 0) + 1);
  }
  const repeatPlayers = Array.from(playedAny.values()).filter((n) => n > 1).length;
  const playersOfAnyMatch = playedAny.size;
  const repeatPlayersPct = pct(repeatPlayers, Math.max(playersOfAnyMatch, 1));

  const retention: Retention = {
    d30,
    d60,
    d90,
    returning7d,
    repeatPlayersPct,
  };

  /* ── Travel ── */
  const today = startOfDay(now).toISOString().slice(0, 10);
  const currentVisiting = V.filter(
    (v) => !v.end_date || v.end_date >= today,
  );
  const travelersNow = new Set(currentVisiting.map((v) => v.profile_id)).size;
  const visit30 = new Set(
    V.filter((v) => new Date(v.created_at).getTime() >= day30).map((v) => v.profile_id),
  ).size;

  // travel match = match in window where at least one player was visiting
  // a city that wasn't their home city (and the match was played there).
  function homeCityForMember(memberId: string): string | null {
    return profileMap.get(memberId)?.home_city_id ?? null;
  }
  function activeVisitingAt(profileId: string, atTime: number, cityId: string): boolean {
    const t = new Date(atTime).toISOString().slice(0, 10);
    return V.some(
      (v) =>
        v.profile_id === profileId &&
        v.city_id === cityId &&
        (v.start_date ?? "0000") <= t &&
        (!v.end_date || v.end_date >= t),
    );
  }
  let travel30 = 0;
  for (const m of confirmedMatches) {
    if (new Date(m.created_at).getTime() < day30) continue;
    if (!m.city_id) continue;
    const aHome = homeCityForMember(m.author_id);
    const oHome = homeCityForMember(m.opponent_id);
    const aTravel = aHome !== m.city_id && activeVisitingAt(m.author_id, new Date(m.created_at).getTime(), m.city_id);
    const oTravel = oHome !== m.city_id && activeVisitingAt(m.opponent_id, new Date(m.created_at).getTime(), m.city_id);
    if (aTravel || oTravel) travel30++;
  }
  const travelMatchRate = pct(travel30, last30);

  const cityVisitCounts = new Map<string, { visits: number; members: Set<string> }>();
  for (const v of V) {
    if (new Date(v.created_at).getTime() < daysAgo(90).getTime()) continue;
    const cur = cityVisitCounts.get(v.city_id) ?? { visits: 0, members: new Set() };
    cur.visits++;
    cur.members.add(v.profile_id);
    cityVisitCounts.set(v.city_id, cur);
  }
  const mostVisited = Array.from(cityVisitCounts.entries())
    .map(([cityId, v]) => ({
      cityId,
      cityName: cityMap.get(cityId) ?? "—",
      visits: v.visits,
      uniqueMembers: v.members.size,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  const travel: Travel = {
    currentlyTraveling: travelersNow,
    visiting30d: visit30,
    travelMatches30d: travel30,
    travelMatchRate,
    mostVisited,
  };

  /* ── Insights ── */
  const insights: string[] = [];
  if (cityRows.length > 0) {
    const top = cityRows[0];
    insights.push(
      `${top.cityName} leads the network at density ${top.density.toFixed(1)} — ${top.matches} confirmed matches across ${top.members} members.`,
    );
  }
  if (clubRows.length > 0) {
    const tc = clubRows[0];
    insights.push(
      `${tc.clubName} is the most active club with ${tc.matches} all-time matches (${tc.density.toFixed(1)} per member).`,
    );
  }
  if (referrals.last30d > 0) {
    insights.push(
      `${referrals.last30d} new nominations in the last 30 days. Referral rate ${referrals.referralRate}% of new members.`,
    );
  }
  if (travel.travelMatchRate > 0) {
    insights.push(
      `Travel matches were ${travel.travelMatchRate}% of confirmed matches in the last 30 days.`,
    );
  }
  if (challengesBlock.sent > 0) {
    insights.push(
      `Challenge acceptance ${challengesBlock.acceptanceRate}% · avg time to accept ${challengesBlock.avgTimeToAcceptHours ?? "—"} h.`,
    );
  }
  if (community.atRisk.count > 0) {
    insights.push(
      `${community.atRisk.count} member${community.atRisk.count === 1 ? "" : "s"} at risk of becoming dormant — no interaction in 30+ days.`,
    );
  }
  if (retention.d30 > 0) {
    insights.push(
      `D30 retention is ${retention.d30}% — of members who joined ≥ 30 days ago, this share is still active in the last 30 days.`,
    );
  }
  if (topReferrers.length > 0) {
    const tr = topReferrers[0];
    insights.push(
      `${tr.name} is the top referrer (${tr.count} accepted nominations).`,
    );
  }
  if (growthPct !== 0) {
    insights.push(
      `Match activity ${growthPct > 0 ? "grew" : "fell"} ${Math.abs(growthPct)}% vs the previous 30 days.`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    northStar,
    community,
    matchActivity,
    growth,
    referrals,
    challenges: challengesBlock,
    density,
    retention,
    travel,
    insights,
  };
}

/* ────────── time-series helper ────────── */

function bucketSeries(
  rows: { created_at: string }[],
  grain: "day" | "week" | "month",
  bucketCount: number,
): SeriesPoint[] {
  const now = new Date();
  const buckets = new Map<string, number>();
  // build the empty buckets going back N periods
  for (let i = bucketCount - 1; i >= 0; i--) {
    let ts: Date;
    if (grain === "day") ts = startOfDay(new Date(now.getTime() - i * DAY_MS));
    else if (grain === "week") ts = startOfWeek(new Date(now.getTime() - i * 7 * DAY_MS));
    else {
      ts = startOfMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)));
    }
    buckets.set(ts.toISOString(), 0);
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    let key: string;
    if (grain === "day") key = startOfDay(d).toISOString();
    else if (grain === "week") key = startOfWeek(d).toISOString();
    else key = startOfMonth(d).toISOString();
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([ts, count]) => ({ ts, count }));
}
