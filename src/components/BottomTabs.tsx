"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/profile",    icon: "◉", label: "Profile" },
  { href: "/app/challenges", icon: "⚔", label: "Reto" },
  { href: "/app/ranking",    icon: "◈", label: "Ranking" },
  { href: "/app/h2h",        icon: "⚡", label: "H2H" },
  { href: "/app/members",    icon: "▤", label: "Members" },
] as const;

export function BottomTabs({
  pendingConfirmations = 0,
}: {
  pendingConfirmations?: number;
}) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-viewport bg-cs-ivory border-t border-black/10 flex z-20">
      {TABS.map((t) => {
        const active = pathname?.startsWith(t.href);
        const showDot = t.href === "/app/h2h" && pendingConfirmations > 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="relative flex-1 flex flex-col items-center pt-[9px] pb-[13px] px-0.5"
          >
            {active && (
              <span className="absolute top-0 left-[20%] right-[20%] h-[1.5px] bg-cs-brass" />
            )}
            <span className="text-base mb-[3px]" aria-hidden>
              {t.icon}
            </span>
            <span
              className={`text-[8px] tracking-[0.1em] uppercase ${
                active ? "text-cs-green" : "text-cs-muted"
              }`}
            >
              {t.label}
            </span>
            {showDot && (
              <span className="absolute top-[6px] right-[24%] w-2 h-2 rounded-full bg-[#E05252] border-2 border-cs-ivory" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
