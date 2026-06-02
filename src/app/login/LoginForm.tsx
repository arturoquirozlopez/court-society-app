"use client";

import { useState, useTransition } from "react";
import { sendMagicLink } from "@/lib/actions/auth";

export function LoginForm({
  initialError,
  next,
}: {
  initialError?: string;
  next?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    startTransition(async () => {
      const res = await sendMagicLink(fd);
      if (!res.ok) setError(res.error);
      else setSentTo(res.email);
    });
  }

  if (sentTo) {
    return (
      <div className="border border-black/10 p-5">
        <div className="label-eyebrow">Check your email</div>
        <p className="mt-2 text-[14px] text-cs-black">
          We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device.
        </p>
        <button
          onClick={() => setSentTo(null)}
          className="mt-4 text-[10px] tracking-[0.15em] uppercase text-cs-muted hover:text-cs-black"
        >
          ← Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
          Email address
        </label>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@domain.com"
          className="field-input"
        />
      </div>
      {error ? (
        <div className="text-[12px] text-cs-loss">{decodeURIComponent(error)}</div>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Sending…" : "Continue with email"}
      </button>
      <p className="text-[11px] text-cs-muted leading-relaxed">
        By continuing you agree to receive a one-time sign-in link. We never share your email.
      </p>
    </form>
  );
}
