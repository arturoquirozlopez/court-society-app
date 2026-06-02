"use client";

import { useTransition } from "react";
import { cancelNomination } from "@/lib/actions/nominations";
import { fmtRel } from "@/lib/format";
import type { Nomination } from "@/lib/types";

const STATUS_LABEL: Record<Nomination["status"], string> = {
  pending: "Awaiting application",
  applied: "Applied · under review",
  approved: "Approved",
  declined: "Not accepted",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function MyNominations({ rows }: { rows: Nomination[] }) {
  const [pending, start] = useTransition();
  if (rows.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="section-header">Your nominations ({rows.length})</h2>
      <ul>
        {rows.map((n) => (
          <li
            key={n.id}
            className="flex items-start justify-between gap-3 py-3 border-b border-black/5"
          >
            <div className="min-w-0">
              <div className="text-[13px] font-medium truncate">
                {n.nominee_name}
              </div>
              <div className="text-[11px] text-cs-muted truncate">
                {n.nominee_email}
              </div>
              <div className="text-[10px] text-cs-brass tracking-[0.06em] uppercase mt-1">
                {STATUS_LABEL[n.status]} · {fmtRel(n.created_at)}
              </div>
            </div>
            {n.status === "pending" && (
              <button
                disabled={pending}
                onClick={() =>
                  start(() => cancelNomination(n.id).then(() => {}))
                }
                className="text-[10px] tracking-[0.1em] uppercase text-cs-muted hover:text-cs-loss"
              >
                Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
