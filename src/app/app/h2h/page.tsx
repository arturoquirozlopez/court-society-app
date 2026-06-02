import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyRivals, getProfilesByIds } from "@/lib/queries";
import { winRate } from "@/lib/format";
import { Hero } from "@/components/Hero";
import { Avatar } from "@/components/Avatar";
import { LogMatchFab } from "./LogMatchFab";

export const dynamic = "force-dynamic";

export default async function H2hPage() {
  const me = await requireApproved();
  const supabase = createClient();

  const rivals = await getMyRivals(me.id);
  const ids = Array.from(rivals.keys());
  const profiles = await getProfilesByIds(ids);
  const sorted = profiles.slice().sort((a, b) => {
    const ra = rivals.get(a.id)!;
    const rb = rivals.get(b.id)!;
    return rb.wins + rb.losses - (ra.wins + ra.losses);
  });

  const totalW = Array.from(rivals.values()).reduce((s, v) => s + v.wins, 0);
  const totalL = Array.from(rivals.values()).reduce((s, v) => s + v.losses, 0);

  // Member picker data for the FAB sheet
  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, home_city_id, home_club_id")
    .eq("status", "approved")
    .neq("id", me.id)
    .order("full_name");

  return (
    <div>
      <Hero
        title={<>Head to Head</>}
        subtitle={`${totalW}W ${totalL}L overall · ${sorted.length} rivals`}
      />
      {sorted.length === 0 && (
        <div className="px-7 py-12 text-center">
          <div className="font-display italic text-[18px] text-cs-green">
            No matches yet.
          </div>
          <div className="text-[12px] text-cs-muted mt-2 leading-relaxed">
            Log your first match with the ＋ button.
          </div>
        </div>
      )}
      <ul>
        {sorted.map((m) => {
          const r = rivals.get(m.id)!;
          return (
            <li key={m.id}>
              <Link
                href={`/app/h2h/${m.id}`}
                className="flex items-center gap-3.5 px-7 py-4 border-b border-black/10 hover:bg-cs-green/[0.02]"
              >
                <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={46} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{m.full_name}</div>
                  <div className="text-[11px] text-cs-muted mt-0.5">{m.headline}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[20px] text-cs-green">
                    {r.wins}–{r.losses}
                  </div>
                  <div className="text-[10px] text-cs-muted mt-0.5">
                    {winRate(r.wins, r.losses)}%
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <LogMatchFab
        meHomeCityId={me.home_city_id}
        meHomeClubId={me.home_club_id}
        allMembers={(allMembers ?? []) as never}
      />
    </div>
  );
}
