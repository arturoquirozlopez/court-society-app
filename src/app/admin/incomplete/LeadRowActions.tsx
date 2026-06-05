"use client";

import { useState, useTransition } from "react";
import {
  archiveLead,
  markLeadNotInterested,
  sendLeadReminder,
} from "@/lib/actions/leads";

/**
 * Three-action menu for one row of the Incomplete Applications queue:
 *
 *   Send reminder · Mark not interested · Archive
 *
 * The reminder button is disabled while we're inside the 48 h cooldown.
 */
export function LeadRowActions({
  profileId,
  canRemind,
  cooldownHoursLeft,
}: {
  profileId: string;
  canRemind: boolean;
  cooldownHoursLeft: number;
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function reminder() {
    setStatus(null);
    start(async () => {
      const res = await sendLeadReminder(profileId);
      setStatus(res.ok ? "Reminder sent." : res.error);
    });
  }

  function notInterested() {
    if (!confirm("Mark this lead as not interested? They'll disappear from the queue.")) return;
    setStatus(null);
    start(async () => {
      const res = await markLeadNotInterested(profileId);
      setStatus(res.ok ? "Marked not interested." : res.error);
    });
  }

  function archive() {
    if (!confirm("Archive this lead?")) return;
    setStatus(null);
    start(async () => {
      const res = await archiveLead(profileId);
      setStatus(res.ok ? "Archived." : res.error);
    });
  }

  return (
    <div className="flex flex-col gap-1.5 items-end min-w-[180px]">
      <div className="flex gap-2">
        <button
          onClick={reminder}
          disabled={pending || !canRemind}
          className="text-[10px] tracking-[0.18em] uppercase px-3 py-2 bg-cs-green text-cs-ivory disabled:opacity-40 hover:bg-cs-greenLight relative"
        >
          {pending ? "…" : canRemind ? "Send reminder" : `Cooldown · ${cooldownHoursLeft}h`}
          <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-cs-brass" />
        </button>
        <button
          onClick={notInterested}
          disabled={pending}
          className="text-[10px] tracking-[0.18em] uppercase px-3 py-2 border border-cs-loss/40 text-cs-loss hover:bg-cs-loss/5"
        >
          Not interested
        </button>
        <button
          onClick={archive}
          disabled={pending}
          className="text-[10px] tracking-[0.18em] uppercase px-3 py-2 border border-cs-green/15 text-cs-muted hover:text-cs-green hover:border-cs-green/40"
        >
          Archive
        </button>
      </div>
      {status && (
        <p className="text-[10.5px] text-cs-muted italic">{status}</p>
      )}
    </div>
  );
}
