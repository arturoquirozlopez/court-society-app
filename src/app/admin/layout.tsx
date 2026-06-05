import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SignOutLink } from "@/components/SignOutLink";
import { DesktopAdminSidebar } from "@/components/DesktopAdminSidebar";
import { AdminTabClient } from "./AdminTab";

export const dynamic = "force-dynamic";

/**
 * Steward's Office shell.
 *
 * Mobile (<1024px): same single-column header + horizontal tabs as before.
 * Desktop (≥1024px): persistent left sidebar (brand + admin nav), wider
 * content area. The `.app-shell` class on the root tells `globals.css` to
 * drop the 430px viewport clamp at lg+ so the layout can stretch.
 */
const TABS = [
  { href: "/admin/analytics",    label: "Analytics" },
  { href: "/admin/incomplete",   label: "Incomplete" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/members",      label: "Members" },
  { href: "/admin/groups",       label: "Groups" },
  { href: "/admin/locations",    label: "Locations" },
  { href: "/admin/seasons",      label: "Seasons" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireAdmin();
  return (
    <div className="app-shell lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:min-h-dvh">
      {/* Desktop left rail */}
      <DesktopAdminSidebar
        name={me.full_name}
        email={me.email}
        role={me.role}
      />

      <div className="min-h-dvh flex flex-col">
        {/* Mobile-only header + tab strip */}
        <div className="lg:hidden">
          <header className="bg-cs-green text-cs-ivory px-7 pt-9 pb-5">
            <div className="label-eyebrow">Steward&apos;s Office</div>
            <div className="flex items-end justify-between mt-2 gap-3">
              <div>
                <h1 className="font-display italic text-[26px] leading-tight">Admin</h1>
                <div className="text-[11px] text-cs-ivory/60 mt-1">
                  {me.full_name ?? me.email} ·{" "}
                  <span className="uppercase tracking-wider">{me.role}</span>
                </div>
              </div>
              <Link
                href="/app/profile"
                className="text-[10px] tracking-[0.15em] uppercase text-cs-brassLight hover:text-cs-ivory"
              >
                ← Member app
              </Link>
            </div>
          </header>
          <nav className="flex border-b border-black/10 bg-cs-ivory">
            {TABS.map((t) => (
              <AdminTabClient key={t.href} href={t.href} label={t.label} />
            ))}
          </nav>
        </div>

        <main className="flex-1 lg:bg-cs-ivory">{children}</main>

        {/* Sign-out lives in the sidebar on desktop; keep a footer copy on mobile */}
        <div className="lg:hidden px-7 py-8">
          <SignOutLink />
        </div>
      </div>
    </div>
  );
}
