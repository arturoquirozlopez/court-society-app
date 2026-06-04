import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSeason,
  getActiveVisiting,
  getCityMap,
  getClubMap,
  getProfilesByIds,
  getSeasonStandings,
} from "@/lib/queries";
import {
  LEVEL_LABEL,
  FORMAT_LABEL,
  FREQUENCY_LABEL,
} from "@/lib/types";
import { winRate, fmtDate, linkedinDisplay } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { SignOutLink } from "@/components/SignOutLink";
import { ProfileEditor } from "./ProfileEditor";
import { PendingInbox } from "./PendingInbox";
import { NominateButton } from "./NominateButton";
import { MyNominations } from "./MyNominations";
import type { Match, Nomination } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await requireApproved();
  const supabase = createClient();

  const [cityMap, clubMap, season, visiting] = await Promise.all([
    getCityMap(),
    getClubMap(),
    getActiveSeason(),
    getActiveVisiting(me.id),
  ]);

  const standings = season ? await getSeasonStandings(season.id) : new Map();
  const myStats = standings.get(me.id) ?? { wins: 0, losses: 0 };

  // Pending confirmations addressed to me
  const { data: pending } = await supabase
    .from("matches")
    .select("*")
    .eq("opponent_id", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const authorIds = Array.from(
    new Set((pending ?? []).map((m) => m.author_id as string)),
  );
  const authors = await getProfilesByIds(authorIds);
  const authorById = new Map(authors.map((a) => [a.id, a] as const));

  // My nominations (any status)
  const { data: nominationsData } = await supabase
    .from("nominations")
    .select("*")
    .eq("nominator_id", me.id)
    .order("created_at", { ascending: false });
  const myNominations = (nominationsData ?? []) as unknown as Nomination[];

  // Group invitations addressed to me (pending only)
  const { data: pendingGmRows } = await supabase
    .from("group_members")
    .select("group_id, joined_at, status")
    .eq("profile_id", me.id)
    .eq("status", "pending");

  const pendingGroupIds = (pendingGmRows ?? []).map(
    (r) => r.group_id as string,
  );
  const { data: pendingGroups } = pendingGroupIds.length
    ? await supabase
        .from("groups")
        .select("id, name, creator_id")
        .in("id", pendingGroupIds)
    : { data: [] as { id: string; name: string; creator_id: string }[] };

  const pendingInviterIds = Array.from(
    new Set((pendingGroups ?? []).map((g) => g.creator_id as string)),
  );
  const pendingInviters = await getProfilesByIds(pendingInviterIds);
  const pendingInviterById = new Map(
    pendingInviters.map((p) => [p.id, p] as const),
  );

  const groupInvitations = (pendingGroups ?? []).map((g) => {
    const gmRow = (pendingGmRows ?? []).find(
      (r) => r.group_id === g.id,
    );
    return {
      group_id: g.id as string,
      group_name: g.name as string,
      inviter_id: g.creator_id as string,
      inviter_name:
        pendingInviterById.get(g.creator_id as string)?.full_name ?? null,
      invited_at: (gmRow?.joined_at as string) ?? new Date().toISOString(),
    };
  });

  // Direct challenges aimed at me (still open, not expired)
  const { data: directChRows } = await supabase
    .from("challenges")
    .select("id, author_id, city_id, format, note, created_at, expires_at, status")
    .eq("target_id", me.id)
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const directChallengeAuthorIds = Array.from(
    new Set(((directChRows ?? []) as { author_id: string }[]).map((c) => c.author_id)),
  );
  const directChallengeAuthors = await getProfilesByIds(directChallengeAuthorIds);
  const directChallengeAuthorById = new Map(
    directChallengeAuthors.map((p) => [p.id, p] as const),
  );

  const directChallenges = ((directChRows ?? []) as {
    id: string;
    author_id: string;
    city_id: string;
    format: string;
    note: string | null;
    created_at: string;
    expires_at: string;
  }[]).map((c) => ({
    id: c.id,
    author_id: c.author_id,
    author_name:
      directChallengeAuthorById.get(c.author_id)?.full_name ?? null,
    city_name: cityMap.get(c.city_id)?.name ?? "—",
    format: c.format as "singles" | "doubles" | "both",
    note: c.note,
    created_at: c.created_at,
    expires_at: c.expires_at,
  }));

  const cityName = me.home_city_id ? cityMap.get(me.home_city_id)?.name ?? "—" : "—";
  const clubName = me.home_club_id
    ? me.other_club_name && clubMap.get(me.home_club_id)?.is_other
      ? me.other_club_name
      : clubMap.get(me.home_club_id)?.name ?? "—"
    : "—";
  const visitingName =
    visiting?.city_id ? cityMap.get(visiting.city_id)?.name : null;

  const cities = Array.from(cityMap.entries())
    .filter(([, c]) => c.active)
    .map(([id, c]) => ({ id, name: c.name }));

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-cs-green text-cs-ivory px-7 pt-[52px] pb-8">
        <div
          aria-hidden
          className="pointer-events-none select-none absolute -bottom-5 -right-2 font-display italic leading-none text-white/[0.035] text-[140px]"
        >
          CS
        </div>
        <div className="label-eyebrow mb-5">C O U R T &nbsp; S O C I E T Y</div>
        <div className="flex items-end gap-5">
          <Avatar url={me.photo_url} seed={me.id} alt={me.full_name ?? ""} size={64} />
          <div>
            <div className="font-display text-[24px] leading-tight">
              {me.full_name ?? "—"}
            </div>
            <div className="text-[12px] text-cs-ivory/60 mt-1">
              {me.headline ?? ""}
            </div>
            {visitingName && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 bg-cs-brass/15 border border-cs-brass/40">
                <span className="w-1.5 h-1.5 rounded-full bg-cs-brass animate-pulse" />
                <span className="text-[10px] text-cs-brass tracking-[0.06em]">
                  Visiting {visitingName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified inbox at the top — confirmations + invitations + direct challenges */}
      <PendingInbox
        matchConfirmations={(pending ?? []) as unknown as Match[]}
        authorById={authorById}
        groupInvitations={groupInvitations}
        directChallenges={directChallenges}
      />

      <div className="px-7 pt-6">
        {/* Club badge */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 bg-cs-green text-cs-ivory border-l-2 border-cs-brass mb-5">
          <div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brassLight mb-0.5">
              Club membership
            </div>
            <div className="font-display text-[16px]">{clubName}</div>
            <div className="text-[11px] text-cs-ivory/60 mt-0.5">{cityName}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-px bg-black/10 border border-black/10 mb-6">
          {[
            [myStats.wins + myStats.losses === 0 ? "—" : `${winRate(myStats.wins, myStats.losses)}%`, "Win rate"],
            [myStats.wins, "Wins"],
            [myStats.losses, "Losses"],
            [myStats.wins + myStats.losses, "Matches"],
          ].map(([v, l]) => (
            <div key={l} className="bg-cs-ivory px-4 py-4">
              <div className="font-display text-[28px] text-cs-green">{v}</div>
              <div className="text-[10px] tracking-wider uppercase text-cs-muted mt-0.5">
                {l}
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <ProfileEditor
          me={me}
          cities={cities}
          activeVisitingCityId={visiting?.city_id ?? null}
        />

        {/* Profile read-only fields */}
        <h2 className="section-header mt-6">Profile</h2>
        <ReadRow l="Level" v={me.level ? LEVEL_LABEL[me.level] : "—"} />
        <ReadRow l="Format" v={me.format ? FORMAT_LABEL[me.format] : "—"} />
        <ReadRow l="Frequency" v={me.frequency ? FREQUENCY_LABEL[me.frequency] : "—"} />
        <ReadRow l="Travel" v={me.travel_city_ids.map((id) => cityMap.get(id)?.name).filter(Boolean).join(", ") || "—"} />
        <ReadRow
          l="LinkedIn"
          v={
            (() => {
              const li = linkedinDisplay(me.linkedin_url);
              return li ? (
                <a
                  href={li.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cs-green underline decoration-cs-brass underline-offset-2 hover:decoration-cs-green"
                >
                  {li.label}
                </a>
              ) : (
                "—"
              );
            })()
          }
        />
        <ReadRow l="Member since" v={fmtDate(me.joined_at ?? me.created_at)} />

        {/* Nominations */}
        <div className="mt-6">
          <h2 className="section-header mb-3">Nominate</h2>
          <p className="text-[12px] text-cs-muted leading-relaxed mb-3">
            Court Society grows by trust. Invite someone you would be proud to
            play across the net.
          </p>
          <NominateButton />
        </div>
        <MyNominations rows={myNominations} />

        {(me.role === "admin" || me.role === "steward") && (
          <a
            href="/admin"
            className="block mt-6 text-center btn-ghost"
            style={{ marginTop: 0 }}
          >
            Open Steward&apos;s Office
          </a>
        )}

        <div className="mt-8 mb-4">
          <SignOutLink />
        </div>
      </div>
    </div>
  );
}

function ReadRow({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-black/5">
      <span className="text-[11px] text-cs-muted">{l}</span>
      <span className="text-[13px] text-cs-black font-medium text-right max-w-[62%]">
        {v}
      </span>
    </div>
  );
}
