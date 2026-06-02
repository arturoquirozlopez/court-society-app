"use client";

import { useMemo, useState, useTransition } from "react";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import { logMatch } from "@/lib/actions/matches";
import { FORMAT_LABEL, type PlayFormat } from "@/lib/types";

export type PlayableChallenge = {
  challenge_id: string;
  opponent_id: string;
  opponent_name: string | null;
  opponent_photo: string | null;
  city_name: string;
  format: PlayFormat;
};

export function LogMatchFab({ playable }: { playable: PlayableChallenge[] }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<PlayableChallenge | null>(null);
  const [result, setResult] = useState<"W" | "L" | null>(null);
  const [sets, setSets] = useState<{ a: string; b: string }[]>([
    { a: "", b: "" },
    { a: "", b: "" },
    { a: "", b: "" },
  ]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setSet(i: number, side: "a" | "b", v: string) {
    const cleaned = v.replace(/[^0-9]/g, "").slice(0, 1);
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [side]: cleaned } : s)),
    );
  }

  const score = useMemo(
    () =>
      sets
        .filter((s) => s.a !== "" && s.b !== "")
        .map((s) => `${s.a}-${s.b}`)
        .join(" "),
    [sets],
  );

  const scoreValid = useMemo(() => {
    const completed = sets.filter((s) => s.a !== "" && s.b !== "");
    return completed.length >= 1 && completed.length <= 3;
  }, [sets]);

  function reset() {
    setChosen(null);
    setResult(null);
    setSets([
      { a: "", b: "" },
      { a: "", b: "" },
      { a: "", b: "" },
    ]);
    setNote("");
    setError(null);
  }

  function submit() {
    if (!chosen || !result) return;
    setError(null);
    start(async () => {
      const res = await logMatch({
        challenge_id: chosen.challenge_id,
        author_result: result,
        score,
        note,
      });
      if (!res.ok) setError(res.error);
      else {
        setOpen(false);
        reset();
      }
    });
  }

  const isEmpty = playable.length === 0;

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="fixed bottom-[86px] right-[max(calc(50%-200px),16px)] w-14 h-14 bg-cs-green text-cs-ivory text-2xl flex items-center justify-center shadow-lg z-30"
        aria-label="Log match"
      >
        ＋
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={chosen ? `Log match vs ${chosen.opponent_name?.split(" ")[0] ?? "opponent"}` : "Log a match"}
        subtitle={
          chosen
            ? `${FORMAT_LABEL[chosen.format]} · ${chosen.city_name}`
            : isEmpty
              ? "No accepted challenges yet."
              : "Pick the challenge you played."
        }
      >
        {isEmpty ? (
          <div className="text-center py-8">
            <div className="font-display italic text-[20px] text-cs-green mb-2">
              No challenges to score.
            </div>
            <p className="text-[13px] text-cs-muted leading-relaxed mb-6">
              You can only log a result for a challenge that has been
              accepted. Open the Challenges tab to post one, or challenge a
              member directly from their profile.
            </p>
            <button onClick={() => setOpen(false)} className="btn-ghost" style={{ marginTop: 0 }}>
              Close
            </button>
          </div>
        ) : !chosen ? (
          <>
            <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-2">
              Accepted challenges
            </label>
            <ul className="border border-black/10 mb-2">
              {playable.map((p) => (
                <li key={p.challenge_id}>
                  <button
                    type="button"
                    onClick={() => setChosen(p)}
                    className="flex items-center gap-3 w-full text-left px-3 py-3 border-b border-black/5 hover:bg-cs-green/[0.04]"
                  >
                    <Avatar
                      url={p.opponent_photo}
                      seed={p.opponent_id}
                      alt={p.opponent_name ?? ""}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">
                        vs {p.opponent_name ?? "Member"}
                      </div>
                      <div className="text-[10px] text-cs-muted">
                        {FORMAT_LABEL[p.format]} · {p.city_name}
                      </div>
                    </div>
                    <span className="text-cs-brass">→</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-cs-muted leading-snug mb-4">
              A match must come from an accepted challenge so both players see
              the result and the H2H ranking stays accurate.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="block w-full text-center text-[12px] text-cs-muted py-3.5"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setChosen(null)}
              className="text-[10px] tracking-[0.15em] uppercase text-cs-muted hover:text-cs-black mb-3"
            >
              ← Pick another challenge
            </button>

            <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1">
              Result
            </label>
            <div className="flex gap-2.5 mb-3.5">
              <button
                onClick={() => setResult("W")}
                className={`flex-1 py-3 border-[1.5px] text-[12px] tracking-wider ${
                  result === "W"
                    ? "border-cs-green bg-cs-green text-cs-ivory"
                    : "border-black/10"
                }`}
              >
                Won
              </button>
              <button
                onClick={() => setResult("L")}
                className={`flex-1 py-3 border-[1.5px] text-[12px] tracking-wider ${
                  result === "L"
                    ? "border-cs-loss bg-cs-loss text-white"
                    : "border-black/10"
                }`}
              >
                Lost
              </button>
            </div>

            <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-2 mt-1">
              Score · sets
            </label>
            <div className="space-y-2 mb-4">
              {sets.map((s, i) => {
                const optional = i >= 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-cs-muted w-12">
                      Set {i + 1}
                      {optional ? "*" : ""}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={s.a}
                      onChange={(e) => setSet(i, "a", e.target.value)}
                      placeholder="—"
                      className="w-11 h-11 border border-black/15 text-center text-[18px] font-display text-cs-green focus:border-cs-green outline-none bg-transparent"
                    />
                    <span className="text-[14px] text-cs-muted">–</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={s.b}
                      onChange={(e) => setSet(i, "b", e.target.value)}
                      placeholder="—"
                      className="w-11 h-11 border border-black/15 text-center text-[18px] font-display text-cs-green focus:border-cs-green outline-none bg-transparent"
                    />
                    <span className="text-[10px] text-cs-muted">you · them</span>
                  </div>
                );
              })}
              <div className="text-[10px] text-cs-muted leading-snug">
                * Sets 2 and 3 optional · 0–9 games per set · examples: 6–4 · 6–4 7–5 · 6–4 3–6 9–7
              </div>
              {score && (
                <div className="text-[11px] tracking-[0.1em] uppercase text-cs-brass pt-1">
                  Final: {score.replace(/-/g, "–")}
                </div>
              )}
            </div>

            <textarea
              className="field-input min-h-[60px] resize-none"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && <p className="text-[12px] text-cs-loss mt-2">{error}</p>}

            <button
              onClick={submit}
              disabled={!result || !scoreValid || pending}
              className="btn-primary mt-3.5"
            >
              {pending ? "Saving…" : "Save match"}
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
