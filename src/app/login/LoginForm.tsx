"use client";

import { useState, useTransition } from "react";
import {
  requestPasswordReset,
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/actions/auth";

type Mode = "signin" | "signup" | "magic" | "forgot";

export function LoginForm({
  initialError,
  next,
  defaultMode = "signin",
}: {
  initialError?: string;
  next?: string;
  defaultMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  function reset() {
    setError(null);
    setNotice(null);
  }

  function go(href: string) {
    if (typeof window !== "undefined") window.location.href = href;
  }

  function onSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    reset();
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    startTransition(async () => {
      const res = await signInWithPassword(fd);
      if (!res.ok) {
        if (res.needsPassword) {
          // legacy migration path — magic link was sent for them
          setSentTo(String(fd.get("email") ?? ""));
          setNotice(res.error);
        } else {
          setError(res.error);
        }
        return;
      }
      go(res.redirect || "/");
    });
  }

  function onSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    reset();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signUpWithPassword(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      go(next || "/apply");
    });
  }

  function onMagic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    reset();
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    startTransition(async () => {
      const res = await sendMagicLink(fd);
      if (!res.ok) setError(res.error);
      else setSentTo(res.email);
    });
  }

  function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    reset();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    startTransition(async () => {
      const res = await requestPasswordReset(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResetSent(email);
    });
  }

  /* ─────────── post-submit screens ─────────── */

  if (sentTo) {
    return (
      <div className="border border-black/10 p-5 lg:p-6">
        <div className="label-eyebrow">Check your email</div>
        <p className="mt-2 text-[14px] text-cs-black">
          We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this
          device.
        </p>
        {notice && (
          <p className="mt-3 text-[12.5px] text-cs-brass leading-relaxed">
            {notice}
          </p>
        )}
        <button
          onClick={() => {
            setSentTo(null);
            setNotice(null);
            setMode("signin");
          }}
          className="mt-4 text-[10px] tracking-[0.15em] uppercase text-cs-muted hover:text-cs-black"
        >
          ← Use a different email
        </button>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="border border-black/10 p-5 lg:p-6">
        <div className="label-eyebrow">Password reset sent</div>
        <p className="mt-2 text-[14px] text-cs-black">
          If <strong>{resetSent}</strong> matches a Court Society account,
          we sent a link to set a new password.
        </p>
        <button
          onClick={() => {
            setResetSent(null);
            setMode("signin");
          }}
          className="mt-4 text-[10px] tracking-[0.15em] uppercase text-cs-muted hover:text-cs-black"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  /* ─────────── tabs ─────────── */

  return (
    <div>
      {(mode === "signin" || mode === "signup") && (
        <div className="flex border-b border-black/10 mb-6">
          <TabBtn on={mode === "signin"} onClick={() => { setMode("signin"); reset(); }}>
            Sign in
          </TabBtn>
          <TabBtn on={mode === "signup"} onClick={() => { setMode("signup"); reset(); }}>
            Create account
          </TabBtn>
        </div>
      )}

      {mode === "signin" && (
        <form onSubmit={onSignIn} className="space-y-5">
          <Field name="email" label="Email" type="email" autoComplete="email" required />
          <PasswordField name="password" label="Password" show={showPw} onToggle={() => setShowPw((s) => !s)} autoComplete="current-password" />
          {error && <Err>{error}</Err>}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <div className="flex justify-between text-[11px] text-cs-muted">
            <button type="button" onClick={() => { setMode("forgot"); reset(); }} className="hover:text-cs-black">
              Forgot password?
            </button>
            <button type="button" onClick={() => { setMode("magic"); reset(); }} className="hover:text-cs-black">
              Sign in with magic link
            </button>
          </div>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={onSignUp} className="space-y-5">
          <Field name="email" label="Email" type="email" autoComplete="email" required />
          <PasswordField name="password" label="Password" show={showPw} onToggle={() => setShowPw((s) => !s)} autoComplete="new-password" hint="At least 8 characters." />
          <PasswordField name="confirm" label="Confirm password" show={showPw} onToggle={() => setShowPw((s) => !s)} autoComplete="new-password" />
          {error && <Err>{error}</Err>}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Creating account…" : "Create account & continue"}
          </button>
          <p className="text-[11px] text-cs-muted leading-relaxed">
            By creating an account you agree to be considered for membership.
            Applications are reviewed individually.
          </p>
          <button
            type="button"
            onClick={() => { setMode("magic"); reset(); }}
            className="text-[11px] text-cs-muted hover:text-cs-black"
          >
            Prefer a magic link instead?
          </button>
        </form>
      )}

      {mode === "magic" && (
        <form onSubmit={onMagic} className="space-y-5">
          <div className="label-eyebrow">Magic link sign-in</div>
          <Field name="email" label="Email" type="email" autoComplete="email" required />
          {error && <Err>{error}</Err>}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Sending…" : "Send sign-in link"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("signin"); reset(); }}
            className="text-[11px] text-cs-muted hover:text-cs-black"
          >
            ← Use email + password instead
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={onForgot} className="space-y-5">
          <div className="label-eyebrow">Reset password</div>
          <p className="text-[12.5px] text-cs-muted leading-relaxed">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
          <Field name="email" label="Email" type="email" autoComplete="email" required />
          {error && <Err>{error}</Err>}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("signin"); reset(); }}
            className="text-[11px] text-cs-muted hover:text-cs-black"
          >
            ← Back to sign in
          </button>
        </form>
      )}
    </div>
  );
}

/* ─────────── small UI pieces ─────────── */

function TabBtn({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 text-[11px] tracking-[0.18em] uppercase border-b-2 transition-colors ${
        on
          ? "text-cs-green border-cs-green"
          : "text-cs-muted border-transparent hover:text-cs-black"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="field-input"
      />
    </div>
  );
}

function PasswordField({
  name,
  label,
  show,
  onToggle,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
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
        autoComplete={autoComplete}
        required
        minLength={8}
        className="field-input"
      />
      {hint && (
        <p className="mt-1.5 text-[10.5px] text-cs-muted">{hint}</p>
      )}
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-cs-loss border-l-2 border-cs-loss pl-3 py-1.5">
      {typeof children === "string"
        ? decodeURIComponent(children)
        : children}
    </div>
  );
}
