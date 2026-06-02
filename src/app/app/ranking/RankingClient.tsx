"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { winRate } from "@/lib/format";
import { LEVEL_SHORT, type PlayLevel, type Profile } from "@/lib/types";

type PlayerRow = Profile & { wins: number; losses: number };

export function RankingClient({
  meId,
  meCityId,
  meClubId,
  meLevel,
  players,
  cities,
  clubs,
  visitingByProfile,
}: {
  meId: string;
  meCityId: string | null;
  meClubId: string | null;
  meLevel: PlayLevel | null;
  players: PlayerRow[];
  cities: { id: string; name: string }[];
  clubs: { id: string; name: string; city_id: string }[];
  visitingByProfile: Record<string, string>;
}) {
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");

  const cityClubs = useMemo(
    () => (cityFilter === "all" ? [] : clubs.filter((c) => c.city_id === cityFilter)),
    [clubs, cityFilter],
  );

  const filtered = useMemo(() => {
    return players
      .filter((p) => {
        if (cityFilter !== "all") {
          if (p.home_city_id !== cityFilter && visitingByProfile[p.id] !== cityFilter)
            return false;
        }
        if (levelFilter !== "all" && p.level !== levelFilter) return false;
        if (clubFilter !== "all" && p.home_club_id !== clubFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const wa = winRate(a.wins, a.losses);
        const wb = winRate(b.wins, b.losses);
        if (wa !== wb) return wb - wa;
        return b.wins + b.losses - (a.wins + a.losses);
      });
  }, [players, cityFilter, levelFilter, clubFilter, visitingByProfile]);

  return (
    <>
      <Row>
        <Chip active={cityFilter === "all"} onClick={() => { setCityFilter("all"); setClubFilter("all"); }}>All</Chip>
        {cities.map((c) => (
          <Chip
            key={c.id}
            active={cityFilter === c.id}
            mine={c.id === meCityId}
            onClick={() => { setCityFilter(c.id); setClubFilter("all"); }}
          >
            {c.name}
            {c.id === meCityId ? " ★" : ""}
          </Chip>
        ))}
      </Row>
      <Row>
        <Chip active={levelFilter === "all"} onClick={() => setLevelFilter("all")}>
          All levels
        </Chip>
        {(Object.keys(LEVEL_SHORT) as PlayLevel[]).map((lv) => (
          <Chip
            key={lv}
            active={levelFilter === lv}
            mine={lv === meLevel}
            onClick={() => setLevelFilter(lv)}
          >
            {LEVEL_SHORT[lv]}
            {lv === meLevel ? " ★" : ""}
          </Chip>
        ))}
      </Row>
      {cityFilter !== "all" && (
        <Row>
          <Chip active={clubFilter === "all"} onClick={() => setClubFilter("all")}>
            All clubs
          </Chip>
          {cityClubs.map((cl) => (
            <Chip
              key={cl.id}
              active={clubFilter === cl.id}
              mine={cl.id === meClubId}
              onClick={() => setClubFilter(cl.id)}
            >
              {cl.name.split(" ").slice(-2).join(" ")}
              {cl.id === meClubId ? " ★" : ""}
            </Chip>
          ))}
        </Row>
      )}

      <ul>
        {filtered.map((p, i) => (
          <li key={p.id}>
            <Link
              href={`/app/members/${p.id}`}
              className={`flex items-center gap-3.5 px-7 py-4 border-b border-black/10 hover:bg-cs-green/[0.02] ${
                p.id === meId ? "bg-cs-brass/[0.06] border-l-[3px] border-l-cs-brass" : ""
              }`}
            >
              <span
                className={`font-display text-[22px] min-w-[32px] text-right ${
                  i < 3 ? "text-cs-brass" : "text-cs-green"
                }`}
              >
                {i + 1}
              </span>
              <Avatar url={p.photo_url} seed={p.id} alt={p.full_name ?? ""} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {p.id === meId ? "You" : p.full_name}
                </div>
                <div className="text-[10px] text-cs-muted mt-0.5 truncate">
                  {clubs.find((c) => c.id === p.home_club_id)?.name ?? "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-[20px] text-cs-green">
                  {winRate(p.wins, p.losses)}%
                </div>
                <div className="text-[10px] text-cs-muted mt-0.5">
                  {p.wins}W {p.losses}L
                </div>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-7 py-12 text-center">
            <div className="font-display italic text-[18px] text-cs-green">
              No players match.
            </div>
          </li>
        )}
      </ul>
    </>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5 px-7 py-3 overflow-x-auto border-b border-black/10 scrollbar-none">
      {children}
    </div>
  );
}

function Chip({
  active,
  mine,
  onClick,
  children,
}: {
  active: boolean;
  mine?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[9px] tracking-[0.12em] uppercase px-3 py-1.5 border whitespace-nowrap transition-colors ${
        active
          ? "border-cs-green bg-cs-green text-cs-ivory"
          : mine
            ? "border-cs-brass text-cs-brass"
            : "border-black/10 text-cs-muted hover:text-cs-black"
      }`}
    >
      {children}
    </button>
  );
}
