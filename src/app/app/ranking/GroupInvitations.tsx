"use client";

import { useTransition } from "react";
import {
  acceptGroupInvitation,
  declineGroupInvitation,
} from "@/lib/actions/groups";
import { fmtRel } from "@/lib/format";
import type { GroupInvitation } from "@/lib/types";

export function GroupInvitations({
  invitations,
}: {
  invitations: GroupInvitation[];
}) {
  const [busy, start] = useTransition();
  if (invitations.length === 0) return null;
  return (
    <div className="border-b border-black/10 bg-cs-brass/[0.06] px-7 py-4">
      <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brass mb-2">
        Group invitations ({invitations.length})
      </div>
      <ul className="space-y-2.5">
        {invitations.map((inv) => (
          <li
            key={inv.group_id}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-[13px] text-cs-black">
                <strong className="text-cs-green">
                  {inv.inviter_name ?? "A member"}
                </strong>{" "}
                invited you to{" "}
                <span className="font-display italic">{inv.group_name}</span>
              </div>
              <div className="text-[10px] text-cs-muted mt-0.5">
                {fmtRel(inv.invited_at)}
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                disabled={busy}
                onClick={() =>
                  start(() =>
                    acceptGroupInvitation(inv.group_id).then(() => {}),
                  )
                }
                className="px-3 py-1.5 bg-cs-green text-cs-ivory text-[10px] tracking-wider uppercase"
              >
                Accept
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  start(() =>
                    declineGroupInvitation(inv.group_id).then(() => {}),
                  )
                }
                className="px-3 py-1.5 border border-black/10 text-cs-muted text-[10px] tracking-wider uppercase hover:border-cs-loss hover:text-cs-loss"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
