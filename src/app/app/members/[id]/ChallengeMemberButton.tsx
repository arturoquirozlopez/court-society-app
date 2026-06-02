"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/Sheet";
import { createChallenge } from "@/lib/actions/challenges";
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  type PlayFormat,
  type PlayLevel,
} from "@/lib/types";

type ClubLite = { id: string; name: string; city_id: string };

export function ChallengeMemberButton({
  targetId,
  targetName,
  targetCityId,
  targetClubId,
  meLevel,
  clubs,
}: {
  targetId: string;
  targetName: string;
  targetCityId: string | null;
  targetClubId: string | null;
  meLevel: PlayLevel | null;
  clubs: ClubLite[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [format, setFormat] = useState<PlayFormat>("singles");
  const [level, setLevel] = useState<PlayLevel>(meLevel ?? "intermediate");
  const [clubIds, setClubIds] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const cityClubs = clubs.filter((c) => c.city_id === targetCityId);

  function submit() {
    if (!targetCityId) {
      setError(
        "Their home city isn't set, so we can't direct a challenge to them yet.",
      );
      return;
    }
    setError(null);
    start(async () => {
      const res = await createChallenge({
        city_id: targetCityId,
        level,
        format,
        club_ids: clubIds,
        note,
        target_id: targetId,
      });
      if (!res.ok) setError(res.error);
      else setSent(true);
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setSent(false);
          setError(null);
          setNote("");
          setClubIds(targetClubId ? [targetClubId] : []);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 mt-4 ml-2 bg-cs-green text-cs-ivory text-[10px] tracking-wider uppercase border-b-2 border-cs-brass"
      >
        ⚔ Challenge {targetName.split(" ")[0]}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Challenge ${targetName.split(" ")[0]}`}
        subtitle={`A direct challenge — only ${targetName.split(" ")[0]} will see it. 72-hour window.`}
      >
        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 border border-cs-brass/40 flex items-center justify-center text-[22px] mx-auto mb-4 text-cs-green">
              ⚔
            </div>
            <h3 className="font-display italic text-[22px] text-cs-green mb-2">
              Challenge sent.
            </h3>
            <p className="text-[13px] text-cs-muted leading-relaxed mb-6">
              {targetName.split(" ")[0]} has 72 hours to accept or decline.
              You&rsquo;ll see it on the Challenges tab and they&rsquo;ll get an
              email.
            </p>
            <button onClick={() => setOpen(false)} className="btn-ghost" style={{ marginTop: 0 }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <Field label="Format">
              <div className="flex gap-2">
                {(["singles", "doubles", "both"] as PlayFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`text-[11px] px-3 py-1.5 border ${
                      format === f
                        ? "border-cs-green bg-cs-green text-cs-ivory"
                        : "border-black/10 text-cs-muted"
                    }`}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Suggested level">
              <select
                className="field-input"
                value={level}
                onChange={(e) => setLevel(e.target.value as PlayLevel)}
              >
                {(Object.keys(LEVEL_LABEL) as PlayLevel[]).map((lv) => (
                  <option key={lv} value={lv}>
                    {LEVEL_LABEL[lv]}
                  </option>
                ))}
              </select>
            </Field>

            {cityClubs.length > 0 && (
              <Field label="Preferred clubs (optional)">
                {cityClubs.map((cl) => {
                  const on = clubIds.includes(cl.id);
                  return (
                    <label
                      key={cl.id}
                      className="flex items-center gap-3 py-2 border-b border-black/5 cursor-pointer"
                    >
                      <span
                        className={`w-[18px] h-[18px] border-[1.5px] flex items-center justify-center ${
                          on
                            ? "bg-cs-green border-cs-green text-cs-ivory"
                            : "border-black/20"
                        }`}
                      >
                        {on && "✓"}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() =>
                          setClubIds((prev) =>
                            on
                              ? prev.filter((x) => x !== cl.id)
                              : [...prev, cl.id],
                          )
                        }
                      />
                      <span className="text-[13px]">{cl.name}</span>
                    </label>
                  );
                })}
              </Field>
            )}

            <Field label="Note (optional)">
              <textarea
                className="field-input min-h-[72px] resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Availability, time of day, why now…"
              />
            </Field>

            {error && <p className="text-[12px] text-cs-loss mb-2">{error}</p>}

            <button
              onClick={submit}
              disabled={pending}
              className="btn-primary"
            >
              {pending ? "Sending…" : `Send challenge to ${targetName.split(" ")[0]}`}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="block w-full text-center text-[12px] text-cs-muted py-3.5 mt-1"
            >
              Cancel
            </button>
          </>
        )}
      </Sheet>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
