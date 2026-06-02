"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { LEVEL_SHORT, type Profile } from "@/lib/types";

export function MembersClient({
  meId,
  meHomeCityId,
  meHomeClubId,
  members,
  cities,
  clubs,
  visitingByProfile,
}: {
  meId: string;
  meHomeCityId: string | null;
  meHomeClubId: string | null;
  members: Profile[];
  cities: { id: string; name: string }[];
  clubs: { id: string; name: string; city_id: string }[];
  visitingByProfile: Record<string, string>;
}) {
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const clubsForCity = useMemo(
    () => (cityFilter === "all" ? [] : clubs.filter((c) => c.city_id === cityFilter)),
    [clubs, cityFilter],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return members.filter((m) => {
      if (needle && !(m.full_name ?? "").toLowerCase().includes(needle))
        return false;
      if (cityFilter !== "all") {
        const isHome = m.home_city_id === cityFilter;
        const isVisiting = visitingByProfile[m.id] === cityFilter;
        if (!isHome && !isVisiting) return false;
      }
      if (clubFilter !== "all" && m.home_club_id !== clubFilter) return false;
      return true;
    });
  }, [members, cityFilter, clubFilter, visitingByProfile, search]);

  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? "";
  const clubName = (id: string | null) =>
    clubs.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      {/* Name search */}
      <div className="px-7 py-3 border-b border-black/10">
        <input
          className="field-input text-[14px]"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* City filter */}
      <div className="flex gap-1.5 px-7 py-3 overflow-x-auto border-b border-black/10 scrollbar-none">
        <Chip
          active={cityFilter === "all"}
          onClick={() => {
            setCityFilter("all");
            setClubFilter("all");
          }}
        >
          All
        </Chip>
        {cities.map((c) => (
          <Chip
            key={c.id}
            active={cityFilter === c.id}
            mine={c.id === meHomeCityId}
            onClick={() => {
              setCityFilter(c.id);
              setClubFilter("all");
            }}
          >
            {c.name}
            {c.id === meHomeCityId ? " ★" : ""}
          </Chip>
        ))}
      </div>
      {cityFilter !== "all" && (
        <div className="flex gap-1.5 px-7 pt-1 pb-2 overflow-x-auto border-b border-black/10 scrollbar-none">
          <Chip active={clubFilter === "all"} onClick={() => setClubFilter("all")}>
            All clubs
          </Chip>
          {clubsForCity.map((cl) => (
            <Chip
              key={cl.id}
              active={clubFilter === cl.id}
              mine={cl.id === meHomeClubId}
              onClick={() => setClubFilter(cl.id)}
            >
              {cl.name.split(" ").slice(-2).join(" ")}
              {cl.id === meHomeClubId ? " ★" : ""}
            </Chip>
          ))}
        </div>
      )}

      <ul>
        {filtered.map((m) => {
          const visiting = visitingByProfile[m.id];
          const isVisitingSomewhere = visiting && visiting !== m.home_city_id;
          return (
            <li key={m.id}>
              <Link
                href={`/app/members/${m.id}`}
                className="flex items-center gap-3 px-7 py-4 border-b border-black/10 hover:bg-cs-green/[0.02]"
              >
                <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={46} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium truncate">
                      {m.full_name}
                      {m.id === meId ? " (you)" : ""}
                    </span>
                    {isVisitingSomewhere && (
                      <span className="text-[9px] text-cs-brass tracking-[0.08em]">
                        ✈ {cityName(visiting)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-cs-muted mt-0.5 truncate">
                    {m.headline}
                  </div>
                  <div className="text-[10px] text-cs-brass mt-0.5 truncate">
                    {clubName(m.home_club_id)}
                  </div>
                </div>
                <span className="text-[9.5px] tracking-wider uppercase text-cs-muted bg-black/5 px-2 py-0.5">
                  {m.level ? LEVEL_SHORT[m.level] : "—"}
                </span>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-7 py-12 text-center">
            <div className="font-display italic text-[18px] text-cs-green">
              No members match.
            </div>
          </li>
        )}
      </ul>
    </>
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
      className={`text-[9.5px] tracking-[0.13em] uppercase px-3 py-1.5 border whitespace-nowrap transition-colors ${
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
