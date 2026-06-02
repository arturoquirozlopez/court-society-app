"use client";

import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { fmtDate } from "@/lib/format";
import type { MemberRole, Profile } from "@/lib/types";
import { setMemberRole } from "@/lib/actions/admin";

export function MembersAdminClient({
  meId,
  meRole,
  members,
  cityById,
  clubById,
}: {
  meId: string;
  meRole: MemberRole;
  members: Profile[];
  cityById: Record<string, { name: string; slug: string }>;
  clubById: Record<string, { name: string; city_id: string; is_other: boolean }>;
}) {
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | MemberRole>("all");
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (filter !== "all" && m.role !== filter) return false;
      if (!needle) return true;
      return (
        (m.full_name ?? "").toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle)
      );
    });
  }, [members, q, filter]);

  function changeRole(profileId: string, role: MemberRole) {
    setMsg(null);
    start(async () => {
      const res = await setMemberRole({ profileId, role });
      if (!res.ok) setMsg(res.error);
    });
  }

  return (
    <div>
      <div className="px-7 py-4 border-b border-black/10 space-y-3">
        <input
          className="field-input"
          placeholder="Search by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {(["all", "member", "steward", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 border whitespace-nowrap ${
                filter === r
                  ? "border-cs-green bg-cs-green text-cs-ivory"
                  : "border-black/10 text-cs-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {msg && <p className="text-[12px] text-cs-loss">{msg}</p>}
      </div>

      <ul>
        {filtered.map((m) => {
          const city = m.home_city_id ? cityById[m.home_city_id]?.name : "—";
          const club = m.home_club_id
            ? clubById[m.home_club_id]?.is_other && m.other_club_name
              ? m.other_club_name
              : clubById[m.home_club_id]?.name
            : "—";
          const isSelf = m.id === meId;
          const targetIsAdmin = m.role === "admin";
          const canChange = !isSelf && (meRole === "admin" || !targetIsAdmin);
          return (
            <li
              key={m.id}
              className="flex items-start gap-3 px-7 py-4 border-b border-black/10"
            >
              <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {m.full_name ?? "—"}
                  {isSelf && (
                    <span className="ml-2 text-[10px] text-cs-brass tracking-wider">YOU</span>
                  )}
                </div>
                <div className="text-[11px] text-cs-muted truncate">
                  {m.email}
                </div>
                <div className="text-[11px] text-cs-muted truncate">
                  {club} · {city} · joined {fmtDate(m.joined_at ?? m.created_at)}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                  <span className="tracking-wider uppercase text-cs-muted">Status</span>
                  <span className="px-2 py-0.5 bg-black/5">{m.status}</span>
                </div>
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.15em] uppercase text-cs-muted text-right mb-1">
                  Role
                </label>
                <select
                  disabled={!canChange || pending}
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as MemberRole)}
                  className="text-[12px] py-1.5 px-2 border border-black/10 bg-cs-ivory disabled:opacity-50"
                >
                  <option value="member">member</option>
                  <option value="steward">steward</option>
                  {meRole === "admin" && <option value="admin">admin</option>}
                </select>
              </div>
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
    </div>
  );
}
