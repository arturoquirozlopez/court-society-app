import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSeason,
  getActiveVisiting,
  getCityMap,
  getClubMap,
  getMyRivals,
  getProfilesByIds,
  getSeasonRanking,
} from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { winRate } from "@/lib/format";
import type { Match } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Member dashboard — desktop-first editorial home view (≥1024px).
 *
 * On mobile we render a compact summary; on desktop we render the full
 * three-column dashboard that the design preview approved. All data comes
 * from the same primitives as the rest of the app (no new RPCs).
 */
export default async function DashboardPage() {
  const me = await requireApproved();
  const supabase = createClient();

  const [season, cityMap, clubMap, visiting] = await Promise.all([
    getActiveSeason(),
    getCityMap(),
    getClubMap(),
    getActiveVisiting(me.id),
  ]);

  const activeCityId = visiting?.city_id ?? me.home_city_id ?? null;

  // Parallel reads --------------------------------------------------------
  const [
    seasonRank,
    rivals,
    recentMatchRows,
    pendingChallengeRows,
    visitingRows,
    openChallengeRows,
  ] = await Promise.all([
    season ? getSeasonRanking(season.id) : null,
    getMyRivals(me.id),
    supabase
      .from("matches")
      .select("*")
      .or(`author_id.eq.${me.id},opponent_id.eq.${me.id}`)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("challenges")
      .select("*")
      .eq("status", "accepted")
      .or(`author_id.eq.${me.id},accepted_by.eq.${me.id}`)
      .order("accepted_at", { ascending: false })
      .limit(5),
    // Members visiting MY home city
    me.home_city_id
      ? supabase
          .from("visiting_plans")
          .select("profile_id, city_id, start_date, end_date")
          .eq("city_id", me.home_city_id)
          .neq("profile_id", me.id)
          .or(
            `end_date.is.null,end_date.gte.${new Date()
              .toISOString()
              .slice(0, 10)}`,
          )
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as { profile_id: string; city_id: string; start_date: string | null; end_date: string | null }[] }),
    // Open challenges in MY active city (visiting or home), TTL respected.
    activeCityId
      ? supabase
          .from("challenges")
          .select("id, author_id, level, format, note, created_at, expires_at, target_id")
          .eq("city_id", activeCityId)
          .eq("status", "open")
          .neq("author_id", me.id)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as { id: string; author_id: string; level: string; format: string; note: string | null; created_at: string; expires_at: string; target_id: string | null }[] }),
  ]);

  const recentMatches = (recentMatchRows.data ?? []) as unknown as Match[];
  const accepted = (pendingChallengeRows.data ?? []) as unknown as {
    id: string;
    author_id: string;
    accepted_by: string;
    accepted_at: string;
    city_id: string;
    format: string;
    note: string | null;
  }[];

  // Filter out challenges that already have a logged match
  const acceptedIds = accepted.map((c) => c.id);
  const { data: matchedChIds } = acceptedIds.length
    ? await supabase
        .from("matches")
        .select("challenge_id")
        .in("challenge_id", acceptedIds)
    : { data: [] as { challenge_id: string }[] };
  const playedSet = new Set((matchedChIds ?? []).map((m) => m.challenge_id as string));
  const upcoming = accepted.filter((c) => !playedSet.has(c.id)).slice(0, 4);

  const visitingPlansRaw = (visitingRows.data ?? []) as {
    profile_id: string;
    city_id: string;
    start_date: string | null;
    end_date: string | null;
  }[];
  // Need the home_city_id of each visiting profile to filter same-city
  // "visits". Pull only those ids and drop anyone visiting their own home.
  const visitorIds = Array.from(new Set(visitingPlansRaw.map((v) => v.profile_id)));
  const { data: visitorHomeRows } = visitorIds.length
    ? await supabase
        .from("profiles")
        .select("id, home_city_id")
        .in("id", visitorIds)
    : { data: [] as { id: string; home_city_id: string | null }[] };
  const homeByVisitor = new Map<string, string | null>(
    (visitorHomeRows ?? []).map((r) => [r.id as string, (r.home_city_id ?? null) as string | null]),
  );
  const visitingPlans = visitingPlansRaw.filter(
    (v) => homeByVisitor.get(v.profile_id) !== v.city_id,
  );
  const openChallenges = (openChallengeRows.data ?? []) as {
    id: string;
    author_id: string;
    level: string;
    format: string;
    note: string | null;
    created_at: string;
    expires_at: string;
    target_id: string | null;
  }[];

  // People we need to display ---------------------------------------------
  const idSet = new Set<string>();
  for (const m of recentMatches) {
    idSet.add(m.author_id === me.id ? m.opponent_id : m.author_id);
  }
  for (const c of upcoming) {
    idSet.add(c.author_id === me.id ? c.accepted_by : c.author_id);
  }
  for (const v of visitingPlans) idSet.add(v.profile_id);
  for (const c of openChallenges) idSet.add(c.author_id);
  for (const r of seasonRank?.sorted.slice(0, 5) ?? []) idSet.add(r.profile_id);
  for (const [id] of Array.from(rivals.entries())
    .sort((a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses))
    .slice(0, 4)) {
    idSet.add(id);
  }
  idSet.delete(me.id);
  const peopleIds = Array.from(idSet);
  const peopleArr = await getProfilesByIds(peopleIds);
  const people = new Map(peopleArr.map((p) => [p.id, p] as const));

  // My stats --------------------------------------------------------------
  const myRanking = seasonRank?.ranking.get(me.id) ?? null;
  const myRank = seasonRank
    ? seasonRank.sorted.findIndex((r) => r.profile_id === me.id) + 1
    : 0;
  const totalRanked = seasonRank?.sorted.length ?? 0;
  const wins = myRanking?.wins ?? 0;
  const losses = myRanking?.losses ?? 0;
  const totalMatches = wins + losses;
  const myWinRate = winRate(wins, losses);
  const activeRivalries = Array.from(rivals.values()).filter(
    (r) => r.wins + r.losses > 0,
  ).length;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const homeCityName = me.home_city_id ? cityMap.get(me.home_city_id)?.name ?? "—" : "—";

  // Top rivals (by total matches) for the right rail.
  const topRivals = Array.from(rivals.entries())
    .sort((a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses))
    .slice(0, 4)
    .map(([id, rec]) => ({ id, ...rec, profile: people.get(id) }));

  return (
    <>
      {/* ════════════════════════ MOBILE (compact) ════════════════════════ */}
      <div className="lg:hidden">
        <div className="bg-cs-green text-cs-ivory px-7 pt-[52px] pb-8">
          <div className="text-[9px] tracking-[0.32em] uppercase text-cs-brassLight">
            {todayLabel}
          </div>
          <h1 className="font-display italic text-[28px] leading-tight mt-2">
            Welcome back, {firstName(me.full_name)}.
          </h1>
          <div className="text-[12px] text-cs-ivory/60 mt-1">
            Season {season?.year ?? ""} · {homeCityName}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-black/10 border-b border-black/10">
          <Kpi label="Ranking" value={myRank ? `#${myRank}` : "—"} />
          <Kpi label="Win rate" value={`${myWinRate}%`} />
          <Kpi label="Matches" value={String(totalMatches)} />
          <Kpi label="Rivalries" value={String(activeRivalries)} />
        </div>
        <div className="px-7 py-6">
          <Link
            href="/app/profile"
            className="block text-center text-[11px] tracking-[0.2em] uppercase text-cs-green border border-cs-green/40 py-3"
          >
            Open your profile →
          </Link>
        </div>
      </div>

      {/* ════════════════════════ DESKTOP (editorial) ════════════════════════ */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:min-h-dvh">
        {/* Main column ----------------------------------------------------- */}
        <section className="px-10 pb-16">
          {/* Welcome */}
          <div className="flex justify-between items-end pt-8 pb-6 border-b border-cs-green/10">
            <div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
                {todayLabel}
              </div>
              <h1 className="font-display italic text-[42px] leading-none mt-2 text-cs-green -tracking-[0.015em]">
                Welcome back, {firstName(me.full_name)}.
              </h1>
            </div>
            <div className="text-right text-[11px] tracking-[0.2em] uppercase text-cs-muted leading-relaxed">
              Season {season?.year ?? ""} · Week {seasonWeek(season?.year)}
              <br />
              <span className="font-display italic text-[14px] text-cs-green tracking-normal normal-case">
                {homeCityName}
              </span>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-px bg-cs-green/10 border border-cs-green/10 mt-7">
            <DKpi
              label="Ranking"
              value={myRank ? `#${myRank}` : "—"}
              detail={totalRanked ? `of ${totalRanked}` : ""}
            />
            <DKpi
              label="Win rate"
              value={`${myWinRate}%`}
              detail={`${wins} W · ${losses} L`}
            />
            <DKpi label="Matches" value={String(totalMatches)} detail="confirmed" />
            <DKpi
              label="Active rivalries"
              value={String(activeRivalries)}
              detail="opponents"
            />
          </div>

          {/* Grid: recent matches + upcoming | visiting + movers */}
          <div className="grid grid-cols-[2fr_1fr] gap-7 mt-8">
            <div className="flex flex-col gap-6">
              {/* Recent matches */}
              <Card title="Recent matches" actionHref="/app/profile" actionLabel="View all">
                {recentMatches.length === 0 ? (
                  <Empty>No matches logged yet.</Empty>
                ) : (
                  recentMatches.map((m) => {
                    const oppId = m.author_id === me.id ? m.opponent_id : m.author_id;
                    const opp = people.get(oppId);
                    const iWon =
                      (m.author_id === me.id && m.author_result === "W") ||
                      (m.opponent_id === me.id && m.author_result === "L");
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3.5 py-3.5 border-b border-cs-green/10 last:border-b-0"
                      >
                        <Avatar
                          url={opp?.photo_url}
                          seed={opp?.id ?? oppId}
                          alt={opp?.full_name ?? ""}
                          size={36}
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/app/h2h/${oppId}`}
                            className="block text-[14px] text-cs-green font-medium hover:text-cs-brass truncate"
                          >
                            {opp?.full_name ?? "—"}
                          </Link>
                          <div className="text-[11px] text-cs-muted truncate">
                            {clubName(opp?.home_club_id, clubMap)} ·{" "}
                            {cityMap.get(opp?.home_city_id ?? "")?.name ?? ""}
                          </div>
                        </div>
                        <div className="font-display italic text-[16px] text-cs-green">
                          {m.score ?? "—"}
                        </div>
                        <div className="w-16 text-right">
                          <span
                            className={`inline-block text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 ${
                              iWon
                                ? "bg-[#3a7a4f]/12 text-[#3a7a4f]"
                                : "bg-cs-loss/12 text-cs-loss"
                            }`}
                          >
                            {iWon ? "W" : "L"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </Card>

              {/* Upcoming */}
              <Card title="Upcoming challenges" actionHref="/app/challenges" actionLabel="Manage">
                {upcoming.length === 0 ? (
                  <Empty>No accepted challenges waiting to be played.</Empty>
                ) : (
                  upcoming.map((c) => {
                    const otherId = c.author_id === me.id ? c.accepted_by : c.author_id;
                    const other = people.get(otherId);
                    return (
                      <div
                        key={c.id}
                        className="border border-cs-green/10 border-l-2 border-l-cs-green bg-cs-ivory/40 px-5 py-4 flex items-center justify-between gap-4 mb-2 last:mb-0"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar
                            url={other?.photo_url}
                            seed={other?.id ?? otherId}
                            alt={other?.full_name ?? ""}
                            size={36}
                          />
                          <div className="min-w-0">
                            <div className="font-display italic text-[15px] text-cs-green truncate">
                              {other?.full_name ?? "—"}
                            </div>
                            <div className="text-[11px] text-cs-muted">
                              Accepted · {labelFormat(c.format)} ·{" "}
                              {cityMap.get(c.city_id)?.name ?? "—"}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] tracking-[0.2em] uppercase text-cs-brass">
                          Confirmed
                        </div>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              {/* Visiting your city */}
              <Card title="Visiting your city">
                {visitingPlans.length === 0 ? (
                  <Empty>No members visiting {homeCityName} right now.</Empty>
                ) : (
                  visitingPlans.slice(0, 4).map((v) => {
                    const p = people.get(v.profile_id);
                    return (
                      <div
                        key={v.profile_id}
                        className="flex items-center gap-3 py-3 border-b border-dashed border-cs-green/10 last:border-b-0"
                      >
                        <Avatar
                          url={p?.photo_url}
                          seed={p?.id ?? v.profile_id}
                          alt={p?.full_name ?? ""}
                          size={32}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-cs-green truncate">
                            {p?.full_name ?? "—"}
                          </div>
                          <div className="text-[10px] tracking-[0.16em] uppercase text-cs-brass">
                            From{" "}
                            {cityMap.get(p?.home_city_id ?? "")?.name ?? "—"}
                            {v.end_date ? ` · until ${shortDate(v.end_date)}` : ""}
                          </div>
                        </div>
                        <Link
                          href={`/app/members/${v.profile_id}`}
                          className="text-[10px] tracking-[0.2em] uppercase text-cs-green border-b border-cs-brass pb-px"
                        >
                          View
                        </Link>
                      </div>
                    );
                  })
                )}
              </Card>

              {/* Ranking movers */}
              <Card title="Top of the table" actionHref="/app/ranking" actionLabel="Full ranking">
                {!seasonRank || seasonRank.sorted.length === 0 ? (
                  <Empty>No ranked players yet this season.</Empty>
                ) : (
                  seasonRank.sorted.slice(0, 5).map((r, i) => {
                    const p = people.get(r.profile_id);
                    const isMe = r.profile_id === me.id;
                    return (
                      <div
                        key={r.profile_id}
                        className={`flex items-center justify-between py-2.5 border-b border-cs-green/10 last:border-b-0 ${
                          isMe ? "bg-cs-brass/8 -mx-6 px-6" : ""
                        }`}
                      >
                        <span className="font-display italic text-cs-green text-[18px] w-10">
                          #{i + 1}
                        </span>
                        <span className="flex-1 text-[13px] text-cs-green truncate">
                          {isMe ? "You" : p?.full_name ?? "—"}
                        </span>
                        <span className="font-display italic text-[14px] text-cs-brass">
                          {r.total_points}
                        </span>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* Right rail ----------------------------------------------------- */}
        <aside className="border-l border-cs-green/10 bg-[#FBF8F0] px-7 py-8 flex flex-col gap-8">
          {/* At a glance */}
          <div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
              At a glance
            </div>
            <h2 className="font-display italic text-[20px] text-cs-green mt-2">
              Your season
            </h2>
            <div className="grid grid-cols-2 gap-px bg-cs-green/10 border border-cs-green/10 mt-4">
              <RailStat label="Points" value={myRanking?.total_points ?? 0} />
              <RailStat label="Matches" value={totalMatches} />
              <RailStat
                label="Activity ×"
                value={myRanking ? myRanking.activity_multiplier.toFixed(2) : "—"}
              />
              <RailStat
                label="Level"
                value={me.level ? shortLevel(me.level) : "—"}
              />
            </div>
          </div>

          {/* Open in my city */}
          <div>
            <h2 className="font-display italic text-[18px] text-cs-green mb-3">
              Open challenges · {activeCityId ? cityMap.get(activeCityId)?.name ?? "" : "—"}
            </h2>
            {openChallenges.length === 0 ? (
              <p className="text-[12px] text-cs-muted">
                No open challenges. <Link href="/app/challenges" className="text-cs-green border-b border-cs-brass">Post one →</Link>
              </p>
            ) : (
              openChallenges.slice(0, 3).map((c) => {
                const p = people.get(c.author_id);
                return (
                  <Link
                    key={c.id}
                    href="/app/challenges"
                    className="flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0 hover:bg-cs-ivory/60 -mx-2 px-2"
                  >
                    <Avatar
                      url={p?.photo_url}
                      seed={p?.id ?? c.author_id}
                      alt={p?.full_name ?? ""}
                      size={28}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-cs-green truncate">
                        {p?.full_name ?? "—"}
                      </div>
                      <div className="text-[10px] text-cs-muted">
                        {labelFormat(c.format)} · {shortLevel(c.level)}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Rivalries to watch */}
          <div>
            <h2 className="font-display italic text-[18px] text-cs-green mb-3">
              Rivalries to watch
            </h2>
            {topRivals.length === 0 ? (
              <p className="text-[12px] text-cs-muted">
                Play a few matches to build rivalries.
              </p>
            ) : (
              topRivals.map((r) => (
                <Link
                  key={r.id}
                  href={`/app/h2h/${r.id}`}
                  className="flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0 hover:bg-cs-ivory/60 -mx-2 px-2"
                >
                  <Avatar
                    url={r.profile?.photo_url}
                    seed={r.profile?.id ?? r.id}
                    alt={r.profile?.full_name ?? ""}
                    size={28}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-cs-green truncate">
                      vs {r.profile?.full_name ?? "—"}
                    </div>
                    <div className="text-[10px] text-cs-muted">
                      {r.wins} – {r.losses}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

/* ────────── helpers ────────── */

function firstName(name: string | null | undefined) {
  return name?.split(" ")[0] ?? "there";
}

function seasonWeek(year: number | null | undefined) {
  if (!year) return "—";
  // Calendar week within the season's year — good enough for the dashboard.
  const start = new Date(year, 0, 1).getTime();
  const w = Math.max(
    1,
    Math.ceil((Date.now() - start) / (7 * 24 * 60 * 60 * 1000)),
  );
  return String(w);
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function clubName(
  clubId: string | null | undefined,
  clubMap: Map<string, { name: string }>,
) {
  if (!clubId) return "—";
  return clubMap.get(clubId)?.name ?? "—";
}

function labelFormat(f: string) {
  if (f === "singles") return "Singles";
  if (f === "doubles") return "Doubles";
  if (f === "both") return "Singles or doubles";
  return f;
}

function shortLevel(level: string) {
  if (level === "beginner") return "Beg";
  if (level === "recreational") return "Rec";
  if (level === "intermediate") return "Int";
  if (level === "strong_club") return "A";
  if (level === "competitive") return "A+";
  if (level === "former_pro") return "Pro";
  return level;
}

/* ────────── presentational helpers ────────── */

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cs-ivory px-5 py-4">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[26px] text-cs-green leading-none mt-2">
        {value}
      </div>
    </div>
  );
}

function DKpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="bg-[#FBF8F0] px-6 py-5">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[36px] text-cs-green leading-none mt-2 -tracking-[0.01em]">
        {value}
      </div>
      {detail && (
        <div className="text-[11px] text-cs-muted mt-2">{detail}</div>
      )}
    </div>
  );
}

function Card({
  title,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#FBF8F0] border border-cs-green/10 px-6 py-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display italic text-[20px] text-cs-green">{title}</h3>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="text-[10px] tracking-[0.2em] uppercase text-cs-brass hover:text-cs-green"
          >
            {actionLabel} →
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function RailStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#FBF8F0] px-4 py-3.5">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[24px] text-cs-green leading-none mt-2">
        {value}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-cs-muted leading-relaxed py-2">{children}</p>
  );
}
