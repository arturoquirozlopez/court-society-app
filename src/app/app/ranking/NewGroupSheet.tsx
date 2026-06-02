"use client";

import { useMemo, useState, useTransition } from "react";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import { createGroup } from "@/lib/actions/groups";

type Pickable = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  home_club_id: string | null;
};

export function NewGroupSheet({
  open,
  onClose,
  meId,
  candidates,
  clubName,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  meId: string;
  candidates: Pickable[];
  clubName: (clubId: string | null) => string;
  onCreated?: () => void;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return candidates
      .filter((c) => c.id !== meId)
      .filter((c) => !needle || (c.full_name ?? "").toLowerCase().includes(needle));
  }, [candidates, meId, search]);

  function toggle(id: string) {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createGroup({
        name: name.trim(),
        member_ids: selected,
      });
      if (!res.ok) setError(res.error);
      else {
        setName("");
        setSelected([]);
        setSearch("");
        onCreated?.();
        onClose();
      }
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New private group"
      subtitle="A ranking scoped to a circle you choose."
    >
      <div className="mb-5">
        <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
          Group name
        </label>
        <input
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Polo Club regulars"
          autoFocus
        />
      </div>

      <div className="mb-3">
        <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
          Members ({selected.length} selected)
        </label>
        <input
          className="field-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
        />
      </div>

      <div className="max-h-[300px] overflow-y-auto mb-4 -mx-1">
        {list.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="flex items-center gap-3 px-1 py-2.5 border-b border-black/5 w-full text-left"
            >
              <Avatar url={p.photo_url} seed={p.id} alt={p.full_name ?? ""} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {p.full_name ?? "—"}
                </div>
                <div className="text-[10px] text-cs-muted truncate">
                  {clubName(p.home_club_id)}
                </div>
              </div>
              <span
                className={`w-[18px] h-[18px] border-[1.5px] flex items-center justify-center flex-shrink-0 ${
                  on
                    ? "bg-cs-green border-cs-green text-cs-ivory"
                    : "border-black/20"
                }`}
              >
                {on && "✓"}
              </span>
            </button>
          );
        })}
        {list.length === 0 && (
          <p className="py-6 text-center text-[12px] text-cs-muted">
            No members match.
          </p>
        )}
      </div>

      {error && <p className="text-[12px] text-cs-loss mb-2">{error}</p>}

      <button
        onClick={submit}
        disabled={
          pending || name.trim().length < 2 || selected.length === 0
        }
        className="btn-primary"
      >
        {pending ? "Creating…" : `Create group · ${selected.length + 1} members`}
      </button>
      <button
        onClick={onClose}
        className="block w-full text-center text-[12px] text-cs-muted py-3.5 mt-1"
      >
        Cancel
      </button>
    </Sheet>
  );
}
