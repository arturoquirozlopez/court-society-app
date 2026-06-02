"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/Sheet";
import { createNomination } from "@/lib/actions/nominations";

export function NominateButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setNote("");
    setError(null);
    setSent(null);
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createNomination({
        nominee_name: name.trim(),
        nominee_email: email.trim(),
        note: note.trim(),
      });
      if (!res.ok) setError(res.error);
      else setSent(email.trim());
    });
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="btn-ghost"
        style={{ marginTop: 0 }}
      >
        Nominate a member
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Nominate a member"
        subtitle="Invite someone you know to apply. They&rsquo;ll get a private link."
      >
        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 border border-cs-brass/40 flex items-center justify-center text-[22px] mx-auto mb-4 text-cs-green">
              ✓
            </div>
            <h3 className="font-display italic text-[22px] text-cs-green mb-2">
              Invitation sent.
            </h3>
            <p className="text-[13px] text-cs-muted leading-relaxed mb-6">
              We sent the nomination to <strong>{sent}</strong>. They have 30 days to apply.
            </p>
            <button
              onClick={() => {
                reset();
              }}
              className="btn-ghost"
              style={{ marginTop: 0 }}
            >
              Nominate another
            </button>
          </div>
        ) : (
          <>
            <Field label="Their full name">
              <input
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoFocus
              />
            </Field>
            <Field label="Their email">
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                inputMode="email"
              />
            </Field>
            <Field label="Note (optional, shown in the invitation)">
              <textarea
                className="field-input min-h-[72px] resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A short personal note — why are you nominating them?"
              />
            </Field>

            {error && <p className="text-[12px] text-cs-loss mb-2">{error}</p>}

            <button
              onClick={submit}
              disabled={
                pending ||
                name.trim().length < 2 ||
                !/^\S+@\S+\.\S+$/.test(email.trim())
              }
              className="btn-primary"
            >
              {pending ? "Sending…" : "Send nomination"}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
