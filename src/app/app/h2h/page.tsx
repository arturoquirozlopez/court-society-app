import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getCityMap,
  getMyRivals,
  getProfilesByIds,
} from "@/lib/queries";
import { winRate } from "@/lib/format";
import { Hero } from "@/components/Hero";
import { Avatar } from "@/components/Avatar";
import { LogMatchFab, type PlayableChallenge } from "./LogMatchFab";

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

  // Playable challenges = accepted, I'm a participant, no match logged yet
  const cityMap = await getCityMap();
  const { data: accepted } = await supabase
    .from("challenges")
    .select("id, author_id, accepted_by, city_id, format")
    .eq("status", "accepted")
    .or(`author_id.eq.${me.id},accepted_by.eq.${me.id}`);

  const acceptedIds = (accepted ?? []).map((c) => c.id as string);
  const { data: matched } = acceptedIds.length
    ? await supabase
        .from("matches")
        .select("challenge_id")
        .in("challenge_id", acceptedIds)
    : { data: [] as { challenge_id: string }[] };
  const matchedSet = new Set(
    (matched ?? []).map((m) => m.challenge_id as string),
  );

  const playableRows = ((accepted ?? []) as {
    id: string;
    author_id: string;
    accepted_by: string | null;
    city_id: string;
    format: string;
  }[]).filter((c) => !matchedSet.has(c.id));

  const opponentIds = Array.from(
    new Set(
      playableRows.map((c) =>
        c.author_id === me.id ? (c.accepted_by as string) : c.author_id,
      ),
    ),
  );
  const opponentProfiles = await getProfilesByIds(opponentIds);
  const opponentById = new Map(opponentProfiles.map((p) => [p.id, p] as const));

  const playable: PlayableChallenge[] = playableRows.map((c) => {
    const oppId = c.author_id === me.id ? (c.accepted_by as string) : c.author_id;
    const opp = opponentById.get(oppId);
    return {
      challenge_id: c.id,
      opponent_id: oppId,
      opponent_name: opp?.full_name ?? null,
      opponent_photo: opp?.photo_url ?? null,
      city_name: cityMap.get(c.city_id)?.name ?? "—",
      format: c.format as "singles" | "doubles" | "both",
    };
  });

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
            {playable.length > 0
              ? "Log your first match with the ＋ button."
              : "Accept a challenge first, then come back to log the result."}
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
      <LogMatchFab playable={playable} />
    </div>
  );
}
