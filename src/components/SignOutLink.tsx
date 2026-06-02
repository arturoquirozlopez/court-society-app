"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";

export function SignOutLink() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className="text-[10px] tracking-[0.15em] uppercase text-cs-brassLight hover:text-cs-ivory disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
