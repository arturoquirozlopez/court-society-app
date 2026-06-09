import { requireAdmin } from "@/lib/auth";
import { DesktopAdminSidebar } from "@/components/DesktopAdminSidebar";
import { MobileAdminNav } from "@/components/MobileAdminNav";

export const dynamic = "force-dynamic";

/**
 * Steward's Office shell.
 *
 * Mobile (<1024px): top bar with a hamburger that opens a slide-in drawer
 * holding the full nav. The 7 admin sections don't fit as horizontal tabs
 * on a phone.
 *
 * Desktop (≥1024px): persistent left sidebar (brand + admin nav), wider
 * content area. The `.app-shell` class on the root tells `globals.css` to
 * drop the 430px viewport clamp at lg+ so the layout can stretch.
 */
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
        {/* Mobile top bar + drawer */}
        <MobileAdminNav
          name={me.full_name}
          email={me.email}
          role={me.role}
        />

        <main className="flex-1 lg:bg-cs-ivory">{children}</main>
      </div>
    </div>
  );
}
