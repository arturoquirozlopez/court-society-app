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
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
        setScore("");
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

        <input
          className="field-input text-center my-3.5"
          placeholder="Score  e.g. 6–4  3–6  7–5"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
        <textarea
          className="field-input min-h-[60px] resize-none"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <p className="text-[12px] text-cs-loss mt-2">{error}</p>}

        <button
          onClick={submit}
          disabled={!rival || !result || pending}
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
