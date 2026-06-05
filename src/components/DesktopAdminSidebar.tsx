"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutLink } from "@/components/SignOutLink";

/**
 * Desktop left rail for Steward's Office. Mirrors the member-app sidebar
 * visually so admins moving between the two feel a single design language,
 * but exposes the admin sections instead of member nav.
 */
const NAV = [
  { href: "/admin/analytics", icon: "▦", label: "Analytics" },
  { href: "/admin/incomplete", icon: "◴", label: "Incomplete" },
  { href: "/admin/applications", icon: "✦", label: "Applications" },
  { href: "/admin/members", icon: "◇", label: "Members" },
  { href: "/admin/groups", icon: "⌘", label: "Groups" },
  { href: "/admin/locations", icon: "⌖", label: "Locations" },
  { href: "/admin/seasons", icon: "⌛", label: "Seasons" },
] as const;

export function DesktopAdminSidebar({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: string;
}) {
  const pathname = usePathname() ?? "";
  return (
    <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-dvh w-[264px] bg-cs-green text-cs-ivory border-r border-black/40">
      {/* Brand */}
      <div className="px-7 pt-7 pb-6 border-b border-white/10">
        <Link href="/admin/analytics" className="block">
          <div className="font-display italic text-[28px] leading-none -tracking-[0.01em]">
            Court<span className="text-cs-brassLight mx-[2px]">·</span>Society
          </div>
          <div className="text-[9px] tracking-[0.32em] uppercase text-cs-brassLight mt-2">
            Steward&apos;s Office
          </div>
        </Link>
      </div>

      {/* Admin identity */}
      <div className="px-7 py-5 border-b border-white/10">
        <div className="text-[10px] tracking-[0.2em] uppercase text-cs-ivory/50">
          Logged in as
        </div>
        <div className="font-display italic text-[15px] mt-2 leading-tight">
          {name ?? email}
        </div>
        <div className="text-[10px] tracking-[0.16em] uppercase text-cs-brassLight mt-1">
          {role}
        </div>
      </div>

      {/* Admin nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
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
            </Link>
          );
        })}

        <hr className="my-3.5 mx-7 border-white/10" />
        <Link
          href="/app/dashboard"
          className="flex items-center gap-3.5 px-7 py-2.5 text-[13px] tracking-[0.02em] text-cs-ivory/65 hover:text-cs-ivory/90"
        >
          <span className="w-[18px] flex justify-center text-[15px] text-cs-ivory/45" aria-hidden>
            ←
          </span>
          <span>Member app</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-7 py-4 border-t border-white/10 flex justify-between items-center text-[11px] text-cs-ivory/45">
        <span>Season 2026</span>
        <SignOutLink />
      </div>
    </aside>
  );
}
