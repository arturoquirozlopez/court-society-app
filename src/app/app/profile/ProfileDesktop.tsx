import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import {
  FORMAT_LABEL,
  FREQUENCY_LABEL,
  LEVEL_LABEL,
} from "@/lib/types";
import type { Match, Nomination, Profile } from "@/lib/types";
import { fmtDate, linkedinDisplay, winRate } from "@/lib/format";
import { ProfileEditor } from "./ProfileEditor";
import { NominateButton } from "./NominateButton";
import { MyNominations } from "./MyNominations";

/**
 * Desktop variant of /app/profile (≥1024px). All data is computed server-side
 * upstream and passed in; this component is pure presentational JSX so the
 * caller can keep its query block tidy.
 */
export function ProfileDesktop({
  me,
  cities,
  clubName,
  cityName,
  visitingName,
  activeVisitingCityId,
  cityMap,
  clubMap,
  myStats,
  myPoints,
  myRank,
  totalRanked,
  recentMatches,
  opponentMap,
  rivalsTop,
  nominations,
}: {
  me: Profile;
  cities: { id: string; name: string }[];
  clubName: string;
  cityName: string;
  visitingName: string | null;
  activeVisitingCityId: string | null;
  // Same shape as `getCityMap` / `getClubMap` return, so callers can pass
  // those maps directly without re-keying.
  cityMap: Map<string, { name: string; slug: string; active: boolean }>;
  clubMap: Map<
    string,
    { name: string; city_id: string; is_other: boolean; active: boolean }
  >;
  myStats: { wins: number; losses: number };
  myPoints: number;
  myRank: number | null;
  totalRanked: number;
  recentMatches: Match[];
  opponentMap: Map<string, Profile>;
  rivalsTop: { id: string; wins: number; losses: number; profile?: Profile }[];
  nominations: Nomination[];
}) {
  const total = myStats.wins + myStats.losses;
  const winPct = winRate(myStats.wins, myStats.losses);
  const li = linkedinDisplay(me.linkedin_url);

  return (
    <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:min-h-dvh">
      {/* Main column ----------------------------------------------------- */}
      <section className="pb-16">
        {/* Editorial hero */}
        <div className="relative overflow-hidden bg-cs-green text-cs-ivory px-10 pt-10 pb-9">
          <div
            aria-hidden
            className="pointer-events-none select-none absolute -bottom-12 right-8 font-display italic leading-none text-white/[0.04] text-[200px]"
          >
            {monogram(me.full_name) || "CS"}
          </div>
          <div className="relative z-10 flex items-end gap-8">
            <Avatar
              url={me.photo_url}
              seed={me.id}
              alt={me.full_name ?? ""}
              size={120}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brassLight">
                M e m b e r &nbsp; · &nbsp; {cityName !== "—" ? cityName.toUpperCase() : ""}
              </div>
              <h1 className="font-display italic text-[48px] leading-[1.05] mt-2 -tracking-[0.015em]">
                {me.full_name ?? "—"}
              </h1>
              {me.headline && (
                <div className="text-[13px] text-cs-ivory/70 mt-2">
                  {me.headline}
                </div>
              )}
              {visitingName && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-3 bg-cs-brass/15 border border-cs-brass/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-brass animate-pulse" />
                  <span className="text-[10px] text-cs-brass tracking-[0.06em]">
                    Visiting {visitingName}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex gap-10 mt-7 pt-6 border-t border-white/10">
            <MetaItem label="Club" value={clubName} />
            <MetaItem label="City" value={cityName} />
            <MetaItem label="Level" value={me.level ? LEVEL_LABEL[me.level] : "—"} />
            <MetaItem label="Format" value={me.format ? FORMAT_LABEL[me.format] : "—"} />
            <MetaItem
              label="Member since"
              value={fmtDate(me.joined_at ?? me.created_at)}
            />
          </div>
        </div>

        {/* Page body */}
        <div className="px-10 pt-8">
          {/* 2-col grid: personal | season */}
          <div className="grid grid-cols-2 gap-7">
            <Card title="Personal &amp; preferences">
              <ReadRow l="Frequency" v={me.frequency ? FREQUENCY_LABEL[me.frequency] : "—"} />
              <ReadRow
                l="Travel"
                v={
                  me.travel_city_ids
                    .map((id) => cityMap.get(id)?.name)
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <ReadRow
                l="LinkedIn"
                v={
                  li ? (
                    <a
                      href={li.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cs-green underline decoration-cs-brass underline-offset-2 hover:decoration-cs-green"
                    >
                      {li.label}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <ReadRow l="Gender" v={me.gender === "M" ? "Male" : me.gender === "F" ? "Female" : "—"} />
              <ReadRow
                l="Visiting"
                v={visitingName ?? "— · home in " + cityName}
                last
              />
              <div className="mt-5 pt-5 border-t border-cs-green/10">
                <ProfileEditor
                  me={me}
                  cities={cities}
                  activeVisitingCityId={activeVisitingCityId}
                />
              </div>
            </Card>

            <Card title="Season performance">
              <div className="grid grid-cols-2 gap-px bg-cs-green/10 border border-cs-green/10">
                <Stat label="Ranking" value={myRank ? `#${myRank} / ${totalRanked}` : "—"} />
                <Stat label="Points" value={String(myPoints)} />
                <Stat label="Win rate" value={total ? `${winPct}%` : "—"} />
                <Stat label="Matches" value={String(total)} />
                <Stat label="Wins" value={String(myStats.wins)} />
                <Stat label="Losses" value={String(myStats.losses)} />
              </div>
              <div className="mt-6">
                <div className="text-[10px] tracking-[0.22em] uppercase text-cs-muted mb-2">
                  Form · last 5
                </div>
                <FormStrip results={recentMatches.slice(0, 5).map((m) => {
                  const iWon =
                    (m.author_id === me.id && m.author_result === "W") ||
                    (m.opponent_id === me.id && m.author_result === "L");
                  return iWon;
                })} />
              </div>
            </Card>
          </div>

          {/* Recent matches table */}
          <div className="mt-7">
            <Card
              title="Recent matches"
              actionHref="/app/h2h"
              actionLabel="Head-to-head"
            >
              {recentMatches.length === 0 ? (
                <p className="text-[12px] text-cs-muted py-2">No matches logged yet.</p>
              ) : (
                <table className="w-full border-collapse mt-2">
                  <thead>
                    <tr>
                      {["Date", "Opponent", "Score", "Club", "Result"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] tracking-[0.2em] uppercase text-cs-muted font-medium border-b border-cs-green/15 bg-cs-ivory/60 py-3 px-3.5"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentMatches.map((m) => {
                      const oppId = m.author_id === me.id ? m.opponent_id : m.author_id;
                      const opp = opponentMap.get(oppId);
                      const iWon =
                        (m.author_id === me.id && m.author_result === "W") ||
                        (m.opponent_id === me.id && m.author_result === "L");
                      return (
                        <tr key={m.id} className="hover:bg-cs-brass/4 transition-colors">
                          <td className="py-3.5 px-3.5 border-b border-cs-green/8 text-[13px] text-cs-green whitespace-nowrap">
                            {fmtDate(m.created_at)}
                          </td>
                          <td className="py-3.5 px-3.5 border-b border-cs-green/8">
                            <Link
                              href={`/app/h2h/${oppId}`}
                              className="flex items-center gap-3 text-cs-green hover:text-cs-brass"
                            >
                              <Avatar
                                url={opp?.photo_url}
                                seed={opp?.id ?? oppId}
                                alt={opp?.full_name ?? ""}
                                size={28}
                              />
                              <span className="text-[13px] font-medium">
                                {opp?.full_name ?? "—"}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3.5 px-3.5 border-b border-cs-green/8 font-display italic text-[15px] text-cs-green">
                            {m.score ?? "—"}
                          </td>
                          <td className="py-3.5 px-3.5 border-b border-cs-green/8 text-[12px] text-cs-muted">
                            {opp?.home_club_id
                              ? clubMap.get(opp.home_club_id)?.name ?? "—"
                              : "—"}
                          </td>
                          <td className="py-3.5 px-3.5 border-b border-cs-green/8">
                            <span
                              className={`inline-block text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 ${
                                iWon
                                  ? "bg-[#3a7a4f]/12 text-[#3a7a4f]"
                                  : "bg-cs-loss/12 text-cs-loss"
                              }`}
                            >
                              {iWon ? "W" : "L"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* Right rail ----------------------------------------------------- */}
      <aside className="border-l border-cs-green/10 bg-[#FBF8F0] px-7 py-10 flex flex-col gap-8">
        {/* Ranking */}
        <div>
          <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
            Ranking
          </div>
          <div className="font-display italic text-cs-green text-[64px] leading-none mt-2">
            {myRank ? `#${myRank}` : "—"}
          </div>
          {myRank && totalRanked > 0 && (
            <div className="text-[11px] tracking-[0.16em] uppercase text-cs-muted mt-2">
              Of {totalRanked} active members
            </div>
          )}
          <hr className="my-5 border-cs-green/10" />
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
                Win %
              </div>
              <div className="font-display italic text-cs-green text-[30px] leading-none mt-1.5">
                {total ? `${winPct}%` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
                Points
              </div>
              <div className="font-display italic text-cs-green text-[30px] leading-none mt-1.5">
                {myPoints}
              </div>
            </div>
          </div>
        </div>

        {/* Head-to-head record */}
        <div>
          <h2 className="font-display italic text-[18px] text-cs-green mb-3">
            Head-to-head record
          </h2>
          {rivalsTop.length === 0 ? (
            <p className="text-[12px] text-cs-muted">
              Play a few matches to build your record.
            </p>
          ) : (
            rivalsTop.map((r) => (
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
                    {r.profile?.full_name ?? "—"}
                  </div>
                </div>
                <div className="font-display italic text-[13px] text-cs-green tracking-tight">
                  {r.wins} – {r.losses}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Nominations */}
        <div>
          <h2 className="font-display italic text-[18px] text-cs-green mb-2">
            Nominations
          </h2>
          <p className="text-[12px] text-cs-muted leading-relaxed mb-4">
            Court Society grows by trust. Invite someone you would be proud to
            play across the net.
          </p>
          <NominateButton />
          <div className="mt-4">
            <MyNominations rows={nominations} />
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ────────── helpers ────────── */

function monogram(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.22em] uppercase text-cs-ivory/50">
        {label}
      </div>
      <div className="font-display italic text-[16px] text-cs-ivory mt-1.5">
        {value}
      </div>
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
      <div className="flex items-center justify-between mb-3">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FBF8F0] px-4 py-4">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[28px] text-cs-green leading-none mt-2">
        {value}
      </div>
    </div>
  );
}

function ReadRow({ l, v, last }: { l: string; v: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={`flex justify-between items-center py-3 ${
        last ? "" : "border-b border-cs-green/8"
      }`}
    >
      <span className="text-[11px] tracking-[0.08em] uppercase text-cs-muted">
        {l}
      </span>
      <span className="text-[13px] text-cs-black font-medium text-right max-w-[60%]">
        {v}
      </span>
    </div>
  );
}

function FormStrip({ results }: { results: boolean[] }) {
  if (!results.length) return <span className="text-[12px] text-cs-muted">No recent matches.</span>;
  return (
    <div className="flex gap-1.5">
      {results.map((won, i) => (
        <span
          key={i}
          className={`w-7 h-7 flex items-center justify-center text-[11px] tracking-[0.1em] font-medium ${
            won ? "bg-[#3a7a4f]/15 text-[#3a7a4f]" : "bg-cs-loss/15 text-cs-loss"
          }`}
        >
          {won ? "W" : "L"}
        </span>
      ))}
    </div>
  );
}
