import { requireApproved } from "@/lib/auth";
import { BottomTabs } from "@/components/BottomTabs";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Member-app shell. Forces approved status, totals all items needing the
 * member's reply (match confirmations + group invitations) for the
 * notification dot on the Profile tab.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireApproved();

  const supabase = createClient();
  const [{ count: matches }, { count: invites }, { count: directChallenges }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("opponent_id", me.id)
        .eq("status", "pending"),
      supabase
        .from("group_members")
        .select("group_id", { count: "exact", head: true })
        .eq("profile_id", me.id)
        .eq("status", "pending"),
      supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("target_id", me.id)
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString()),
    ]);

  return (
    <div className="min-h-dvh flex flex-col">
      <OnboardingOverlay autoShow={!me.onboarding_completed} />
      <main className="flex-1 pb-[88px]">{children}</main>
      <BottomTabs
        pendingReplies={
          (matches ?? 0) + (invites ?? 0) + (directChallenges ?? 0)
        }
      />
    </div>
  );
}
