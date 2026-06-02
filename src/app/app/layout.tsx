import { requireApproved } from "@/lib/auth";
import { BottomTabs } from "@/components/BottomTabs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Member-app shell. Forces approved status, fetches pending-match count
 * for the notification dot, and renders the bottom tab bar.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireApproved();

  const supabase = createClient();
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("opponent_id", me.id)
    .eq("status", "pending");

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 pb-[88px]">{children}</main>
      <BottomTabs pendingConfirmations={count ?? 0} />
    </div>
  );
}
