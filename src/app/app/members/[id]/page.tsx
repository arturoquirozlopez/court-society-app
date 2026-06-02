import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getCityMap,
  getClubMap,
  getActiveSeason,
  getSeasonStandings,
  getHeadToHead,
} from "@/lib/queries";
import { winRate, waLink, fmtDate, linkedinDisplay } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { LEVEL_LABEL, type Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemberDetail({ params }: { params: { id: string } }) {
  const me = await requireApproved();
  const supabase = createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) notFound();
  const m = data as unknown as Profile;
  if (m.status !== "approved") notFound();

  const [cityMap, clubMap, season] = await Promise.all([
    getCityMap(),
    getClubMap(),
    getActiveSeason(),
  ]);
  const standings = season ? await getSeasonStandings(season.id) : new Map();
  const stats = standings.get(m.id) ?? { wins: 0, losses: 0 };
  const h2h = me.id === m.id ? [] : await getHeadToHead(me.id, m.id);
  const h2hStats = h2h
    .filter((x) => x.status === "confirmed")
    .reduce(
      (acc, x) => {
        const meWon = (x.author_id === me.id && x.author_result === "W") ||
                      (x.opponent_id === me.id && x.author_result === "L");
        if (meWon) acc.wins += 1;
        else acc.losses += 1;
        return acc;
      },
      { wins: 0, losses: 0 },
    );

  const club =
    m.home_club_id && clubMap.get(m.home_club_id)?.is_other && m.other_club_name
      ? m.other_club_name
      : m.home_club_id
        ? clubMap.get(m.home_club_id)?.name ?? "—"
        : "—";
  const cityName = m.home_city_id ? cityMap.get(m.home_city_id)?.name ?? "—" : "—";

  return (
    <div className="min-h-dvh">
      <div className="relative overflow-hidden bg-cs-green text-cs-ivory px-7 pt-[52px] pb-8">
        <Link
          href="/app/members"
          className="block text-[10px] tracking-[0.15em] uppercase text-cs-brassLight mb-5"
        >
          ← Back
        </Link>
        <div className="flex items-end gap-5">
          <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={64} />
          <div>
            <div className="font-display text-[24px] leading-tight">
              {m.full_name}
            </div>
            <div className="text-[12px] text-cs-ivory/60 mt-1">{m.headline}</div>
          </div>
        </div>
      </div>

      <div className="px-7 pt-6">
        <div className="flex items-center gap-2.5 px-4 py-3.5 bg-cs-green text-cs-ivory border-l-2 border-cs-brass mb-5">
          <div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brassLight mb-0.5">
              Club membership
            </div>
            <div className="font-display text-[16px]">{club}</div>
            <div className="text-[11px] text-cs-ivory/60 mt-0.5">{cityName}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-black/10 border border-black/10 mb-6">
          {[
            [stats.wins + stats.losses === 0 ? "—" : `${winRate(stats.wins, stats.losses)}%`, "Win rate"],
            [stats.wins, "Wins"],
            [stats.losses, "Losses"],
            [stats.wins + stats.losses, "Matches"],
          ].map(([v, l]) => (
            <div key={l} className="bg-cs-ivory px-4 py-4">
              <div className="font-display text-[28px] text-cs-green">{v}</div>
              <div className="text-[10px] tracking-wider uppercase text-cs-muted mt-0.5">
                {l}
              </div>
            </div>
          ))}
        </div>

        {me.id !== m.id && (
          <>
            <h2 className="section-header">
              Your record vs {m.full_name?.split(" ")[0]}
            </h2>
            <div className="font-display text-[40px] text-cs-green mb-2">
              {h2hStats.wins}–{h2hStats.losses}
            </div>
          </>
        )}

        <h2 className="section-header mt-6">Profile</h2>
        <Row l="Level" v={m.level ? LEVEL_LABEL[m.level] : "—"} />
        <Row
          l="LinkedIn"
          v={(() => {
            const li = linkedinDisplay(m.linkedin_url);
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
          })()}
        />
        <Row l="Member since" v={fmtDate(m.joined_at ?? m.created_at)} />

        {m.whatsapp && (
          <a
            href={waLink(m.whatsapp, `Hi ${m.full_name?.split(" ")[0] ?? ""}!`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 mt-4 bg-[#25D366] text-white text-[10px] tracking-wider uppercase"
          >
            💬 Message on WhatsApp
          </a>
        )}
        <div className="h-12" />
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-black/5">
      <span className="text-[11px] text-cs-muted">{l}</span>
      <span className="text-[13px] font-medium text-right max-w-[62%]">{v}</span>
    </div>
  );
}
