"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { winRate } from "@/lib/format";
import {
  LEVEL_SHORT,
  type GroupWithContext,
  type PlayLevel,
  type Profile,
} from "@/lib/types";
import { NewGroupSheet } from "./NewGroupSheet";
import { deleteGroup, leaveGroup } from "@/lib/actions/groups";

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
  groups,
}: {
  meId: string;
  meCityId: string | null;
  meClubId: string | null;
  meLevel: PlayLevel | null;
  players: PlayerRow[];
  cities: { id: string; name: string }[];
  clubs: { id: string; name: string; city_id: string }[];
  visitingByProfile: Record<string, string>;
  groups: GroupWithContext[];
}) {
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const cityClubs = useMemo(
    () =>
      cityFilter === "all"
        ? []
        : clubs.filter((c) => c.city_id === cityFilter),
    [clubs, cityFilter],
  );

  const selectedGroup = useMemo(
    () => (groupId ? groups.find((g) => g.id === groupId) ?? null : null),
    [groups, groupId],
  );

  const filtered = useMemo(() => {
    let list = players;

    if (selectedGroup) {
      const idSet = new Set(selectedGroup.member_ids);
      list = list.filter((p) => idSet.has(p.id));
    } else {
      list = list.filter((p) => {
        if (cityFilter !== "all") {
          if (
            p.home_city_id !== cityFilter &&
            visitingByProfile[p.id] !== cityFilter
          )
            return false;
        }
        if (levelFilter !== "all" && p.level !== levelFilter) return false;
        if (clubFilter !== "all" && p.home_club_id !== clubFilter) return false;
        return true;
      });
    }

    return list.sort((a, b) => {
      const wa = winRate(a.wins, a.losses);
      const wb = winRate(b.wins, b.losses);
      if (wa !== wb) return wb - wa;
      return b.wins + b.losses - (a.wins + a.losses);
    });
  }, [
    players,
    selectedGroup,
    cityFilter,
    levelFilter,
    clubFilter,
    visitingByProfile,
  ]);

  const clubName = (id: string | null) =>
    clubs.find((c) => c.id === id)?.name ?? "";

  function leaveOrDelete() {
    if (!selectedGroup) return;
    const confirmText = selectedGroup.is_creator
      ? `Delete group "${selectedGroup.name}"? This can't be undone.`
      : `Leave "${selectedGroup.name}"?`;
    if (!window.confirm(confirmText)) return;
    setMsg(null);
    start(async () => {
      const res = selectedGroup.is_creator
        ? await deleteGroup(selectedGroup.id)
        : await leaveGroup(selectedGroup.id);
      if (!res.ok) setMsg(res.error);
      else setGroupId(null);
    });
  }

  return (
    <>
      {/* Groups row — always rendered, even when empty */}
      <div className="flex gap-1.5 px-7 py-3 overflow-x-auto border-b border-black/10 scrollbar-none items-center">
        <button
          onClick={() => setNewGroupOpen(true)}
          className="text-[9px] tracking-[0.12em] uppercase px-3 py-1.5 border border-cs-brass text-cs-brass whitespace-nowrap hover:bg-cs-brass hover:text-cs-ivory transition-colors"
        >
          + New group
        </button>
        {groups.length > 0 && (
          <Chip active={groupId === null} onClick={() => setGroupId(null)}>
            All members
          </Chip>
        )}
        {groups.map((g) => (
          <Chip
            key={g.id}
            active={groupId === g.id}
            onClick={() => setGroupId(g.id)}
          >
            {g.name}
            {g.is_creator ? " ★" : ""}
          </Chip>
        ))}
      </div>

      {/* Group header bar when a group is selected */}
      {selectedGroup && (
        <div className="px-7 py-3 border-b border-black/10 flex items-center justify-between gap-3 bg-cs-brass/[0.06]">
          <div className="min-w-0">
            <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brass">
              Private group
            </div>
            <div className="font-display italic text-[18px] text-cs-green truncate">
              {selectedGroup.name}
            </div>
            <div className="text-[10px] text-cs-muted mt-0.5">
              {selectedGroup.member_ids.length} members
            </div>
          </div>
          <button
            disabled={busy}
            onClick={leaveOrDelete}
            className="text-[10px] tracking-[0.1em] uppercase text-cs-muted hover:text-cs-loss"
          >
            {selectedGroup.is_creator ? "Delete" : "Leave"}
          </button>
        </div>
      )}

      {msg && (
        <p className="px-7 py-2 text-[12px] text-cs-loss">{msg}</p>
      )}

      {/* Regular filters — hidden while a group is selected */}
      {!selectedGroup && (
        <>
          <Row>
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
                mine={c.id === meCityId}
                onClick={() => {
                  setCityFilter(c.id);
                  setClubFilter("all");
                }}
              >
                {c.name}
                {c.id === meCityId ? " ★" : ""}
              </Chip>
            ))}
          </Row>
          <Row>
            <Chip
              active={levelFilter === "all"}
              onClick={() => setLevelFilter("all")}
            >
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
              <Chip
                active={clubFilter === "all"}
                onClick={() => setClubFilter("all")}
              >
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
        </>
      )}

      <ul>
        {filtered.map((p, i) => (
          <li key={p.id}>
            <Link
              href={`/app/members/${p.id}`}
              className={`flex items-center gap-3.5 px-7 py-4 border-b border-black/10 hover:bg-cs-green/[0.02] ${
                p.id === meId
                  ? "bg-cs-brass/[0.06] border-l-[3px] border-l-cs-brass"
                  : ""
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
              {selectedGroup
                ? "No matches played in this group yet."
                : "No players match."}
            </div>
          </li>
        )}
      </ul>

      <NewGroupSheet
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        meId={meId}
        candidates={players.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          photo_url: p.photo_url,
          home_club_id: p.home_club_id,
        }))}
        clubName={clubName}
      />
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
