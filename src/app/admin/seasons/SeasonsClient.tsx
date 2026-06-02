"use client";

import { useState, useTransition } from "react";
import { fmtDate } from "@/lib/format";
import { openNewSeason } from "@/lib/actions/admin";
import type { MemberRole, Season } from "@/lib/types";

export function SeasonsClient({
  meRole,
  seasons,
  activeStats,
}: {
  meRole: MemberRole;
  seasons: Season[];
  activeStats: { matches: number; players: number };
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const active = seasons.find((s) => s.active);
  const nextYear = (active?.year ?? new Date().getFullYear()) + 1;

  function openNew() {
    setError(null);
    start(async () => {
      const res = await openNewSeason(nextYear);
      if (!res.ok) setError(res.error);
      else setConfirm(false);
    });
  }

  return (
    <div className="px-7 py-6">
      {active && (
        <div className="border-l-2 border-cs-brass bg-cs-green text-cs-ivory px-4 py-4 mb-6">
          <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brassLight mb-1">
            Active season
          </div>
          <div className="font-display text-[24px]">Season {active.year}</div>
          <div className="text-[11px] text-cs-ivory/60 mt-1">
            Opened {fmtDate(active.started_at)} · {activeStats.matches} matches ·{" "}
            {activeStats.players} ranked players
          </div>
        </div>
      )}

      {meRole === "admin" && (
        <div className="border border-black/10 p-4 mb-8">
          <div className="font-display italic text-[18px] text-cs-green mb-1">
            Open Season {nextYear}
          </div>
          <p className="text-[12px] text-cs-muted leading-relaxed">
            Closes the current season and starts a new one. Existing matches are
            archived under the prior season&apos;s id; ranking on the member app
            switches to the new season immediately.
          </p>
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="btn-ghost"
              style={{ marginTop: 14 }}
            >
              Open new season
            </button>
          ) : (
            <div className="flex gap-2 mt-3.5">
              <button
                disabled={pending}
                onClick={openNew}
                className="px-3.5 py-2 bg-cs-green text-cs-ivory text-[10px] tracking-[0.12em] uppercase"
              >
                {pending ? "Opening…" : "Confirm — open Season " + nextYear}
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="px-3.5 py-2 border border-black/10 text-cs-muted text-[10px] tracking-[0.12em] uppercase"
              >
                Cancel
              </button>
            </div>
          )}
          {error && <p className="text-[12px] text-cs-loss mt-2">{error}</p>}
        </div>
      )}

      <h2 className="section-header">All seasons</h2>
      <ul>
        {seasons.map((s) => (
          <li
            key={s.id}
            className="flex justify-between items-center py-3 border-b border-black/5"
          >
            <div>
              <div className="text-[14px] font-medium">Season {s.year}</div>
              <div className="text-[11px] text-cs-muted">
                {fmtDate(s.started_at)}
                {s.ended_at ? ` → ${fmtDate(s.ended_at)}` : " → present"}
              </div>
            </div>
            <span
              className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 ${
                s.active
                  ? "bg-cs-green/[0.1] text-cs-green"
                  : "bg-black/5 text-cs-muted"
              }`}
            >
              {s.active ? "Active" : "Archived"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
