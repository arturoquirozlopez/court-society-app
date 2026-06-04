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

  // Count existing matches between me and each opponent so the picker can
  // tell the user "this will be #3 vs Pablo".
  const { data: pastMatches } = await supabase
    .from("matches")
    .select("author_id, opponent_id")
    .or(`author_id.eq.${me.id},opponent_id.eq.${me.id}`);
  const countByOpponent = new Map<string, number>();
  for (const row of (pastMatches ?? []) as {
    author_id: string;
    opponent_id: string;
  }[]) {
    const otherId = row.author_id === me.id ? row.opponent_id : row.author_id;
    countByOpponent.set(otherId, (countByOpponent.get(otherId) ?? 0) + 1);
  }

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
      next_match_number: (countByOpponent.get(oppId) ?? 0) + 1,
    };
  });

  const totalMatches = totalW + totalL;
  const overallWR = totalMatches > 0 ? Math.round((totalW / totalMatches) * 100) : 0;
  const topByMatches = sorted.slice(0, 6);

  return (
    <>
      {/* ════════════════ DESKTOP ════════════════ */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:min-h-dvh">
        <section className="px-10 pb-16">
          <div className="flex items-end justify-between pt-8 pb-6 border-b border-cs-green/10">
            <div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
                {sorted.length} {sorted.length === 1 ? "RIVAL" : "RIVALS"}
              </div>
              <h1 className="font-display italic text-[42px] leading-none mt-2 text-cs-green -tracking-[0.015em]">
                Head to Head
              </h1>
            </div>
            {/* Desktop log-match button. The FAB stays hidden at lg+; this
                inline button (inside LogMatchFab) is the desktop entry. */}
            <LogMatchFab playable={playable} />
          </div>

          {sorted.length === 0 ? (
            <div className="mt-16 text-center">
              <div className="font-display italic text-[20px] text-cs-green">
                No matches yet.
              </div>
              <div className="text-[12px] text-cs-muted mt-2">
                {playable.length > 0
                  ? "Log your first match below."
                  : "Accept a challenge first, then come back."}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mt-7">
              {sorted.map((m) => {
                const r = rivals.get(m.id)!;
                const rWR = winRate(r.wins, r.losses);
                return (
                  <Link
                    key={m.id}
                    href={`/app/h2h/${m.id}`}
                    className="bg-[#FBF8F0] border border-cs-green/10 p-5 flex flex-col gap-3.5 hover:border-cs-brass transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={44} />
                      <div className="min-w-0">
                        <div className="font-display italic text-[17px] text-cs-green leading-tight truncate">
                          {m.full_name}
                        </div>
                        {m.headline && (
                          <div className="text-[11px] text-cs-muted truncate mt-0.5">
                            {m.headline}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-dashed border-cs-green/15 pt-3 mt-auto">
                      <span className="font-display italic text-[28px] text-cs-green leading-none">
                        {r.wins}<span className="text-cs-brass mx-1">–</span>{r.losses}
                      </span>
                      <span className="text-[11px] text-cs-muted">{rWR}% win</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="border-l border-cs-green/10 bg-[#FBF8F0] px-7 py-10 flex flex-col gap-8">
          <div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
              O v e r a l l
            </div>
            <div className="font-display italic text-cs-green text-[56px] leading-none mt-3">
              {totalW}<span className="text-cs-brass mx-2">–</span>{totalL}
            </div>
            <div className="text-[11px] tracking-[0.14em] uppercase text-cs-muted mt-3">
              {totalMatches} matches · {overallWR}% win rate
            </div>
          </div>

          {topByMatches.length > 0 && (
            <div>
              <h2 className="font-display italic text-[18px] text-cs-green mb-3">
                Most-played rivals
              </h2>
              {topByMatches.map((m) => {
                const r = rivals.get(m.id)!;
                return (
                  <Link
                    key={m.id}
                    href={`/app/h2h/${m.id}`}
                    className="flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0 hover:bg-cs-ivory/60 -mx-2 px-2"
                  >
                    <Avatar url={m.photo_url} seed={m.id} alt={m.full_name ?? ""} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-cs-green truncate">{m.full_name}</div>
                    </div>
                    <span className="font-display italic text-[13px] text-cs-green">
                      {r.wins}–{r.losses}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      {/* ════════════════ MOBILE ════════════════ */}
      <div className="lg:hidden">
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
    </>
  );
}
