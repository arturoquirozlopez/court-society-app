"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/lib/actions/auth";

/**
 * Two-field password form shared by the recovery flow (`/auth/reset/set`)
 * and the first-time set-password page (`/app/account/password`). Lives in
 * the reset folder because that's the primary caller; the account page
 * imports it directly.
 */
export function SetPasswordForm({ next }: { next: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updatePassword(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = next;
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PwField name="password" label="New password" show={show} onToggle={() => setShow((s) => !s)} hint="At least 8 characters." />
      <PwField name="confirm" label="Confirm password" show={show} onToggle={() => setShow((s) => !s)} />
      {error && (
        <div className="text-[12px] text-cs-loss border-l-2 border-cs-loss pl-3 py-1.5">
          {error}
        </div>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}

function PwField({
  name,
  label,
  show,
  onToggle,
  hint,
}: {
  name: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted">
          {label}
        </label>
        <button
          type="button"
          onClick={onToggle}
          className="text-[10px] tracking-[0.12em] uppercase text-cs-muted hover:text-cs-black"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <input
        name={name}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        className="field-input"
      />
      {hint && <p className="mt-1.5 text-[10.5px] text-cs-muted">{hint}</p>}
    </div>
  );
}
