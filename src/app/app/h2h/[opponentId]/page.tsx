import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSeason,
  getCityMap,
  getClubMap,
  getHeadToHead,
  getSeasonRanking,
} from "@/lib/queries";
import { fmtDate, winRate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import {
  LEVEL_LABEL,
  LEVEL_SHORT,
  type Match,
  type PlayLevel,
  type Profile,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/* ────────── helpers ────────── */

type ScoreParse = {
  pSets: number;
  oSets: number;
  pGames: number;
  oGames: number;
  totalSets: number;
};

function parseScore(score: string | null, swap: boolean = false): ScoreParse | null {
  if (!score) return null;
  const cleaned = score.replace(/\(.*?\)/g, "").trim();
  if (!cleaned) return null;
  const sets = cleaned.split(/\s+/);
  let pSets = 0, oSets = 0, pGames = 0, oGames = 0;
  for (const s of sets) {
    const m = s.match(/^(\d+)-(\d+)$/);
    if (!m) continue;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const myG = swap ? b : a;
    const opG = swap ? a : b;
    pGames += myG;
    oGames += opG;
    if (myG > opG) pSets += 1;
    else if (opG > myG) oSets += 1;
  }
  return { pSets, oSets, pGames, oGames, totalSets: pSets + oSets };
}

function longestStreak(wins: boolean[]): number {
  let max = 0, cur = 0;
  for (const w of wins) {
    if (w) {
      cur += 1;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

function currentStreak(winsNewestFirst: boolean[]): { count: number; type: "W" | "L" | null } {
  if (winsNewestFirst.length === 0) return { count: 0, type: null };
  const first = winsNewestFirst[0];
  let count = 0;
  for (const w of winsNewestFirst) {
    if (w === first) count += 1;
    else break;
  }
  return { count, type: first ? "W" : "L" };
}

type CareerMatch = Match & { won: boolean };

/* ────────── page ────────── */

export default async function H2hDetail({
  params,
}: {
  params: { opponentId: string };
}) {
  const me = await requireApproved();
  const supabase = createClient();

  const { data: oppData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.opponentId)
    .maybeSingle();
  if (!oppData) notFound();
  const opponent = oppData as unknown as Profile;

  const [cityMap, clubMap, season, h2hMatches] = await Promise.all([
    getCityMap(),
    getClubMap(),
    getActiveSeason(),
    getHeadToHead(me.id, opponent.id),
  ]);

  // Career-wide confirmed matches involving either player
  const { data: careerData } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "confirmed")
    .or(
      `author_id.eq.${me.id},author_id.eq.${opponent.id},opponent_id.eq.${me.id},opponent_id.eq.${opponent.id}`,
    );
  const allCareerMatches = (careerData ?? []) as unknown as Match[];

  function playerCareer(pid: string): CareerMatch[] {
    return allCareerMatches
      .filter((m) => m.author_id === pid || m.opponent_id === pid)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map((m) => {
        const isAuthor = m.author_id === pid;
        const won =
          (isAuthor && m.author_result === "W") ||
          (!isAuthor && m.author_result === "L");
        return { ...m, won };
      });
  }

  const meCareer = playerCareer(me.id);
  const oppCareer = playerCareer(opponent.id);

  // Standings for rank (Court Society Points)
  const seasonRanking = season ? await getSeasonRanking(season.id) : null;
  const rankOf = (pid: string) => {
    if (!seasonRanking) return null;
    const i = seasonRanking.sorted.findIndex((s) => s.profile_id === pid);
    return i === -1 ? null : i + 1;
  };

  function careerWL(matches: CareerMatch[]) {
    let w = 0, l = 0;
    for (const m of matches) (m.won ? w++ : l++);
    return { w, l };
  }
  function seasonWL(matches: CareerMatch[]) {
    if (!season) return { w: 0, l: 0 };
    let w = 0, l = 0;
    for (const m of matches) {
      if (m.season_id !== season.id) continue;
      m.won ? w++ : l++;
    }
    return { w, l };
  }
  function recentForm(matches: CareerMatch[]): boolean[] {
    return matches
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5)
      .map((m) => m.won);
  }

  const meWL = careerWL(meCareer);
  const oppWL = careerWL(oppCareer);
  const meSeasonWL = seasonWL(meCareer);
  const oppSeasonWL = seasonWL(oppCareer);
  const meStreak = longestStreak(meCareer.map((m) => m.won));
  const oppStreak = longestStreak(oppCareer.map((m) => m.won));
  const meForm = recentForm(meCareer);
  const oppForm = recentForm(oppCareer);

  // H2H tallies
  const h2hConfirmed = h2hMatches.filter((m) => m.status === "confirmed");
  let meH2HWins = 0, oppH2HWins = 0;
  let meSetsWon = 0, oppSetsWon = 0;
  let totalSetsInRivalry = 0;
  let threeSetMatches = 0;
  for (const m of h2hConfirmed) {
    const isAuthor = m.author_id === me.id;
    const meWon =
      (isAuthor && m.author_result === "W") ||
      (!isAuthor && m.author_result === "L");
    if (meWon) meH2HWins++;
    else oppH2HWins++;
    const ps = parseScore(m.score, !isAuthor);
    if (ps) {
      meSetsWon += ps.pSets;
      oppSetsWon += ps.oSets;
      totalSetsInRivalry += ps.totalSets;
      if (ps.totalSets >= 3) threeSetMatches++;
    }
  }
  const h2hTotal = meH2HWins + oppH2HWins;
  const mePctH2H = h2hTotal > 0 ? Math.round((meH2HWins / h2hTotal) * 100) : 0;
  const oppPctH2H = h2hTotal > 0 ? 100 - mePctH2H : 0;

  function lineOf(p: Profile) {
    const cityName = p.home_city_id ? cityMap.get(p.home_city_id)?.name ?? null : null;
    const clubInfo = p.home_club_id ? clubMap.get(p.home_club_id) ?? null : null;
    const clubName = clubInfo
      ? clubInfo.is_other && p.other_club_name
        ? p.other_club_name
        : clubInfo.name
      : null;
    const sinceYear = p.joined_at
      ? new Date(p.joined_at).getFullYear()
      : new Date(p.created_at).getFullYear();
    return { cityName, clubName, level: p.level, sinceYear };
  }
  const meLine = lineOf(me);
  const oppLine = lineOf(opponent);

  // Rivalry insights
  const insights: string[] = [];
  if (h2hConfirmed.length > 0) {
    const newest = h2hConfirmed[0];
    const oldest = h2hConfirmed[h2hConfirmed.length - 1];
    insights.push(`First meeting: ${fmtDate(oldest.created_at)}.`);
    if (h2hConfirmed.length > 1) {
      insights.push(`Most recent meeting: ${fmtDate(newest.created_at)}.`);
    }
  }
  if (h2hConfirmed.length >= 2) {
    const fromMyPOV = h2hConfirmed.map((m) => {
      const isAuthor = m.author_id === me.id;
      return (
        (isAuthor && m.author_result === "W") ||
        (!isAuthor && m.author_result === "L")
      );
    });
    const cs = currentStreak(fromMyPOV);
    if (cs.count >= 2) {
      const name =
        cs.type === "W"
          ? me.full_name?.split(" ")[0] ?? "You"
          : opponent.full_name?.split(" ")[0] ?? "They";
      insights.push(`${name} has won the last ${cs.count} meetings.`);
    }
  }
  if (h2hConfirmed.length >= 2 && totalSetsInRivalry > 0) {
    const avg = (totalSetsInRivalry / h2hConfirmed.length).toFixed(1);
    insights.push(`Average ${avg} sets per match.`);
  }
  if (h2hConfirmed.length >= 3 && threeSetMatches > 0) {
    const pct = Math.round((threeSetMatches / h2hConfirmed.length) * 100);
    insights.push(`${pct}% of matches have gone to 3 sets.`);
  }
  if (h2hConfirmed.length === 0) {
    insights.push("You haven't played each other yet. Post or accept a challenge to start the rivalry.");
  }

  /* ────────── render ────────── */

  return (
    <div className="min-h-dvh">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-cs-green text-cs-ivory px-7 pt-12 pb-10">
        <Link
          href="/app/h2h"
          className="block text-[10px] tracking-[0.15em] uppercase text-cs-brassLight mb-5"
        >
          ← Head to Head
        </Link>

        <div className="text-center mb-8">
          <div className="text-[9px] tracking-[0.32em] uppercase text-cs-brass mb-2">
            C O U R T &nbsp; S O C I E T Y
          </div>
          <h1 className="font-display italic text-[28px] sm:text-[32px] leading-tight">
            Head to Head
          </h1>
        </div>

        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-start">
          <PlayerHero
            player={me}
            line={meLine}
            href={`/app/profile`}
            label="You"
          />
          <div className="flex flex-col items-center pt-6">
            <span className="font-display italic text-[18px] text-cs-brassLight">
              vs
            </span>
          </div>
          <PlayerHero
            player={opponent}
            line={oppLine}
            href={`/app/members/${opponent.id}`}
          />
        </div>
      </section>

      {/* ── SCOREBOARD ── */}
      {h2hTotal > 0 ? (
        <section className="px-7 py-9 text-center border-b border-black/10">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-4">
            H2H Scoreboard
          </div>
          <div className="flex items-baseline justify-center gap-5">
            <span
              className={`font-display leading-none text-[72px] sm:text-[88px] ${
                meH2HWins >= oppH2HWins ? "text-cs-green" : "text-cs-muted/70"
              }`}
            >
              {meH2HWins}
            </span>
            <span className="font-display text-[44px] text-cs-brass">—</span>
            <span
              className={`font-display leading-none text-[72px] sm:text-[88px] ${
                oppH2HWins > meH2HWins ? "text-cs-green" : "text-cs-muted/70"
              }`}
            >
              {oppH2HWins}
            </span>
          </div>
          <div className="mt-5 text-[9px] tracking-[0.22em] uppercase text-cs-muted">
            Total Matches Played
          </div>
          <div className="font-display text-[26px] text-cs-green leading-none mt-1">
            {h2hTotal}
          </div>
          {meH2HWins !== oppH2HWins && (
            <div className="text-[11px] tracking-[0.06em] uppercase text-cs-brass mt-3">
              {meH2HWins > oppH2HWins
                ? `${me.full_name?.split(" ")[0]} leads the rivalry`
                : `${opponent.full_name?.split(" ")[0]} leads the rivalry`}
            </div>
          )}
        </section>
      ) : (
        <section className="px-7 py-10 text-center border-b border-black/10">
          <div className="font-display italic text-[24px] text-cs-green">
            No matches yet.
          </div>
          <div className="text-[12px] text-cs-muted mt-2 leading-relaxed max-w-[280px] mx-auto">
            Challenge each other from the Challenges tab and the rivalry begins.
          </div>
        </section>
      )}

      {/* ── SETS WON ── */}
      {h2hConfirmed.length > 0 && (meSetsWon > 0 || oppSetsWon > 0) && (
        <section className="px-7 py-6 border-b border-black/10">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-3">
            Sets Won
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[28px] text-cs-green">{meSetsWon}</span>
            <span className="text-[10px] tracking-[0.15em] uppercase text-cs-muted">vs</span>
            <span className="font-display text-[28px] text-cs-green">{oppSetsWon}</span>
          </div>
          <SplitBar left={meSetsWon} right={oppSetsWon} />
        </section>
      )}

      {/* ── WIN RATE ── */}
      {h2hTotal > 0 && (
        <section className="px-7 py-6 border-b border-black/10">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-3">
            H2H Win Rate
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-display text-[24px] text-cs-green">{mePctH2H}%</span>
            <span className="font-display text-[24px] text-cs-green">{oppPctH2H}%</span>
          </div>
          <SplitBar left={mePctH2H} right={oppPctH2H} />
          <div className="flex justify-between text-[10px] text-cs-muted tracking-[0.06em] mt-2">
            <span>{me.full_name?.split(" ")[0]}</span>
            <span>{opponent.full_name?.split(" ")[0]}</span>
          </div>
        </section>
      )}

      {/* ── PLAYER SNAPSHOT ── */}
      <section className="px-7 py-6 border-b border-black/10">
        <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-4">
          Player Snapshot
        </div>
        <ComparisonTable
          leftName={me.full_name?.split(" ")[0] ?? "You"}
          rightName={opponent.full_name?.split(" ")[0] ?? "—"}
          rows={[
            ["City", meLine.cityName ?? "—", oppLine.cityName ?? "—"],
            ["Club", meLine.clubName ?? "—", oppLine.clubName ?? "—"],
            [
              "Category",
              meLine.level ? LEVEL_LABEL[meLine.level as PlayLevel] : "—",
              oppLine.level ? LEVEL_LABEL[oppLine.level as PlayLevel] : "—",
            ],
            ["Member since", String(meLine.sinceYear), String(oppLine.sinceYear)],
            [
              "Season rank",
              rankOf(me.id) ? `#${rankOf(me.id)}` : "—",
              rankOf(opponent.id) ? `#${rankOf(opponent.id)}` : "—",
            ],
            [
              "Career matches",
              String(meWL.w + meWL.l),
              String(oppWL.w + oppWL.l),
            ],
            [
              "Career win %",
              meWL.w + meWL.l > 0 ? `${winRate(meWL.w, meWL.l)}%` : "—",
              oppWL.w + oppWL.l > 0 ? `${winRate(oppWL.w, oppWL.l)}%` : "—",
            ],
            [
              "Season win %",
              meSeasonWL.w + meSeasonWL.l > 0
                ? `${winRate(meSeasonWL.w, meSeasonWL.l)}%`
                : "—",
              oppSeasonWL.w + oppSeasonWL.l > 0
                ? `${winRate(oppSeasonWL.w, oppSeasonWL.l)}%`
                : "—",
            ],
            ["Longest streak", `${meStreak} W`, `${oppStreak} W`],
          ]}
        />
      </section>

      {/* ── RECENT FORM ── */}
      {(meForm.length > 0 || oppForm.length > 0) && (
        <section className="px-7 py-6 border-b border-black/10">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-4">
            Recent Form
          </div>
          <FormRow name={me.full_name?.split(" ")[0] ?? "You"} form={meForm} />
          <div className="h-3" />
          <FormRow
            name={opponent.full_name?.split(" ")[0] ?? "—"}
            form={oppForm}
          />
          <div className="text-[10px] text-cs-muted mt-3">
            Most recent on the right.
          </div>
        </section>
      )}

      {/* ── INSIGHTS ── */}
      {insights.length > 0 && (
        <section className="px-7 py-6 border-b border-black/10">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-3">
            Rivalry Insights
          </div>
          <ul className="space-y-2.5 text-[13px] text-cs-black/85 leading-relaxed">
            {insights.map((i, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="text-cs-brass">·</span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── TIMELINE ── */}
      {h2hMatches.length > 0 && (
        <section className="px-7 py-7">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-5">
            Rivalry Timeline
          </div>
          <ul className="relative">
            <span className="absolute left-[7px] top-0 bottom-0 w-px bg-cs-brass/30" />
            {h2hMatches.map((m) => {
              const isAuthor = m.author_id === me.id;
              const meWon =
                (isAuthor && m.author_result === "W") ||
                (!isAuthor && m.author_result === "L");
              const pending = m.status === "pending";
              const winnerName = meWon
                ? me.full_name?.split(" ")[0]
                : opponent.full_name?.split(" ")[0];
              const loserName = meWon
                ? opponent.full_name?.split(" ")[0]
                : me.full_name?.split(" ")[0];
              const score = (m.score ?? "—").replace(/-/g, "–");
              return (
                <li key={m.id} className="relative pl-7 pb-5">
                  <span
                    className={`absolute left-[3px] top-1.5 w-3 h-3 border-2 ${
                      pending
                        ? "border-cs-warn bg-cs-ivory"
                        : meWon
                          ? "border-cs-green bg-cs-green"
                          : "border-cs-loss bg-cs-loss"
                    }`}
                  />
                  <div className="text-[10px] tracking-[0.12em] uppercase text-cs-muted">
                    {fmtDate(m.created_at)}
                  </div>
                  {pending ? (
                    <div className="text-[13px] text-cs-warn mt-1">
                      Pending confirmation · {score}
                    </div>
                  ) : (
                    <>
                      <div className="text-[13px] text-cs-black mt-1">
                        <strong className="text-cs-green">
                          {winnerName}
                        </strong>{" "}
                        def.{" "}
                        <span className="text-cs-muted">{loserName}</span>{" "}
                        <span className="font-display text-cs-green ml-1">
                          {score}
                        </span>
                      </div>
                      {m.note && (
                        <div className="text-[11px] italic text-cs-muted mt-0.5 leading-snug">
                          &ldquo;{m.note}&rdquo;
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="h-12" />
    </div>
  );
}

/* ────────── sub-components ────────── */

function PlayerHero({
  player,
  line,
  href,
  label,
}: {
  player: Profile;
  line: {
    cityName: string | null;
    clubName: string | null;
    level: string | null;
    sinceYear: number;
  };
  href: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center min-w-0">
      <Link href={href} className="block">
        <Avatar
          url={player.photo_url}
          seed={player.id}
          alt={player.full_name ?? ""}
          size={64}
        />
      </Link>
      {label && (
        <div className="text-[8px] tracking-[0.2em] uppercase text-cs-brass mt-2">
          {label}
        </div>
      )}
      <div className="font-display text-[15px] mt-1.5 leading-tight truncate w-full px-1">
        {player.full_name}
      </div>
      <div className="text-[10px] text-cs-ivory/55 mt-1 leading-snug truncate w-full px-1">
        {line.cityName ?? "—"}
      </div>
      <div className="text-[10px] text-cs-brassLight/85 mt-0.5 leading-snug truncate w-full px-1">
        {line.clubName ?? "—"}
      </div>
      {line.level && (
        <span className="inline-block text-[8px] tracking-[0.18em] uppercase text-cs-brass mt-2 px-1.5 py-0.5 border border-cs-brass/40">
          {LEVEL_SHORT[line.level as PlayLevel]}
        </span>
      )}
      <div className="text-[8px] tracking-[0.12em] uppercase text-cs-ivory/45 mt-2">
        Member {line.sinceYear}
      </div>
    </div>
  );
}

function SplitBar({ left, right }: { left: number; right: number }) {
  const total = left + right;
  const lp = total > 0 ? (left / total) * 100 : 50;
  const rp = total > 0 ? 100 - lp : 50;
  return (
    <div className="flex h-2.5 overflow-hidden bg-black/5">
      <div className="bg-cs-green" style={{ width: `${lp}%` }} />
      <div className="bg-cs-brass" style={{ width: `${rp}%` }} />
    </div>
  );
}

function ComparisonTable({
  leftName,
  rightName,
  rows,
}: {
  leftName: string;
  rightName: string;
  rows: Array<[string, string, string]>;
}) {
  return (
    <div>
      <div className="grid grid-cols-[1fr,auto,1fr] gap-3 mb-2 text-[9px] tracking-[0.18em] uppercase">
        <span className="text-cs-brass text-right truncate">{leftName}</span>
        <span className="text-cs-muted">·</span>
        <span className="text-cs-brass text-left truncate">{rightName}</span>
      </div>
      <ul>
        {rows.map(([label, l, r], i) => (
          <li
            key={i}
            className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center py-2.5 border-b border-black/5 last:border-b-0"
          >
            <div className="text-[13.5px] text-cs-black font-medium text-right truncate">
              {l}
            </div>
            <div className="text-[9px] tracking-[0.16em] uppercase text-cs-muted whitespace-nowrap">
              {label}
            </div>
            <div className="text-[13.5px] text-cs-black font-medium text-left truncate">
              {r}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormRow({ name, form }: { name: string; form: boolean[] }) {
  if (form.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-cs-muted w-20 truncate">{name}</span>
        <span className="text-[11px] text-cs-muted italic">No recent matches</span>
      </div>
    );
  }
  // form is newest-first → reverse for display so most-recent is on the right
  const display = form.slice().reverse();
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-cs-black font-medium w-20 truncate">
        {name}
      </span>
      <div className="flex gap-1">
        {display.map((w, i) => (
          <span
            key={i}
            className={`inline-flex items-center justify-center w-7 h-7 text-[10px] font-semibold tracking-[0.05em] ${
              w
                ? "bg-cs-green text-cs-ivory"
                : "bg-cs-loss text-white"
            }`}
          >
            {w ? "W" : "L"}
          </span>
        ))}
      </div>
    </div>
  );
}
