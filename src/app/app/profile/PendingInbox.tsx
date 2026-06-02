"use client";

import { useTransition } from "react";
import { confirmMatch } from "@/lib/actions/matches";
import {
  acceptGroupInvitation,
  declineGroupInvitation,
} from "@/lib/actions/groups";
import {
  acceptChallenge,
  declineDirectChallenge,
} from "@/lib/actions/challenges";
import { fmtRel } from "@/lib/format";
import {
  FORMAT_LABEL,
  type GroupInvitation,
  type Match,
  type PlayFormat,
  type Profile,
} from "@/lib/types";

export type DirectChallengeInbox = {
  id: string;
  author_id: string;
  author_name: string | null;
  city_name: string;
  format: PlayFormat;
  note: string | null;
  created_at: string;
  expires_at: string;
};

/**
 * Unified "items that need your reply" surface at the top of the Profile page.
 * Covers:
 *  - Match results awaiting your confirmation
 *  - Private group invitations
 *
 * Designed to be discoverable: appears prominently with brass accent,
 * dismisses automatically as items are actioned.
 */
export function PendingInbox({
  matchConfirmations,
  authorById,
  groupInvitations,
  directChallenges,
}: {
  matchConfirmations: Match[];
  authorById: Map<string, Profile>;
  groupInvitations: GroupInvitation[];
  directChallenges: DirectChallengeInbox[];
}) {
  const total =
    matchConfirmations.length +
    groupInvitations.length +
    directChallenges.length;
  const [busy, start] = useTransition();
  if (total === 0) return null;

  return (
    <div className="mx-7 mt-6 mb-2 border border-cs-brass/40">
      <div className="bg-cs-brass/[0.08] px-4 py-2.5 border-b border-cs-brass/30">
        <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass">
          Awaiting your reply
        </div>
        <div className="text-[12px] text-cs-green font-medium mt-0.5">
          {total} {total === 1 ? "item" : "items"}
        </div>
      </div>
      <ul className="divide-y divide-black/10">
        {/* Match confirmations */}
        {matchConfirmations.map((m) => {
          const author = authorById.get(m.author_id);
          const youWon = m.author_result === "L";
          return (
            <li key={m.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] tracking-[0.15em] uppercase text-cs-brass mb-1">
                    Match result · confirm or dispute
                  </div>
                  <div className="text-[12.5px] text-cs-black leading-snug">
                    <strong className="text-cs-green">
                      {author?.full_name ?? "Someone"}
                    </strong>{" "}
                    logged a match vs you — {youWon ? "you won" : "they won"}{" "}
                    <span className="font-display text-cs-green">
                      {(m.score ?? "—").replace(/-/g, "–")}
                    </span>
                  </div>
                  <div className="text-[10px] text-cs-muted mt-0.5">
                    {fmtRel(m.created_at)}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    disabled={busy}
                    onClick={() =>
                      start(() => confirmMatch(m.id, true).then(() => {}))
                    }
                    className="px-3 py-1.5 bg-cs-green text-cs-ivory text-[10px] tracking-wider uppercase"
                  >
                    Confirm
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      start(() => confirmMatch(m.id, false).then(() => {}))
                    }
                    className="px-3 py-1.5 border border-cs-loss text-cs-loss text-[10px] tracking-wider uppercase"
                  >
                    Dispute
                  </button>
                </div>
              </div>
            </li>
          );
        })}

        {/* Group invitations */}
        {groupInvitations.map((inv) => (
          <li key={inv.group_id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[9px] tracking-[0.15em] uppercase text-cs-brass mb-1">
                  Group invitation · accept or decline
                </div>
                <div className="text-[12.5px] text-cs-black leading-snug">
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
                  className="px-3 py-1.5 border border-black/15 text-cs-muted text-[10px] tracking-wider uppercase hover:border-cs-loss hover:text-cs-loss"
                >
                  Decline
                </button>
              </div>
            </div>
          </li>
        ))}

        {/* Direct challenges */}
        {directChallenges.map((ch) => (
          <li key={ch.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[9px] tracking-[0.15em] uppercase text-cs-brass mb-1">
                  Direct challenge · accept or decline
                </div>
                <div className="text-[12.5px] text-cs-black leading-snug">
                  <strong className="text-cs-green">
                    {ch.author_name ?? "A member"}
                  </strong>{" "}
                  challenged you to {FORMAT_LABEL[ch.format]} in{" "}
                  <span className="font-display italic">{ch.city_name}</span>
                </div>
                {ch.note && (
                  <div className="text-[11px] italic text-cs-muted mt-1 border-l-2 border-cs-brass pl-2 leading-snug">
                    &ldquo;{ch.note}&rdquo;
                  </div>
                )}
                <div className="text-[10px] text-cs-muted mt-1">
                  {fmtRel(ch.created_at)}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  disabled={busy}
                  onClick={() =>
                    start(() => acceptChallenge(ch.id).then(() => {}))
                  }
                  className="px-3 py-1.5 bg-cs-green text-cs-ivory text-[10px] tracking-wider uppercase"
                >
                  Accept
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    start(() =>
                      declineDirectChallenge(ch.id).then(() => {}),
                    )
                  }
                  className="px-3 py-1.5 border border-black/15 text-cs-muted text-[10px] tracking-wider uppercase hover:border-cs-loss hover:text-cs-loss"
                >
                  Decline
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
