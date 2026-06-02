"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminTabClient({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname?.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex-1 py-3 text-center text-[10px] tracking-[0.14em] uppercase font-medium ${
        active
          ? "text-cs-green border-b-2 border-cs-green"
          : "text-cs-muted border-b-2 border-transparent"
      }`}
    >
      {label}
    </Link>
  );
}
