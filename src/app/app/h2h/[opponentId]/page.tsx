import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getHeadToHead } from "@/lib/queries";
import { fmtDate, winRate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function H2hDetail({
  params,
}: {
  params: { opponentId: string };
}) {
  const me = await requireApproved();
  const supabase = createClient();
  const { data: opp } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.opponentId)
    .maybeSingle();
  if (!opp) notFound();
  const opponent = opp as unknown as Profile;

  const matches = await getHeadToHead(me.id, opponent.id);
  const confirmed = matches.filter((m) => m.status === "confirmed");
  let wins = 0, losses = 0;
  for (const m of confirmed) {
    const meWon =
      (m.author_id === me.id && m.author_result === "W") ||
      (m.opponent_id === me.id && m.author_result === "L");
    if (meWon) wins += 1;
    else losses += 1;
  }

  // Number each match #1, #2, … in chronological order (oldest first).
  // The list itself is rendered newest-first; we just look numbers up by id.
  const chronological = [...matches].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const matchNumberById = new Map<string, number>();
  chronological.forEach((m, i) => matchNumberById.set(m.id, i + 1));

  return (
    <div className="min-h-dvh">
      <div className="relative overflow-hidden bg-cs-green text-cs-ivory px-7 pt-[52px] pb-8">
        <Link
          href="/app/h2h"
          className="block text-[10px] tracking-[0.15em] uppercase text-cs-brassLight mb-5"
        >
          ← Head to Head
        </Link>
        <div className="flex items-end gap-4">
          <Avatar url={opponent.photo_url} seed={opponent.id} size={52} />
          <div>
            <div className="text-[13px] text-cs-brassLight tracking-wider mb-1">vs</div>
            <div className="font-display text-[20px]">{opponent.full_name}</div>
          </div>
        </div>
        <div className="font-display text-[52px] leading-none mt-5">
          {wins}–{losses}
        </div>
        <div className="text-[11px] text-cs-ivory/60 mt-1">
          {winRate(wins, losses)}% win rate
        </div>
      </div>

      {matches.length === 0 && (
        <div className="px-7 py-12 text-center">
          <div className="font-display italic text-[18px] text-cs-green">
            No matches logged.
          </div>
        </div>
      )}

      <ul>
        {matches.map((m) => {
          const iAmAuthor = m.author_id === me.id;
          const meWon =
            (iAmAuthor && m.author_result === "W") ||
            (!iAmAuthor && m.author_result === "L");
          const label =
            m.status === "pending"
              ? "Pending"
              : meWon
                ? "Win"
                : "Loss";
          const cls =
            m.status === "pending"
              ? "bg-[#888] text-white"
              : meWon
                ? "bg-cs-green text-cs-ivory"
                : "bg-cs-loss text-white";
          const num = matchNumberById.get(m.id) ?? 0;
          return (
            <li key={m.id} className="px-7 py-4 border-b border-black/10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[16px] text-cs-brass">
                    #{num}
                  </span>
                  <span className={`text-[11px] tracking-wider uppercase font-medium px-2 py-0.5 ${cls}`}>
                    {label}
                  </span>
                </div>
                <span className="font-display text-[20px]">{(m.score ?? "—").replace(/-/g, "–")}</span>
              </div>
              <div className="text-[11px] text-cs-muted mt-1.5">
                {fmtDate(m.created_at)}
                {m.note ? ` · ${m.note}` : ""}
              </div>
              {m.status === "pending" && (
                <div className="text-[10px] text-cs-warn mt-1 tracking-wider">
                  ⏳ Pending confirmation
                </div>
              )}
              {m.status === "confirmed" && (
                <div className="text-[10px] text-cs-green mt-1 tracking-wider">
                  ✓ Confirmed
                </div>
              )}
              {m.status === "disputed" && (
                <div className="text-[10px] text-cs-loss mt-1 tracking-wider">
                  ⚠ Disputed
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
