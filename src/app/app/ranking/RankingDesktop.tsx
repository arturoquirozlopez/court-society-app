"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { winRate } from "@/lib/format";
import { LEVEL_SHORT, type PlayLevel, type Profile } from "@/lib/types";

type PlayerRow = Profile & {
  wins: number;
  losses: number;
  total_points: number;
  total_matches: number;
  activity_multiplier: number;
  decay_factor: number;
};

/**
 * Desktop variant of /app/ranking — podium for the top 3 plus a full
 * leaderboard table, with the member's row highlighted. Filters live in the
 * page header (Open / Men / Women / by club). The right rail shows your
 * position and notable matchups.
 *
 * Mobile renders the original `RankingClient` — this component is hidden
 * below the 1024 px breakpoint.
 */
export function RankingDesktop({
  meId,
  meLevel,
  players,
  cities,
  clubs,
  seasonYear,
}: {
  meId: string;
  meLevel: PlayLevel | null;
  players: PlayerRow[];
  cities: { id: string; name: string }[];
  clubs: { id: string; name: string; city_id: string }[];
  seasonYear: number | null;
}) {
  type Mode = "open" | "M" | "F";
  const [mode, setMode] = useState<Mode>("open");
  const [clubId, setClubId] = useState<string>("all");

  const filtered = useMemo(() => {
    return players
      .filter((p) => {
        if (mode !== "open" && p.gender !== mode) return false;
        if (clubId !== "all" && p.home_club_id !== clubId) return false;
        return true;
      })
      .filter((p) => p.total_matches > 0)
      .sort((a, b) => {
        if (a.total_points !== b.total_points) return b.total_points - a.total_points;
        return b.total_matches - a.total_matches;
      });
  }, [players, mode, clubId]);

  const me = players.find((p) => p.id === meId);
  const myRank = filtered.findIndex((p) => p.id === meId) + 1 || null;
  const podium = filtered.slice(0, 3);

  // Category context for the right rail
  const myCategory = useMemo(() => {
    if (!meLevel) return null;
    const sameLevel = filtered.filter((p) => p.level === meLevel);
    const idx = sameLevel.findIndex((p) => p.id === meId);
    return {
      total: sameLevel.length,
      position: idx + 1 || null,
    };
  }, [filtered, meLevel, meId]);

  // Distance to next / lead over below
  const distanceUp =
    myRank && myRank > 1
      ? filtered[myRank - 2].total_points - (me?.total_points ?? 0)
      : null;
  const leadDown =
    myRank && myRank < filtered.length
      ? (me?.total_points ?? 0) - filtered[myRank].total_points
      : null;

  // Top rivals (most matches; opponent in the active filter scope)
  const cityName = (id: string | null) =>
    id ? cities.find((c) => c.id === id)?.name ?? "" : "";
  const clubName = (id: string | null) =>
    id ? clubs.find((c) => c.id === id)?.name ?? "—" : "—";

  return (
    <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:min-h-dvh">
      {/* Main column ----------------------------------------------------- */}
      <section className="px-10 pb-16">
        {/* Head + filter chips */}
        <div className="flex items-end justify-between pt-8 pb-6 border-b border-cs-green/10">
          <div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
              {seasonYear ? `S E A S O N  ${seasonYear}` : "—"}
            </div>
            <h1 className="font-display italic text-[42px] leading-none mt-2 text-cs-green -tracking-[0.015em]">
              Ranking
            </h1>
          </div>
          <div className="flex gap-2">
            <Chip on={mode === "open"} onClick={() => setMode("open")}>
              Open
            </Chip>
            <Chip on={mode === "M"} onClick={() => setMode("M")}>
              Men
            </Chip>
            <Chip on={mode === "F"} onClick={() => setMode("F")}>
              Women
            </Chip>
            <select
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="text-[11px] tracking-[0.18em] uppercase px-4 py-2.5 bg-transparent border border-cs-green/20 text-cs-green focus:outline-none focus:border-cs-green"
            >
              <option value="all">By club · All</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Podium */}
        {podium.length >= 3 ? (
          <div className="grid grid-cols-[1fr_1.15fr_1fr] gap-4 items-end bg-gradient-to-b from-cs-ivory to-[#FBF8F0] border border-cs-green/10 px-6 pt-9 pb-7 mt-7">
            <PodiumCard position={2} player={podium[1]} />
            <PodiumCard position={1} player={podium[0]} champion />
            <PodiumCard position={3} player={podium[2]} />
          </div>
        ) : podium.length > 0 ? (
          <div className="flex gap-4 items-end bg-gradient-to-b from-cs-ivory to-[#FBF8F0] border border-cs-green/10 px-6 py-9 mt-7">
            {podium.map((p, i) => (
              <PodiumCard key={p.id} position={i + 1} player={p} champion={i === 0} />
            ))}
          </div>
        ) : null}

        {/* Leaderboard table */}
        <div className="mt-8">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Rank", "Member", "Club", "City", "Win %", "Matches", "Points"].map((h) => (
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
              {filtered.map((p, i) => {
                const isMe = p.id === meId;
                const wr = winRate(p.wins, p.losses);
                return (
                  <tr
                    key={p.id}
                    className={isMe ? "bg-cs-brass/8" : "hover:bg-cs-brass/4"}
                  >
                    <td className="py-3.5 px-3.5 border-b border-cs-green/8 font-display italic text-[15px] text-cs-green whitespace-nowrap">
                      #{i + 1}
                      {isMe && (
                        <span className="ml-2 text-[9px] tracking-[0.2em] uppercase text-cs-brass not-italic font-sans">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-cs-green/8">
                      <Link
                        href={`/app/h2h/${p.id}`}
                        className="flex items-center gap-3 text-cs-green hover:text-cs-brass"
                      >
                        <Avatar url={p.photo_url} seed={p.id} alt={p.full_name ?? ""} size={28} />
                        <span className="text-[13px] font-medium">
                          {p.full_name ?? "—"}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-cs-green/8 text-[12px] text-cs-muted">
                      {clubName(p.home_club_id)}
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-cs-green/8 text-[12px] text-cs-muted">
                      {cityName(p.home_city_id)}
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-cs-green/8 font-display italic text-[15px] text-cs-green">
                      {wr}%
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-cs-green/8 text-[13px] text-cs-green">
                      {p.total_matches}
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-cs-green/8 font-display italic text-[16px] text-cs-green">
                      {p.total_points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-[13px] text-cs-muted py-10 text-center">
              No ranked players match the current filters.
            </p>
          )}
        </div>
      </section>

      {/* Right rail ----------------------------------------------------- */}
      <aside className="border-l border-cs-green/10 bg-[#FBF8F0] px-7 py-10 flex flex-col gap-8">
        <div>
          <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
            Y o u r &nbsp; p o s i t i o n
          </div>
          <div className="flex items-baseline gap-3 mt-3">
            <div className="font-display italic text-[64px] text-cs-green leading-[0.9]">
              {myRank ? `#${myRank}` : "—"}
            </div>
            {myRank && (
              <div className="text-[11px] tracking-[0.14em] uppercase text-cs-muted">
                of {filtered.length}
              </div>
            )}
          </div>
          <hr className="my-5 border-cs-green/10" />
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
                {myRank && myRank > 1 ? `To #${myRank - 1}` : "Lead next"}
              </div>
              <div className="font-display italic text-[24px] text-cs-green leading-none mt-1.5">
                {distanceUp !== null ? `${distanceUp} pts` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
                Over below
              </div>
              <div className="font-display italic text-[24px] text-cs-green leading-none mt-1.5">
                {leadDown !== null ? `${leadDown} pts` : "—"}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-display italic text-[18px] text-cs-green mb-1">
            Category
          </h2>
          {myCategory && meLevel ? (
            <p className="text-[12px] text-cs-muted leading-relaxed">
              Within <b className="text-cs-green">Level {LEVEL_SHORT[meLevel]}</b>{" "}
              you are ranked{" "}
              <b className="text-cs-green">
                {myCategory.position ? `#${myCategory.position}` : "—"} of{" "}
                {myCategory.total}
              </b>
              .
            </p>
          ) : (
            <p className="text-[12px] text-cs-muted">
              Set your level on your profile.
            </p>
          )}
          <div className="grid grid-cols-2 gap-px bg-cs-green/10 border border-cs-green/10 mt-4">
            <RailStat label="Wins" value={me?.wins ?? 0} />
            <RailStat label="Losses" value={me?.losses ?? 0} />
            <RailStat
              label="Activity ×"
              value={me ? me.activity_multiplier.toFixed(2) : "—"}
            />
            <RailStat
              label="Decay"
              value={me ? me.decay_factor.toFixed(2) : "—"}
            />
          </div>
        </div>

        <div>
          <h2 className="font-display italic text-[18px] text-cs-green mb-3">
            Around you
          </h2>
          {myRank ? (
            filtered
              .slice(Math.max(0, myRank - 3), myRank + 2)
              .map((p, i) => {
                const realRank = Math.max(1, myRank - 2) + i;
                const isMe = p.id === meId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0 ${
                      isMe ? "bg-cs-brass/8 -mx-2 px-2" : ""
                    }`}
                  >
                    <span className="w-8 font-display italic text-cs-green text-[15px]">
                      #{realRank}
                    </span>
                    <Avatar url={p.photo_url} seed={p.id} alt={p.full_name ?? ""} size={24} />
                    <span className="flex-1 text-[12px] text-cs-green truncate">
                      {isMe ? "You" : p.full_name ?? "—"}
                    </span>
                    <span className="font-display italic text-[13px] text-cs-brass">
                      {p.total_points}
                    </span>
                  </div>
                );
              })
          ) : (
            <p className="text-[12px] text-cs-muted">
              Play some matches to enter the ranking.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ────────── presentational ────────── */

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] tracking-[0.18em] uppercase px-4 py-2.5 border transition-colors ${
        on
          ? "bg-cs-green text-cs-ivory border-cs-green"
          : "bg-transparent text-cs-green border-cs-green/20 hover:border-cs-green"
      }`}
    >
      {children}
    </button>
  );
}

function PodiumCard({
  position,
  player,
  champion,
}: {
  position: number;
  player: PlayerRow;
  champion?: boolean;
}) {
  return (
    <div
      className={`text-center bg-[#FBF8F0] border px-5 py-7 relative ${
        champion ? "border-cs-brass border-2 -translate-y-3" : "border-cs-green/10"
      }`}
    >
      {champion && (
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-cs-brass text-[18px] leading-none">
          ♛
        </span>
      )}
      <div className="flex justify-center mb-4">
        <Avatar
          url={player.photo_url}
          seed={player.id}
          alt={player.full_name ?? ""}
          size={champion ? 96 : 76}
        />
      </div>
      <div
        className={`font-display italic ${
          champion ? "text-[15px] text-cs-green" : "text-[13px] text-cs-brass"
        } tracking-[0.04em]`}
      >
        {champion ? "CHAMPION" : romanFromNum(position)}
      </div>
      <div className="font-display italic text-[20px] text-cs-green leading-tight mt-3">
        {player.full_name ?? "—"}
      </div>
      <div className="text-[11px] text-cs-muted mt-1">
        {player.headline ?? ""}
      </div>
      <div className="font-display italic text-cs-green text-[42px] leading-none mt-4">
        {player.total_points}
        <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted mt-2 font-sans not-italic">
          POINTS
        </div>
      </div>
    </div>
  );
}

function RailStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#FBF8F0] px-4 py-3.5">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[22px] text-cs-green leading-none mt-2">
        {value}
      </div>
    </div>
  );
}

function romanFromNum(n: number) {
  return n === 1 ? "I" : n === 2 ? "II" : n === 3 ? "III" : String(n);
}
