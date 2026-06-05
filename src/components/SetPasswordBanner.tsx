"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Dismissible banner shown to approved members who have never set a
 * password (legacy magic-link cohort). Lives at the top of the member-app
 * shell. Dismissal is per-browser (localStorage) — re-appears on a new
 * device until they actually set one.
 */
export function SetPasswordBanner({ visible }: { visible: boolean }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const dismissed = localStorage.getItem("cs.banner.setPassword") === "1";
    setHidden(dismissed);
  }, [visible]);

  if (!visible || hidden) return null;

  return (
    <div className="bg-cs-brass/12 border-b border-cs-brass/30 text-cs-green">
      <div className="max-w-[1400px] mx-auto px-7 lg:px-10 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12.5px] leading-relaxed">
          <span className="text-cs-brass tracking-[0.16em] uppercase text-[10px] mr-2">
            New
          </span>
          Set a password to sign in faster — your magic link will keep
          working too.
        </div>
        <div className="flex gap-3 items-center">
          <Link
            href="/app/account/password"
            className="text-[10px] tracking-[0.2em] uppercase text-cs-green border-b border-cs-brass pb-px hover:border-cs-green"
          >
            Set password →
          </Link>
          <button
            onClick={() => {
              localStorage.setItem("cs.banner.setPassword", "1");
              setHidden(true);
            }}
            className="text-[10px] tracking-[0.18em] uppercase text-cs-muted hover:text-cs-green"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
