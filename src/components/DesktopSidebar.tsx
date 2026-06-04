"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { SignOutLink } from "@/components/SignOutLink";
import type { Profile } from "@/lib/types";

/**
 * Persistent left rail on desktop (≥1024px). Holds the brand mark, a profile
 * card with the member's current ranking, the primary nav, and a footer with
 * sign-out. Hidden on mobile — `BottomTabs` handles navigation there.
 *
 * Active state is detected via `usePathname` (client component). Server
 * components above pass the static data (profile, club, city, rank).
 */
const NAV = [
  { href: "/app/dashboard", icon: "⌂", label: "Dashboard" },
  { href: "/app/profile", icon: "◐", label: "Profile" },
  { href: "/app/members", icon: "◇", label: "Members" },
  { href: "/app/challenges", icon: "⚔", label: "Challenges" },
  { href: "/app/ranking", icon: "▦", label: "Ranking" },
  { href: "/app/h2h", icon: "↔", label: "Head-to-Head" },
] as const;

export function DesktopSidebar({
  me,
  clubName,
  cityName,
  rank,
  totalRanked,
  pendingReplies,
  isAdmin,
}: {
  me: Profile;
  clubName: string | null;
  cityName: string | null;
  rank: number | null;
  totalRanked: number;
  pendingReplies: number;
  isAdmin: boolean;
}) {
  const pathname = usePathname() ?? "";
  return (
    <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-dvh w-[264px] bg-cs-green text-cs-ivory border-r border-black/40">
      {/* Brand */}
      <div className="px-7 pt-7 pb-6 border-b border-white/10">
        <Link href="/app/dashboard" className="block">
          <div className="font-display italic text-[28px] leading-none -tracking-[0.01em]">
            Court<span className="text-cs-brassLight mx-[2px]">·</span>Society
          </div>
          <div className="text-[9px] tracking-[0.32em] uppercase text-cs-ivory/55 mt-2">
            M C M X X V
          </div>
        </Link>
      </div>

      {/* Member card */}
      <div className="px-7 py-5 border-b border-white/10 flex flex-col gap-3.5">
        <Link href="/app/profile" className="flex items-center gap-3">
          <Avatar
            url={me.photo_url}
            seed={me.id}
            alt={me.full_name ?? ""}
            size={42}
          />
          <div className="min-w-0">
            <div className="font-display italic text-[15px] leading-tight truncate">
              {me.full_name ?? "—"}
            </div>
            <div className="text-[11px] text-cs-ivory/55 mt-0.5 truncate">
              {clubName ? `${clubName}${cityName ? ` · ${cityName}` : ""}` : (cityName ?? "—")}
            </div>
          </div>
        </Link>
        <div className="flex items-baseline justify-between pt-2.5 border-t border-dashed border-white/12">
          <span className="text-[10px] tracking-[0.2em] uppercase text-cs-ivory/50">
            Current ranking
          </span>
          <span className="font-display italic text-[22px] text-cs-brassLight leading-none">
            {rank ? `#${rank}` : "—"}
            {rank && totalRanked > 0 && (
              <span className="ml-1.5 text-[10px] tracking-[0.16em] text-cs-ivory/45">
                / {totalRanked}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const showBadge = item.href === "/app/profile" && pendingReplies > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3.5 px-7 py-2.5 text-[13px] tracking-[0.02em] transition-colors ${
                active
                  ? "text-cs-ivory bg-cs-brass/8"
                  : "text-cs-ivory/65 hover:text-cs-ivory/90"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-cs-brass" />
              )}
              <span
                className={`w-[18px] flex justify-center text-[15px] ${
                  active ? "text-cs-brass" : "text-cs-ivory/45"
                }`}
                aria-hidden
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {showBadge && (
                <span className="ml-auto text-[9px] tracking-[0.1em] bg-cs-brass text-cs-ivory px-1.5 py-0.5 rounded-sm">
                  {pendingReplies > 9 ? "9+" : pendingReplies}
                </span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <hr className="my-3.5 mx-7 border-white/10" />
            <Link
              href="/admin"
              className="relative flex items-center gap-3.5 px-7 py-2.5 text-[13px] tracking-[0.02em] text-cs-ivory/65 hover:text-cs-ivory/90"
            >
              <span className="w-[18px] flex justify-center text-[15px] text-cs-ivory/45" aria-hidden>
                ⊙
              </span>
              <span>Steward&apos;s Office</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-7 py-4 border-t border-white/10 flex justify-between items-center text-[11px] text-cs-ivory/45">
        <span>Season 2026</span>
        <SignOutLink />
      </div>
    </aside>
  );
}
