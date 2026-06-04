"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  LEVEL_SHORT,
  type PlayLevel,
  type Profile,
} from "@/lib/types";
import { linkedinDisplay } from "@/lib/format";

/**
 * Desktop variant of /app/members. Filter rail on the left, 3-col card grid
 * in the centre, contextual right rail with visiting / suggestions /
 * recently admitted. Hidden on mobile — the existing `MembersClient` keeps
 * the phone experience untouched.
 */
export function MembersDesktop({
  meId,
  meLevel,
  meHomeCityId,
  members,
  cities,
  clubs,
  visitingByProfile,
}: {
  meId: string;
  meLevel: PlayLevel | null;
  meHomeCityId: string | null;
  members: Profile[];
  cities: { id: string; name: string }[];
  clubs: { id: string; name: string; city_id: string }[];
  visitingByProfile: Record<string, string>;
}) {
  const [cityFilter, setCityFilter] = useState<Set<string>>(new Set());
  const [clubFilter, setClubFilter] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState<Set<PlayLevel>>(new Set());
  const [search, setSearch] = useState("");

  // Alphabetical sort for filter rails — the chips always feel like a
  // directory, not "newest-first" data.
  const sortedCities = useMemo(
    () => cities.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [cities],
  );
  const sortedClubs = useMemo(
    () => clubs.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [clubs],
  );

  // A visiting plan is only meaningful when the visitor's home city is
  // different from the city they're "visiting". Same-city plans (data
  // hygiene issues) are ignored everywhere in the directory UI.
  const realVisiting = (m: Profile): string | null => {
    const v = visitingByProfile[m.id];
    if (!v) return null;
    if (m.home_city_id && v === m.home_city_id) return null;
    return v;
  };

  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  // Pre-compute counts per filter chip so the rail reads like a directory.
  const cityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) {
      const cid = m.home_city_id;
      if (!cid) continue;
      map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  }, [members]);

  const clubCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) {
      const cid = m.home_club_id;
      if (!cid) continue;
      map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  }, [members]);

  const levelCounts = useMemo(() => {
    const map = new Map<PlayLevel, number>();
    for (const m of members) {
      if (!m.level) continue;
      map.set(m.level, (map.get(m.level) ?? 0) + 1);
    }
    return map;
  }, [members]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (m.id === meId) return false;
      if (q && !(m.full_name ?? "").toLowerCase().includes(q)) return false;
      if (cityFilter.size > 0) {
        const isHome = m.home_city_id && cityFilter.has(m.home_city_id);
        const isVisiting =
          visitingByProfile[m.id] && cityFilter.has(visitingByProfile[m.id]);
        if (!isHome && !isVisiting) return false;
      }
      if (clubFilter.size > 0) {
        if (!m.home_club_id || !clubFilter.has(m.home_club_id)) return false;
      }
      if (levelFilter.size > 0) {
        if (!m.level || !levelFilter.has(m.level)) return false;
      }
      return true;
    });
  }, [members, meId, cityFilter, clubFilter, levelFilter, visitingByProfile, search]);

  // Right-rail data
  const visitingMyCity = useMemo(
    () =>
      members
        .filter(
          (m) =>
            m.id !== meId &&
            meHomeCityId &&
            visitingByProfile[m.id] === meHomeCityId &&
            m.home_city_id !== meHomeCityId,
        )
        .slice(0, 5),
    [members, meId, meHomeCityId, visitingByProfile],
  );

  const suggestedRivals = useMemo(
    () =>
      members
        .filter((m) => m.id !== meId && meLevel && m.level === meLevel)
        .sort(() => 0)
        .slice(0, 4),
    [members, meId, meLevel],
  );

  const newlyAdmitted = useMemo(
    () =>
      members
        .filter((m) => m.id !== meId)
        .slice()
        .sort((a, b) => {
          const da = new Date(a.joined_at ?? a.created_at).getTime();
          const db = new Date(b.joined_at ?? b.created_at).getTime();
          return db - da;
        })
        .slice(0, 4),
    [members, meId],
  );

  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? "";
  const clubName = (id: string | null) =>
    id ? clubs.find((c) => c.id === id)?.name ?? "—" : "—";

  // Only show clubs for cities currently filtered (or all if none),
  // always in alphabetical order.
  const clubsToShow =
    cityFilter.size === 0
      ? sortedClubs
      : sortedClubs.filter((c) => cityFilter.has(c.city_id));

  return (
    <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:min-h-dvh">
      {/* Main column ----------------------------------------------------- */}
      <section className="px-10 pb-16">
        {/* Page head */}
        <div className="flex items-end justify-between pt-8 pb-6 border-b border-cs-green/10">
          <div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
              D i r e c t o r y
            </div>
            <h1 className="font-display italic text-[42px] leading-none mt-2 text-cs-green -tracking-[0.015em]">
              Members
            </h1>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-64 px-4 py-2.5 bg-transparent border border-cs-green/20 text-[13px] focus:outline-none focus:border-cs-green"
          />
        </div>

        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-8 mt-8">
          {/* Filter rail */}
          <div className="border-r border-cs-green/10 pr-7 flex flex-col gap-7">
            <FilterGroup title="City">
              {sortedCities.map((c) => (
                <FilterChip
                  key={c.id}
                  on={cityFilter.has(c.id)}
                  count={cityCounts.get(c.id) ?? 0}
                  onToggle={() => setCityFilter((s) => toggle(s, c.id))}
                  label={c.name}
                />
              ))}
            </FilterGroup>
            <FilterGroup title="Club">
              {clubsToShow.slice(0, 12).map((c) => (
                <FilterChip
                  key={c.id}
                  on={clubFilter.has(c.id)}
                  count={clubCounts.get(c.id) ?? 0}
                  onToggle={() => setClubFilter((s) => toggle(s, c.id))}
                  label={c.name}
                />
              ))}
            </FilterGroup>
            <FilterGroup title="Level">
              {(Object.keys(LEVEL_SHORT) as PlayLevel[]).map((lvl) => (
                <FilterChip
                  key={lvl}
                  on={levelFilter.has(lvl)}
                  count={levelCounts.get(lvl) ?? 0}
                  onToggle={() => setLevelFilter((s) => toggle(s, lvl))}
                  label={LEVEL_SHORT[lvl]}
                />
              ))}
            </FilterGroup>
            {(cityFilter.size + clubFilter.size + levelFilter.size > 0 ||
              search) && (
              <button
                onClick={() => {
                  setCityFilter(new Set());
                  setClubFilter(new Set());
                  setLevelFilter(new Set());
                  setSearch("");
                }}
                className="text-[10px] tracking-[0.2em] uppercase text-cs-brass hover:text-cs-green text-left"
              >
                Clear filters →
              </button>
            )}
          </div>

          {/* Member grid */}
          <div>
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
                {filtered.length} {filtered.length === 1 ? "member" : "members"}
                {cities.length ? ` · ${cities.length} cities` : ""}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
                Sort · A → Z
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="text-[13px] text-cs-muted mt-10">
                No members match the current filters.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {filtered.map((m) => {
                  const visiting = realVisiting(m);
                  const li = linkedinDisplay(m.linkedin_url);
                  return (
                    <Link
                      key={m.id}
                      href={`/app/members/${m.id}`}
                      className="relative bg-[#FBF8F0] border border-cs-green/10 p-6 flex flex-col gap-4 hover:border-cs-brass transition-colors group min-h-[220px]"
                    >
                      {/* Visiting badge — only when visiting a *different*
                          city than home */}
                      {visiting && (
                        <span className="absolute top-5 right-5 text-[9px] tracking-[0.2em] uppercase text-cs-brass border border-cs-brass px-2 py-0.5 bg-[#FBF8F0]">
                          Visiting {cityName(visiting)}
                        </span>
                      )}

                      {/* Top row — large avatar + name + headline */}
                      <div className={`flex items-start gap-4 ${visiting ? "pr-32" : ""}`}>
                        <Avatar
                          url={m.photo_url}
                          seed={m.id}
                          alt={m.full_name ?? ""}
                          size={64}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-display italic text-[20px] text-cs-green leading-tight truncate group-hover:text-cs-brass"
                            title={m.full_name ?? ""}
                          >
                            {m.full_name ?? "—"}
                          </div>
                          {m.headline && (
                            <div
                              className="text-[12px] text-cs-muted line-clamp-2 mt-1.5 leading-snug"
                              title={m.headline}
                            >
                              {m.headline}
                            </div>
                          )}
                          <div className="text-[10px] tracking-[0.22em] uppercase text-cs-brass mt-2.5 truncate">
                            {cityName(m.home_city_id ?? "") || "—"}
                          </div>
                        </div>
                      </div>

                      {/* Details rows — full club + level label */}
                      <div className="mt-auto pt-4 border-t border-dashed border-cs-green/15 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
                        <DetailRow label="Club" value={clubName(m.home_club_id)} />
                        <DetailRow
                          label="Level"
                          value={m.level ? LEVEL_LABEL[m.level] : "—"}
                        />
                        <DetailRow
                          label="Format"
                          value={m.format ? FORMAT_LABEL[m.format] : "—"}
                        />
                        <DetailRow
                          label="Member since"
                          value={memberSince(m.joined_at ?? m.created_at)}
                        />
                        {li && (
                          <div className="col-span-2">
                            <div className="text-[9px] tracking-[0.2em] uppercase text-cs-muted mb-0.5">
                              LinkedIn
                            </div>
                            <span
                              className="text-[12px] text-cs-green underline decoration-cs-brass underline-offset-2 truncate block"
                              title={li.label}
                            >
                              {li.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Right rail ----------------------------------------------------- */}
      <aside className="border-l border-cs-green/10 bg-[#FBF8F0] px-7 py-10 flex flex-col gap-8">
        <div>
          <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
            T h i s &nbsp; w e e k
          </div>
          <h2 className="font-display italic text-[18px] text-cs-green mt-2 mb-3">
            Visiting your city
          </h2>
          {visitingMyCity.length === 0 ? (
            <p className="text-[12px] text-cs-muted">
              No members visiting{" "}
              {meHomeCityId ? cityName(meHomeCityId) : "your city"} right now.
            </p>
          ) : (
            visitingMyCity.map((m) => (
              <Link
                key={m.id}
                href={`/app/members/${m.id}`}
                className="flex items-center gap-3 py-2.5 border-b border-dashed border-cs-green/10 last:border-b-0 hover:bg-cs-ivory/60 -mx-2 px-2"
              >
                <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-cs-green truncate">
                    {m.full_name ?? "—"}
                  </div>
                  <div className="text-[10px] tracking-[0.16em] uppercase text-cs-brass">
                    From {cityName(m.home_city_id ?? "") || "—"}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div>
          <h2 className="font-display italic text-[18px] text-cs-green mb-1">
            Suggested rivals
          </h2>
          <p className="text-[11px] text-cs-muted mb-3">
            Members at your level.
          </p>
          {suggestedRivals.length === 0 ? (
            <p className="text-[12px] text-cs-muted">
              Set your level on your profile to surface matches here.
            </p>
          ) : (
            suggestedRivals.map((m) => (
              <Link
                key={m.id}
                href={`/app/members/${m.id}`}
                className="flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0 hover:bg-cs-ivory/60 -mx-2 px-2"
              >
                <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-cs-green truncate">
                    {m.full_name ?? "—"}
                  </div>
                  <div className="text-[10px] text-cs-muted truncate">
                    {clubName(m.home_club_id)} · {cityName(m.home_city_id ?? "")}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div>
          <h2 className="font-display italic text-[18px] text-cs-green mb-3">
            Newly admitted
          </h2>
          {newlyAdmitted.map((m) => (
            <Link
              key={m.id}
              href={`/app/members/${m.id}`}
              className="flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0 hover:bg-cs-ivory/60 -mx-2 px-2"
            >
              <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-cs-green truncate">
                  {m.full_name ?? "—"}
                </div>
                <div className="text-[10px] text-cs-muted">
                  {fmtMonth(m.joined_at ?? m.created_at)} ·{" "}
                  {cityName(m.home_city_id ?? "")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ────────── helpers ────────── */

function fmtMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function memberSince(iso: string) {
  return fmtMonth(iso);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] tracking-[0.2em] uppercase text-cs-muted mb-0.5">
        {label}
      </div>
      <div className="text-[12px] text-cs-green truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[10px] tracking-[0.22em] uppercase text-cs-muted mb-3 font-medium">
        {title}
      </h4>
      <div>{children}</div>
    </div>
  );
}

function FilterChip({
  on,
  count,
  onToggle,
  label,
}: {
  on: boolean;
  count: number;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex justify-between items-center py-1.5 text-[13px] border-b border-cs-green/8 last:border-b-0 text-left transition-colors ${
        on ? "text-cs-green" : "text-cs-black/70 hover:text-cs-green"
      }`}
    >
      <span>
        {on && <span className="text-cs-brass mr-1 -ml-0.5">·</span>}
        {label}
      </span>
      <span className="font-display italic text-[11px] text-cs-muted">
        {count}
      </span>
    </button>
  );
}
