import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Debounced "last seen" updater for member-app server renders. Called from
 * `/app/layout.tsx` on every request — but only writes to the database when
 * the stored timestamp is older than 5 minutes, so the hot path is one
 * lightweight read (which we already do via `requireApproved`) plus an
 * occasional `update`.
 *
 * Powers the admin Analytics dashboard's Active / At Risk / Dormant slices
 * and the retention KPIs, where "interaction" needs an honest signal that
 * isn't tied to a specific action (match log, challenge, nomination).
 */
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

export async function touchLastSeen(profileId: string, previous: string | null) {
  if (previous) {
    const last = new Date(previous).getTime();
    if (!Number.isNaN(last) && Date.now() - last < DEBOUNCE_MS) return;
  }
  try {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", profileId);
  } catch {
    // best-effort — never break a render because of telemetry
  }
}
