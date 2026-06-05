import { requireApproved } from "@/lib/auth";
import { BottomTabs } from "@/components/BottomTabs";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { SetPasswordBanner } from "@/components/SetPasswordBanner";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSeason,
  getCityMap,
  getClubMap,
  getSeasonRanking,
} from "@/lib/queries";
import { touchLastSeen } from "@/lib/last-seen";

export const dynamic = "force-dynamic";

/**
 * Member-app shell.
 *
 * Mobile (<1024px): unchanged — full-bleed content + bottom tabs.
 * Desktop (≥1024px): 3-column grid with a persistent left sidebar (brand,
 * profile card, ranking, primary nav). Pages provide their own right rail
 * inside `{children}` to keep the rail page-specific.
 *
 * The shell totals all items needing the member's reply (match confirmations,
 * group invitations, direct challenges) for the notification dot.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireApproved();

  // Fire-and-forget heartbeat. Debounced inside the helper so we only write
  // once every 5 minutes per member.
  void touchLastSeen(me.id, me.last_seen_at);

  const supabase = createClient();
  const [cityMap, clubMap, season] = await Promise.all([
    getCityMap(),
    getClubMap(),
    getActiveSeason(),
  ]);
  const activeCities = Array.from(cityMap.values())
    .filter((c) => c.active)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));

  const [
    { count: matches },
    { count: invites },
    { count: directChallenges },
    seasonRank,
  ] = await Promise.all([
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
    season ? getSeasonRanking(season.id) : Promise.resolve(null),
  ]);

  // My rank = position in the sorted overall standings (1-indexed).
  let myRank: number | null = null;
  let totalRanked = 0;
  if (seasonRank) {
    totalRanked = seasonRank.sorted.length;
    const idx = seasonRank.sorted.findIndex((r) => r.profile_id === me.id);
    if (idx !== -1) myRank = idx + 1;
  }

  const clubName = me.home_club_id
    ? me.other_club_name && clubMap.get(me.home_club_id)?.is_other
      ? me.other_club_name
      : clubMap.get(me.home_club_id)?.name ?? null
    : null;
  const cityName = me.home_city_id
    ? cityMap.get(me.home_city_id)?.name ?? null
    : null;

  const pendingReplies =
    (matches ?? 0) + (invites ?? 0) + (directChallenges ?? 0);

  return (
    <div className="app-shell lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:min-h-dvh">
      <OnboardingOverlay
        autoShow={!me.onboarding_completed}
        cities={activeCities}
      />

      {/* Desktop left rail (lg+) */}
      <DesktopSidebar
        me={me}
        clubName={clubName}
        cityName={cityName}
        rank={myRank}
        totalRanked={totalRanked}
        pendingReplies={pendingReplies}
        isAdmin={me.role === "admin" || me.role === "steward"}
      />

      {/* Page content. Mobile keeps bottom-tabs spacing; on desktop the
          tabs are hidden so we drop the bottom padding. */}
      <div className="flex flex-col min-h-dvh">
        <SetPasswordBanner visible={me.password_set_at === null} />
        <main className="flex-1 pb-[88px] lg:pb-0 lg:bg-cs-ivory">
          {children}
        </main>
        <div className="lg:hidden">
          <BottomTabs pendingReplies={pendingReplies} />
        </div>
      </div>
    </div>
  );
}
