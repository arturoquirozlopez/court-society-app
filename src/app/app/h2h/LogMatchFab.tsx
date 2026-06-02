"use client";

import { useMemo, useState, useTransition } from "react";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import { logMatch } from "@/lib/actions/matches";

type Member = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  home_city_id: string | null;
  home_club_id: string | null;
};

type Filter = "myclub" | "mycity" | "all";

export function LogMatchFab({
  meHomeCityId,
  meHomeClubId,
  allMembers,
}: {
  meHomeCityId: string | null;
  meHomeClubId: string | null;
  allMembers: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("myclub");
  const [rival, setRival] = useState<Member | null>(null);
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
    // accept a single digit 0-9
    const cleaned = v.replace(/[^0-9]/g, "").slice(0, 1);
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [side]: cleaned } : s)));
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

  const filtered = useMemo(() => {
    return allMembers.filter((m) => {
      if (filter === "myclub") return m.home_club_id && m.home_club_id === meHomeClubId;
      if (filter === "mycity") return m.home_city_id && m.home_city_id === meHomeCityId;
      return true;
    });
  }, [filter, allMembers, meHomeCityId, meHomeClubId]);

  function submit() {
    if (!rival || !result) return;
    setError(null);
    start(async () => {
      const res = await logMatch({
        opponent_id: rival.id,
        author_result: result,
        score,
        note,
      });
      if (!res.ok) setError(res.error);
      else {
        setOpen(false);
        setRival(null);
        setResult(null);
        setSets([
          { a: "", b: "" },
          { a: "", b: "" },
          { a: "", b: "" },
        ]);
        setNote("");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[86px] right-[max(calc(50%-200px),16px)] w-14 h-14 bg-cs-green text-cs-ivory text-2xl flex items-center justify-center shadow-lg z-30"
        aria-label="Log match"
      >
        ＋
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Log a match"
        subtitle="Select opponent, result, and score."
      >
        <div className="flex gap-1.5 mb-3.5">
          {(
            [
              ["myclub", "My club ★"],
              ["mycity", "My city"],
              ["all", "All"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`text-[9px] tracking-[0.12em] uppercase px-3 py-1.5 border whitespace-nowrap ${
                filter === v
                  ? "border-cs-green bg-cs-green text-cs-ivory"
                  : "border-black/10 text-cs-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="max-h-[260px] overflow-y-auto mb-4">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setRival(m)}
              className="flex items-center gap-3 py-3 border-b border-black/10 w-full text-left"
            >
              <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{m.full_name}</div>
              </div>
              <span
                className={`w-5 h-5 border-[1.5px] rounded-full flex items-center justify-center ${
                  rival?.id === m.id ? "border-cs-green" : "border-black/20"
                }`}
              >
                {rival?.id === m.id && (
                  <span className="w-2 h-2 rounded-full bg-cs-green" />
                )}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-[12px] text-cs-muted">
              No members in this filter.
            </p>
          )}
        </div>

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
                <span className="text-[10px] text-cs-muted">
                  {result === "W" ? "you · them" : "you · them"}
                </span>
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
          disabled={!rival || !result || !scoreValid || pending}
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
      </Sheet>
    </>
  );
}
