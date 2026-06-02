"use client";

import { useTransition } from "react";
import { confirmMatch } from "@/lib/actions/matches";
import type { Match, Profile } from "@/lib/types";

export function PendingConfirmations({
  pending,
  authorById,
}: {
  pending: Match[];
  authorById: Map<string, Profile>;
}) {
  const [busy, start] = useTransition();
  return (
    <div className="mb-6">
      <h2 className="section-header">Pending confirmations ({pending.length})</h2>
      {pending.map((m) => {
        const author = authorById.get(m.author_id);
        // From my POV: if author won, I lost. Flip the language.
        const youWon = m.author_result === "L";
        return (
          <div
            key={m.id}
            className="flex items-start justify-between gap-3 px-4 py-3 mb-2 bg-cs-brass/[0.08] border-l-2 border-cs-brass"
          >
            <div className="text-[12px] text-cs-black">
              {author?.full_name ?? "Someone"} logged a match vs you —{" "}
              {youWon ? "you won" : "they won"} {m.score ?? ""}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                disabled={busy}
                onClick={() => start(() => confirmMatch(m.id, true).then(() => {}))}
                className="px-3 py-1.5 bg-cs-green text-cs-ivory text-[10px] tracking-[0.1em] uppercase"
              >
                Confirm
              </button>
              <button
                disabled={busy}
                onClick={() => start(() => confirmMatch(m.id, false).then(() => {}))}
                className="px-3 py-1.5 border border-cs-loss text-cs-loss text-[10px] tracking-[0.1em] uppercase"
              >
                Dispute
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
