"use client";

import { useRef, useState, useTransition } from "react";
import { updateProfile, uploadAvatar, setVisitingCity } from "@/lib/actions/profile";
import type { Profile } from "@/lib/types";

export function ProfileEditor({
  me,
  cities,
  activeVisitingCityId,
}: {
  me: Profile;
  cities: { id: string; name: string }[];
  activeVisitingCityId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState({
    full_name: me.full_name ?? "",
    headline: me.headline ?? "",
    whatsapp: me.whatsapp ?? "",
    linkedin_url: me.linkedin_url ?? "",
  });

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateProfile(values);
      if (!res.ok) setMsg(res.error);
      else {
        setEditing(false);
        setMsg("Saved.");
      }
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setMsg(null);
    startTransition(async () => {
      const res = await uploadAvatar(fd);
      if (!res.ok) setMsg(res.error);
      else setMsg("Photo updated.");
    });
  }

  function changeVisiting(cityId: string) {
    startTransition(async () => {
      await setVisitingCity(cityId || null);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-header m-0 pb-0 border-0">Edit</h2>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-[10px] tracking-[0.15em] uppercase text-cs-muted hover:text-cs-black"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing && (
        <div className="space-y-4 mb-6">
          <Field label="Full name">
            <input
              className="field-input"
              value={values.full_name}
              onChange={(e) => setValues((p) => ({ ...p, full_name: e.target.value }))}
            />
          </Field>
          <Field label="Role / headline">
            <input
              className="field-input"
              value={values.headline}
              onChange={(e) => setValues((p) => ({ ...p, headline: e.target.value }))}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              className="field-input"
              value={values.whatsapp}
              onChange={(e) => setValues((p) => ({ ...p, whatsapp: e.target.value }))}
              inputMode="tel"
            />
          </Field>
          <Field label="LinkedIn URL">
            <input
              className="field-input"
              value={values.linkedin_url}
              onChange={(e) => setValues((p) => ({ ...p, linkedin_url: e.target.value }))}
              inputMode="url"
            />
          </Field>
          <button onClick={save} disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      <Field label="Currently visiting (optional)">
        <select
          className="field-input"
          value={activeVisitingCityId ?? ""}
          onChange={(e) => changeVisiting(e.target.value)}
        >
          <option value="">— Home city —</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Profile photo">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
        <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ marginTop: 0 }}>
          {pending ? "Uploading…" : "Change photo"}
        </button>
      </Field>

      {msg && <p className="text-[12px] text-cs-muted mt-2">{msg}</p>}
    </div>
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
