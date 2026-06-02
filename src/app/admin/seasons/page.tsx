import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSeasonStandings } from "@/lib/queries";
import { SeasonsClient } from "./SeasonsClient";
import type { Season } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const me = await requireAdmin();
  const supabase = createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("year", { ascending: false });

  // Quick stats for the active season header
  const active = (seasons ?? []).find((s) => s.active) as unknown as Season | undefined;
  const standings = active ? await getSeasonStandings(active.id) : new Map();
  let totalMatches = 0;
  let totalPlayers = 0;
  for (const s of standings.values()) {
    totalMatches += s.wins + s.losses;
    totalPlayers += 1;
  }
  totalMatches = totalMatches / 2; // each match counted from both sides

  return (
    <SeasonsClient
      meRole={me.role}
      seasons={(seasons ?? []) as unknown as Season[]}
      activeStats={{
        matches: Math.round(totalMatches),
        players: totalPlayers,
      }}
    />
  );
}
