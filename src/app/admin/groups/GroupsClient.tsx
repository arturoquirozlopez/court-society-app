"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { fmtDate } from "@/lib/format";
import { adminDeleteGroup } from "@/lib/actions/admin";
import type { Profile } from "@/lib/types";

type Row = {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
  creator: Profile | null;
  accepted_members: (Profile | null)[];
  pending_members: (Profile | null)[];
};

export function GroupsAdminClient({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-7 py-16 text-center">
        <div className="font-display italic text-[18px] text-cs-green">
          No private groups yet.
        </div>
        <div className="text-[12px] text-cs-muted mt-2 leading-relaxed">
          Members create groups from the Ranking tab.
        </div>
      </div>
    );
  }

  return (
    <ul>
      {rows.map((g) => (
        <GroupRow key={g.id} g={g} />
      ))}
    </ul>
  );
}

function GroupRow({ g }: { g: Row }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function destroy() {
    if (
      !window.confirm(
        `Delete the group "${g.name}"? This removes it for ${g.accepted_members.length + 1} members. Cannot be undone.`,
      )
    )
      return;
    setMsg(null);
    start(async () => {
      const res = await adminDeleteGroup(g.id);
      if (!res.ok) setMsg(res.error);
    });
  }

  return (
    <li className="border-b border-black/10 px-7 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display italic text-[20px] text-cs-green truncate">
            {g.name}
          </div>
          <div className="text-[11px] text-cs-muted mt-1">
            Created by{" "}
            <strong className="text-cs-black">
              {g.creator?.full_name ?? "—"}
            </strong>{" "}
            · {fmtDate(g.created_at)}
          </div>
          <div className="text-[11px] text-cs-muted mt-0.5">
            {g.accepted_members.length + 1} accepted
            {g.pending_members.length > 0
              ? ` · ${g.pending_members.length} pending`
              : ""}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[10px] tracking-[0.12em] uppercase text-cs-brass hover:text-cs-green"
          >
            {open ? "Hide" : "View"}
          </button>
          <button
            disabled={pending}
            onClick={destroy}
            className="text-[10px] tracking-[0.12em] uppercase text-cs-muted hover:text-cs-loss"
          >
            Delete
          </button>
        </div>
      </div>

      {msg && <p className="text-[12px] text-cs-loss mt-2">{msg}</p>}

      {open && (
        <div className="mt-4 space-y-4">
          <Section title={`Accepted members (${g.accepted_members.length + 1})`}>
            <MemberChip p={g.creator} role="Creator" />
            {g.accepted_members.map((p, i) =>
              p ? <MemberChip key={p.id} p={p} /> : <span key={i} />,
            )}
          </Section>
          {g.pending_members.length > 0 && (
            <Section title={`Pending invitations (${g.pending_members.length})`}>
              {g.pending_members.map((p, i) =>
                p ? (
                  <MemberChip key={p.id} p={p} dim />
                ) : (
                  <span key={i} />
                ),
              )}
            </Section>
          )}
        </div>
      )}
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brass mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MemberChip({
  p,
  role,
  dim,
}: {
  p: Profile | null;
  role?: string;
  dim?: boolean;
}) {
  if (!p) return null;
  return (
    <div
      className={`inline-flex items-center gap-2 border border-black/10 px-2 py-1 ${
        dim ? "opacity-60" : ""
      }`}
    >
      <Avatar url={p.photo_url} seed={p.id} alt={p.full_name ?? ""} size={20} />
      <span className="text-[11px] text-cs-black">{p.full_name}</span>
      {role && (
        <span className="text-[9px] tracking-[0.1em] uppercase text-cs-brass">
          · {role}
        </span>
      )}
    </div>
  );
}
