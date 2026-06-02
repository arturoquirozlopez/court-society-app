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
import { winRate, fmtDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { SignOutLink } from "@/components/SignOutLink";
import { ProfileEditor } from "./ProfileEditor";
import { PendingConfirmations } from "./PendingConfirmations";

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
    new Set((pending ?? []).map((m: { author_id: string }) => m.author_id)),
  );
  const authors = await getProfilesByIds(authorIds);
  const authorById = new Map(authors.map((a) => [a.id, a] as const));

  const cityName = me.home_city_id ? cityMap.get(me.home_city_id)?.name ?? "—" : "—";
  const clubName = me.home_club_id
    ? me.other_club_name && clubMap.get(me.home_club_id)?.is_other
      ? me.other_club_name
      : clubMap.get(me.home_club_id)?.name ?? "—"
    : "—";
  const visitingName =
    visiting?.city_id ? cityMap.get(visiting.city_id)?.name : null;

  const cities = Array.from(cityMap.entries()).map(([id, c]) => ({
    id,
    name: c.name,
  }));

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

        {pending && pending.length > 0 && (
          <PendingConfirmations
            pending={pending as never}
            authorById={authorById as never}
          />
        )}

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
        <ReadRow l="LinkedIn" v={me.linkedin_url ?? "—"} />
        <ReadRow l="Member since" v={fmtDate(me.joined_at ?? me.created_at)} />

        {(me.role === "admin" || me.role === "steward") && (
          <a
            href="/admin"
            className="block mt-6 text-center btn-ghost"
            style={{ marginTop: 0 }}
          >
            Open Steward's Office
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
