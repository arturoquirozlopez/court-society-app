"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createCity,
  createClub,
  updateCity,
  updateClub,
} from "@/lib/actions/admin";
import type { City, Club } from "@/lib/types";

export function LocationsClient({
  cities,
  clubs,
}: {
  cities: City[];
  clubs: Club[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [newCity, setNewCity] = useState("");
  const [newClubName, setNewClubName] = useState("");
  const [newClubCityId, setNewClubCityId] = useState<string>(
    cities[0]?.id ?? "",
  );

  const clubsByCity = useMemo(() => {
    const m = new Map<string, Club[]>();
    for (const c of clubs) {
      const arr = m.get(c.city_id) ?? [];
      arr.push(c);
      m.set(c.city_id, arr);
    }
    return m;
  }, [clubs]);

  function addCity() {
    if (newCity.trim().length < 2) return;
    setMsg(null);
    start(async () => {
      const res = await createCity({ name: newCity.trim() });
      if (!res.ok) setMsg(res.error);
      else setNewCity("");
    });
  }

  function toggleCityActive(c: City) {
    start(async () => {
      const res = await updateCity(c.id, { active: !c.active });
      if (!res.ok) setMsg(res.error);
    });
  }

  function renameCity(c: City, name: string) {
    if (name.trim().length < 2 || name.trim() === c.name) return;
    start(async () => {
      const res = await updateCity(c.id, { name: name.trim() });
      if (!res.ok) setMsg(res.error);
    });
  }

  function addClub() {
    if (newClubName.trim().length < 2 || !newClubCityId) return;
    setMsg(null);
    start(async () => {
      const res = await createClub({
        city_id: newClubCityId,
        name: newClubName.trim(),
      });
      if (!res.ok) setMsg(res.error);
      else setNewClubName("");
    });
  }

  function toggleClubActive(c: Club) {
    start(async () => {
      const res = await updateClub(c.id, { active: !c.active });
      if (!res.ok) setMsg(res.error);
    });
  }

  function renameClub(c: Club, name: string) {
    if (name.trim().length < 2 || name.trim() === c.name) return;
    start(async () => {
      const res = await updateClub(c.id, { name: name.trim() });
      if (!res.ok) setMsg(res.error);
    });
  }

  return (
    <div className="px-7 py-5 space-y-8">
      <p className="text-[12px] text-cs-muted leading-relaxed">
        Deactivating a city or club hides it from the application form and
        member directory filters, but keeps existing members&apos; references
        intact. Renaming is propagated everywhere.
      </p>
      {msg && (
        <p className="text-[12px] text-cs-loss border-l-2 border-cs-loss pl-3">
          {msg}
        </p>
      )}

      {/* CITIES */}
      <section>
        <h2 className="section-header">Cities ({cities.length})</h2>
        <ul className="mb-3">
          {cities.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 py-2 border-b border-black/5"
            >
              <EditableText value={c.name} onCommit={(v) => renameCity(c, v)} />
              <span className="text-[10px] text-cs-muted">/{c.slug}</span>
              <span className="ml-auto" />
              <span className="text-[10px] text-cs-muted">
                {clubsByCity.get(c.id)?.length ?? 0} clubs
              </span>
              <ToggleActive
                active={c.active}
                disabled={pending}
                onClick={() => toggleCityActive(c)}
              />
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className="field-input flex-1"
            placeholder="Add a new city — e.g. Buenos Aires"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
          />
          <button
            onClick={addCity}
            disabled={pending || newCity.trim().length < 2}
            className="px-4 py-2 bg-cs-green text-cs-ivory text-[10px] tracking-[0.12em] uppercase whitespace-nowrap"
          >
            Add city
          </button>
        </div>
      </section>

      {/* CLUBS */}
      <section>
        <h2 className="section-header">Clubs ({clubs.length})</h2>
        {cities.map((city) => {
          const list = clubsByCity.get(city.id) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={city.id} className="mb-5">
              <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brass mb-2">
                {city.name}
              </div>
              <ul>
                {list.map((cl) => (
                  <li
                    key={cl.id}
                    className="flex items-center gap-3 py-2 border-b border-black/5"
                  >
                    <EditableText
                      value={cl.name}
                      onCommit={(v) => renameClub(cl, v)}
                    />
                    {cl.is_other && (
                      <span className="text-[9px] tracking-wider uppercase text-cs-brass border border-cs-brass/40 px-1.5 py-0.5">
                        Other
                      </span>
                    )}
                    <span className="ml-auto" />
                    <ToggleActive
                      active={cl.active}
                      disabled={pending}
                      onClick={() => toggleClubActive(cl)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className="border-t border-black/10 pt-4 mt-4">
          <div className="text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-2">
            Add a new club
          </div>
          <div className="flex gap-2">
            <select
              className="field-input flex-shrink-0"
              value={newClubCityId}
              onChange={(e) => setNewClubCityId(e.target.value)}
              style={{ maxWidth: 180 }}
            >
              {cities
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <input
              className="field-input flex-1"
              placeholder="e.g. Tigre Club"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
            />
            <button
              onClick={addClub}
              disabled={
                pending ||
                newClubName.trim().length < 2 ||
                !newClubCityId
              }
              className="px-4 py-2 bg-cs-green text-cs-ivory text-[10px] tracking-[0.12em] uppercase whitespace-nowrap"
            >
              Add club
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToggleActive({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[9px] tracking-[0.15em] uppercase px-2 py-1 border whitespace-nowrap ${
        active
          ? "border-cs-green text-cs-green bg-cs-green/[0.06]"
          : "border-black/15 text-cs-muted"
      }`}
    >
      {active ? "Active" : "Hidden"}
    </button>
  );
}

function EditableText({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="text-[13px] text-cs-black text-left hover:underline decoration-cs-brass underline-offset-2"
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft.trim() !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className="field-input text-[13px]"
      style={{ width: "auto", minWidth: 160 }}
    />
  );
}
