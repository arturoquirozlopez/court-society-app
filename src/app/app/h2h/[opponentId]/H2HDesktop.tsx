import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { fmtDate } from "@/lib/format";
import { LEVEL_SHORT, type Match, type PlayLevel, type Profile } from "@/lib/types";

/**
 * Desktop variant of /app/h2h/[opponentId]. Editorial "vs" hero on a dark
 * green block, stat split with bars, insights grid, full numbered timeline.
 *
 * All data is computed upstream (page.tsx) and passed in — this component is
 * purely presentational so the data layer stays in one place.
 */
export function H2HDesktop({
  me,
  opponent,
  meLine,
  oppLine,
  meH2HWins,
  oppH2HWins,
  meSetsWon,
  oppSetsWon,
  threeSetMatches,
  meRank,
  oppRank,
  h2hConfirmed,
  h2hAll,
  insights,
  otherRivals,
}: {
  me: Profile;
  opponent: Profile;
  meLine: { cityName: string | null; clubName: string | null; level: string | null; sinceYear: number };
  oppLine: { cityName: string | null; clubName: string | null; level: string | null; sinceYear: number };
  meH2HWins: number;
  oppH2HWins: number;
  meSetsWon: number;
  oppSetsWon: number;
  threeSetMatches: number;
  meRank: number | null;
  oppRank: number | null;
  h2hConfirmed: Match[];
  h2hAll: Match[];
  insights: string[];
  otherRivals: { id: string; wins: number; losses: number; profile?: Profile }[];
}) {
  const h2hTotal = meH2HWins + oppH2HWins;
  const meWinRate = h2hTotal ? Math.round((meH2HWins / h2hTotal) * 100) : 0;
  const oppWinRate = h2hTotal ? 100 - meWinRate : 0;
  const totalSets = meSetsWon + oppSetsWon;
  const meSetsPct = totalSets ? (meSetsWon / totalSets) * 100 : 50;

  const avgSetsPerMatch = h2hConfirmed.length
    ? (totalSets / h2hConfirmed.length).toFixed(1)
    : "—";

  // Match timeline: newest first, numbered descending #N, #N-1, ...
  const timelineDescending = h2hAll
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const meFirst = me.full_name?.split(" ")[0] ?? "You";
  const oppFirst = opponent.full_name?.split(" ")[0] ?? "—";

  return (
    <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:min-h-dvh">
      {/* Main column ----------------------------------------------------- */}
      <section className="pb-16">
        {/* Page head */}
        <div className="flex items-end justify-between px-10 pt-8 pb-6 border-b border-cs-green/10">
          <div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
              R i v a l r y
            </div>
            <h1 className="font-display italic text-[42px] leading-none mt-2 text-cs-green -tracking-[0.015em]">
              {lastName(me.full_name)}{" "}
              <span className="text-cs-brass text-[24px] mx-2 tracking-[0.06em]">
                vs
              </span>{" "}
              {lastName(opponent.full_name)}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/app/h2h"
              className="text-[11px] tracking-[0.18em] uppercase px-4 py-2.5 border border-cs-green/20 text-cs-green hover:border-cs-green"
            >
              Switch rival
            </Link>
            <Link
              href="/app/challenges"
              className="text-[11px] tracking-[0.18em] uppercase px-4 py-2.5 bg-cs-green text-cs-ivory relative"
            >
              New challenge
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-cs-brass" />
            </Link>
          </div>
        </div>

        {/* Hero vs block */}
        <div className="relative overflow-hidden bg-cs-green text-cs-ivory mx-10 mt-7 px-10 py-12">
          <div
            aria-hidden
            className="pointer-events-none select-none absolute -bottom-12 right-10 font-display italic text-white/[0.03] text-[240px] leading-none"
          >
            vs
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center relative z-10">
            <SideHero
              player={me}
              line={meLine}
              rank={meRank}
              align="left"
            />
            <div className="font-display italic text-[24px] text-cs-brassLight">
              VS
            </div>
            <SideHero
              player={opponent}
              line={oppLine}
              rank={oppRank}
              align="right"
            />
          </div>

          {/* Score */}
          {h2hTotal > 0 ? (
            <>
              <div className="flex gap-6 items-baseline justify-center mt-10 relative z-10">
                <span
                  className={`font-display italic text-[88px] leading-none ${
                    meH2HWins >= oppH2HWins ? "text-cs-ivory" : "text-cs-ivory/35"
                  }`}
                >
                  {meH2HWins}
                </span>
                <span className="font-display italic text-[42px] text-cs-brassLight">
                  —
                </span>
                <span
                  className={`font-display italic text-[88px] leading-none ${
                    oppH2HWins > meH2HWins ? "text-cs-ivory" : "text-cs-ivory/35"
                  }`}
                >
                  {oppH2HWins}
                </span>
              </div>
              <div className="text-center text-[10px] tracking-[0.32em] uppercase text-cs-ivory/45 mt-4 relative z-10">
                {h2hConfirmed.length} {h2hConfirmed.length === 1 ? "match" : "matches"}
                {h2hConfirmed[h2hConfirmed.length - 1] &&
                  ` · since ${fmtMonthYear(h2hConfirmed[h2hConfirmed.length - 1].created_at)}`}
              </div>
            </>
          ) : (
            <p className="text-center text-cs-ivory/70 text-[14px] mt-10 relative z-10">
              You haven&apos;t played each other yet. Send a challenge to start the
              rivalry.
            </p>
          )}

          {/* Stat split row */}
          {h2hTotal > 0 && (
            <div className="grid grid-cols-4 gap-px bg-white/10 mt-10 relative z-10">
              <StatCell label="Sets won" me={meSetsWon} opp={oppSetsWon} pct={meSetsPct} />
              <StatCell label="Win rate" me={`${meWinRate}%`} opp={`${oppWinRate}%`} pct={meWinRate} />
              <StatCell label="Avg sets / match" me={avgSetsPerMatch} opp={avgSetsPerMatch} pct={50} hideBar />
              <StatCell
                label="3-set matches"
                me={threeSetMatches}
                opp={threeSetMatches}
                pct={50}
                hideBar
              />
            </div>
          )}
        </div>

        {/* Insights grid */}
        {h2hTotal > 0 && (
          <div className="mx-10 mt-7 bg-[#FBF8F0] border border-cs-green/10 grid grid-cols-3">
            <InsightCell
              label="Last meeting"
              value={
                h2hConfirmed[0]
                  ? `${fmtDate(h2hConfirmed[0].created_at)} · ${(h2hConfirmed[0].score ?? "—").replace(/-/g, "–")}`
                  : "—"
              }
            />
            <InsightCell
              label="First meeting"
              value={
                h2hConfirmed[h2hConfirmed.length - 1]
                  ? `${fmtDate(h2hConfirmed[h2hConfirmed.length - 1].created_at)} · ${(h2hConfirmed[h2hConfirmed.length - 1].score ?? "—").replace(/-/g, "–")}`
                  : "—"
              }
            />
            <InsightCell label="3-set matches" value={String(threeSetMatches)} />
            <InsightCell
              label="Avg sets / match"
              value={String(avgSetsPerMatch)}
            />
            <InsightCell
              label="Your best result"
              value={bestResultFor(me.id, h2hConfirmed) ?? "—"}
            />
            <InsightCell
              label="Their best result"
              value={bestResultFor(opponent.id, h2hConfirmed) ?? "—"}
            />
          </div>
        )}

        {/* Timeline */}
        {timelineDescending.length > 0 && (
          <div className="mx-10 mt-9">
            <h3 className="font-display italic text-[22px] text-cs-green mb-4">
              Match timeline
            </h3>
            {timelineDescending.map((m, i) => {
              const num = timelineDescending.length - i;
              const isAuthor = m.author_id === me.id;
              const meWon =
                (isAuthor && m.author_result === "W") ||
                (!isAuthor && m.author_result === "L");
              const pending = m.status === "pending";
              const score = (m.score ?? "—").replace(/-/g, "–");
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[64px_1fr_180px_140px_80px] items-center py-3.5 border-b border-cs-green/10 last:border-b-0"
                >
                  <span className="font-display italic text-[20px] text-cs-brass">
                    #{num}
                  </span>
                  <span className="text-[13px] text-cs-green">
                    {meWon ? meFirst : oppFirst}{" "}
                    <span className="text-cs-muted">def.</span>{" "}
                    {meWon ? oppFirst : meFirst}
                  </span>
                  <span className="text-[11px] tracking-[0.16em] uppercase text-cs-muted">
                    {fmtDate(m.created_at)}
                  </span>
                  <span className="font-display italic text-[15px] text-cs-green">
                    {score}
                  </span>
                  <span>
                    {pending ? (
                      <span className="text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 bg-cs-warn/12 text-cs-warn">
                        PEND
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 ${
                          meWon
                            ? "bg-[#3a7a4f]/12 text-[#3a7a4f]"
                            : "bg-cs-loss/12 text-cs-loss"
                        }`}
                      >
                        {meWon ? "W" : "L"}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Right rail ----------------------------------------------------- */}
      <aside className="border-l border-cs-green/10 bg-[#FBF8F0] px-7 py-10 flex flex-col gap-8">
        <div>
          <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
            R i v a l r y &nbsp; i n s i g h t s
          </div>
          <h2 className="font-display italic text-[20px] text-cs-green mt-2 mb-3">
            The numbers
          </h2>
          {insights.length === 0 ? (
            <p className="text-[12px] text-cs-muted">
              No matches yet. Once you play, insights appear here.
            </p>
          ) : (
            <ul className="space-y-2.5 text-[12.5px] text-cs-black/80 leading-relaxed">
              {insights.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-cs-brass">·</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {otherRivals.length > 0 && (
          <div>
            <h2 className="font-display italic text-[18px] text-cs-green mb-3">
              Other rivalries
            </h2>
            {otherRivals.slice(0, 5).map((r) => (
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
            ))}
          </div>
        )}

        <div>
          <h2 className="font-display italic text-[18px] text-cs-green mb-2">
            Set the next chapter
          </h2>
          <p className="text-[12px] text-cs-muted leading-relaxed mb-3">
            Challenge {oppFirst} for the next meeting.
          </p>
          <Link
            href="/app/challenges"
            className="block w-full text-center text-[11px] tracking-[0.2em] uppercase bg-cs-brass text-cs-ivory py-3.5 hover:opacity-90 transition-opacity"
          >
            Send direct challenge
          </Link>
        </div>
      </aside>
    </div>
  );
}

/* ────────── presentational ────────── */

function SideHero({
  player,
  line,
  rank,
  align,
}: {
  player: Profile;
  line: { cityName: string | null; clubName: string | null; level: string | null };
  rank: number | null;
  align: "left" | "right";
}) {
  return (
    <div className={`flex flex-col items-center text-center gap-3.5`}>
      <Avatar
        url={player.photo_url}
        seed={player.id}
        alt={player.full_name ?? ""}
        size={110}
      />
      <div>
        <div className="font-display italic text-[28px] leading-tight -tracking-[0.01em]">
          {player.full_name ?? "—"}
        </div>
        <div className="text-[11px] text-cs-ivory/60 mt-1.5 tracking-[0.04em]">
          {line.clubName ?? "—"} · {line.cityName ?? "—"}
        </div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-cs-brassLight mt-2">
          {rank ? `RANKED #${rank}` : "UNRANKED"}
          {line.level ? ` · LEVEL ${LEVEL_SHORT[line.level as PlayLevel]}` : ""}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  me,
  opp,
  pct,
  hideBar,
}: {
  label: string;
  me: string | number;
  opp: string | number;
  pct: number;
  hideBar?: boolean;
}) {
  return (
    <div className="bg-cs-green px-5 py-4">
      <div className="text-[10px] tracking-[0.22em] uppercase text-cs-ivory/55">
        {label}
      </div>
      <div className="flex justify-between items-baseline mt-2">
        <span className="font-display italic text-[26px] text-cs-ivory">
          {me}
        </span>
        <span className="font-display italic text-[26px] text-cs-ivory/40">
          {opp}
        </span>
      </div>
      {!hideBar && (
        <div className="h-[3px] bg-white/8 mt-2.5 relative">
          <span
            className="absolute left-0 top-0 bottom-0 bg-cs-brass"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function InsightCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4 border-b border-r border-cs-green/8 [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0">
      <div className="text-[10px] tracking-[0.22em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[18px] text-cs-green mt-1.5">
        {value}
      </div>
    </div>
  );
}

/* ────────── helpers ────────── */

function lastName(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function bestResultFor(playerId: string, confirmed: Match[]): string | null {
  // "Best result" = largest set differential in a win, e.g. 6-1 7-5 → 4 set games
  let best: { iso: string; score: string } | null = null;
  let bestDiff = -1;
  for (const m of confirmed) {
    const isAuthor = m.author_id === playerId;
    const won =
      (isAuthor && m.author_result === "W") ||
      (!isAuthor && m.author_result === "L");
    if (!won || !m.score) continue;
    const sets = m.score.replace(/\(.*?\)/g, "").trim().split(/\s+/);
    let diff = 0;
    for (const s of sets) {
      const x = s.match(/^(\d+)-(\d+)$/);
      if (!x) continue;
      const a = parseInt(x[1], 10);
      const b = parseInt(x[2], 10);
      const my = isAuthor ? a : b;
      const opp = isAuthor ? b : a;
      diff += my - opp;
    }
    if (diff > bestDiff) {
      bestDiff = diff;
      best = { iso: m.created_at, score: m.score };
    }
  }
  if (!best) return null;
  const year = new Date(best.iso).getFullYear();
  return `${best.score.replace(/-/g, "–")} (${year})`;
}
