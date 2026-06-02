import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SignOutLink } from "@/components/SignOutLink";
import { AdminTabClient } from "./AdminTab";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/members",      label: "Members" },
  { href: "/admin/seasons",      label: "Seasons" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireAdmin();
  return (
    <div className="min-h-dvh">
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
      <main>{children}</main>
      <div className="px-7 py-8">
        <SignOutLink />
      </div>
    </div>
  );
}
