"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutLink } from "@/components/SignOutLink";

/**
 * Mobile-only admin navigation. The 7 admin sections don't fit as a row of
 * tabs on a phone — instead the top bar shows a hamburger and the user's
 * role, and the full nav lives in a slide-in drawer.
 *
 * Hidden on lg+ where `DesktopAdminSidebar` takes over.
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

export function MobileAdminNav({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const current = NAV.find((n) => pathname.startsWith(n.href));

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <header className="bg-cs-green text-cs-ivory px-5 pt-5 pb-4 flex items-center justify-between gap-3 sticky top-0 z-30">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] border border-white/15 hover:border-cs-brass transition-colors"
        >
          <span className="block w-4 h-[1.5px] bg-cs-ivory" />
          <span className="block w-4 h-[1.5px] bg-cs-ivory" />
          <span className="block w-4 h-[1.5px] bg-cs-ivory" />
        </button>

        <div className="flex-1 text-center min-w-0">
          <div className="text-[8px] tracking-[0.32em] uppercase text-cs-brassLight">
            S t e w a r d &nbsp; o f f i c e
          </div>
          <div className="font-display italic text-[16px] leading-tight truncate mt-0.5">
            {current?.label ?? "Admin"}
          </div>
        </div>

        <Link
          href="/app/profile"
          className="text-[9px] tracking-[0.16em] uppercase text-cs-brassLight hover:text-cs-ivory whitespace-nowrap"
        >
          ← App
        </Link>
      </header>

      {/* Drawer + backdrop */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 animate-[fadeIn_.18s_ease-out]"
            aria-hidden
          />
          <aside
            className="fixed top-0 left-0 z-50 h-dvh w-[78%] max-w-[320px] bg-cs-green text-cs-ivory flex flex-col animate-[slideInLeft_.22s_ease-out]"
            role="dialog"
            aria-label="Admin menu"
          >
            {/* Drawer header */}
            <div className="px-6 pt-6 pb-5 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display italic text-[24px] leading-none">
                  Court<span className="text-cs-brassLight mx-[2px]">·</span>Society
                </div>
                <div className="text-[9px] tracking-[0.32em] uppercase text-cs-brassLight mt-2">
                  Steward&rsquo;s Office
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-cs-ivory/70 hover:text-cs-ivory text-2xl leading-none -mt-1"
              >
                ×
              </button>
            </div>

            {/* Who am I */}
            <div className="px-6 py-4 border-b border-white/10">
              <div className="text-[9px] tracking-[0.2em] uppercase text-cs-ivory/50">
                Logged in as
              </div>
              <div className="font-display italic text-[15px] mt-1.5 leading-tight truncate">
                {name ?? email}
              </div>
              <div className="text-[9px] tracking-[0.16em] uppercase text-cs-brassLight mt-1">
                {role}
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 overflow-y-auto">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`relative flex items-center gap-3.5 px-6 py-3 text-[14px] tracking-[0.02em] transition-colors ${
                      active
                        ? "text-cs-ivory bg-cs-brass/8"
                        : "text-cs-ivory/70 hover:text-cs-ivory"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-cs-brass" />
                    )}
                    <span
                      className={`w-5 flex justify-center text-[16px] ${
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
              <hr className="my-3 mx-6 border-white/10" />
              <Link
                href="/app/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3.5 px-6 py-3 text-[14px] tracking-[0.02em] text-cs-ivory/70 hover:text-cs-ivory"
              >
                <span className="w-5 flex justify-center text-[16px] text-cs-ivory/45" aria-hidden>
                  ←
                </span>
                <span>Member app</span>
              </Link>
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center text-[11px] text-cs-ivory/55">
              <span>Season 2026</span>
              <SignOutLink />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
