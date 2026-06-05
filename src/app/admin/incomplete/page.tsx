import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCityMap, getClubMap } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { LeadRowActions } from "./LeadRowActions";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 4;
const COOLDOWN_HOURS = 48;

/**
 * Incomplete Applications queue. Lists every profile whose application is
 * not yet submitted (account_created or application_started) and exposes
 * the three admin actions: send reminder, mark not interested, archive.
 *
 * Sorted newest-first so the most recently leaked leads surface at the top.
 */
export default async function IncompletePage() {
  await requireAdmin();
  const supabase = createClient();

  type Row = {
    id: string;
    email: string;
    full_name: string | null;
    home_city_id: string | null;
    home_club_id: string | null;
    application_status: string;
    application_step: number;
    application_started_at: string | null;
    last_seen_at: string | null;
    reminder_sent_at: string | null;
    reminder_count: number;
    created_at: string;
  };

  // Incomplete = an `applications` row with status='pending' whose payload
  // has NOT actually been filled in. We start from `applications` (same
  // entry point as /admin/applications) so we don't depend on
  // `profiles.application_status` being correctly backfilled, then we
  // hydrate the profile fields we need to display the row.
  const [{ data: appsData }, cityMap, clubMap] = await Promise.all([
    supabase
      .from("applications")
      .select("profile_id, payload, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    getCityMap(),
    getClubMap(),
  ]);

  const pendingApps = (appsData ?? []) as {
    profile_id: string;
    payload: unknown;
    created_at: string;
  }[];
  const incompleteProfileIds = pendingApps
    .filter((a) => isEmptyPayload(a.payload))
    .map((a) => a.profile_id);

  console.log("[admin/incomplete] diag", {
    pending_apps: pendingApps.length,
    payload_samples: pendingApps.slice(0, 3).map((a) => ({
      pid: a.profile_id,
      type: typeof a.payload,
      json: JSON.stringify(a.payload),
      empty: isEmptyPayload(a.payload),
    })),
    incomplete_ids: incompleteProfileIds.length,
  });

  // `select("*")` instead of an explicit column list so we don't crash
  // when migration 0012 hasn't been applied yet — missing columns are
  // returned as `undefined`, not as an error.
  const leadsResult = incompleteProfileIds.length
    ? await supabase
        .from("profiles")
        .select("*")
        .in("id", incompleteProfileIds)
        .order("created_at", { ascending: false })
    : { data: [] as Record<string, unknown>[], error: null };

  if (leadsResult.error) {
    console.error("[admin/incomplete] profiles fetch failed", leadsResult.error);
  }

  const leads = ((leadsResult.data ?? []) as Record<string, unknown>[]).map(
    (r) =>
      ({
        id: String(r.id ?? ""),
        email: String(r.email ?? ""),
        full_name: (r.full_name as string | null) ?? null,
        home_city_id: (r.home_city_id as string | null) ?? null,
        home_club_id: (r.home_club_id as string | null) ?? null,
        application_status:
          (r.application_status as string | null) ?? "account_created",
        application_step: Number(r.application_step ?? 0),
        application_started_at:
          (r.application_started_at as string | null) ?? null,
        last_seen_at: (r.last_seen_at as string | null) ?? null,
        reminder_sent_at: (r.reminder_sent_at as string | null) ?? null,
        reminder_count: Number(r.reminder_count ?? 0),
        created_at: String(r.created_at ?? ""),
      }) satisfies Row,
  );

  console.log("[admin/incomplete] leads", {
    requested: incompleteProfileIds,
    fetched: leads.map((l) => ({ id: l.id, email: l.email })),
  });

  /* ── Right-rail KPIs ── */
  const now = Date.now();
  const submittedThisWeek = await countSubmittedSince(7);
  const reminderResponseRate = await computeReminderResponse();

  return (
    <div className="px-7 lg:px-10 pb-20">
      <div className="flex items-end justify-between pt-8 pb-6 border-b border-cs-green/10">
        <div>
          <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
            S T E W A R D &nbsp; D A S H B O A R D
          </div>
          <h1 className="font-display italic text-[32px] lg:text-[42px] leading-none mt-2 text-cs-green -tracking-[0.015em]">
            Incomplete applications
          </h1>
        </div>
        <div className="hidden lg:flex gap-px bg-cs-green/10 border border-cs-green/10">
          <Kpi label="Open leads" value={leads.length} />
          <Kpi label="Submitted · 7 d" value={submittedThisWeek} />
          <Kpi
            label="Reminder → submit"
            value={`${reminderResponseRate}%`}
          />
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="text-[13px] text-cs-muted mt-12">
          No incomplete applications. Every account has reached at least the
          submitted stage.
        </p>
      ) : (
        <div className="mt-7 grid gap-3">
          {leads.map((l) => {
            const cityName = l.home_city_id
              ? cityMap.get(l.home_city_id)?.name ?? "—"
              : "—";
            const clubName = l.home_club_id
              ? clubMap.get(l.home_club_id)?.name ?? "—"
              : "—";
            const completion = Math.round(
              (Math.max(0, Math.min(TOTAL_STEPS, l.application_step)) /
                TOTAL_STEPS) *
                100,
            );
            const cooldownLeft = l.reminder_sent_at
              ? Math.max(
                  0,
                  COOLDOWN_HOURS -
                    (now - new Date(l.reminder_sent_at).getTime()) / 3600000,
                )
              : 0;
            return (
              <article
                key={l.id}
                className="bg-[#FBF8F0] border border-cs-green/10 px-5 py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_140px_auto] gap-4 items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    url={null}
                    seed={l.id}
                    alt={l.full_name ?? l.email}
                    size={40}
                  />
                  <div className="min-w-0">
                    <div className="font-display italic text-[16px] text-cs-green truncate">
                      {l.full_name ?? "Unnamed lead"}
                    </div>
                    <div className="text-[11px] text-cs-muted truncate">
                      {l.email}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-cs-muted leading-relaxed">
                  <div>
                    <span className="text-cs-green">{cityName}</span>
                    {" · "}
                    <span className="truncate inline-block max-w-[180px] align-bottom">
                      {clubName}
                    </span>
                  </div>
                  <div className="mt-1">
                    {timeAgo(l.last_seen_at)} · {l.application_status === "account_created" ? "no application" : "started"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.18em] uppercase text-cs-muted">
                    Step
                  </div>
                  <div className="font-display italic text-[18px] text-cs-green mt-0.5">
                    {l.application_step}/{TOTAL_STEPS}
                    <span className="text-[11px] text-cs-muted font-sans not-italic ml-2 tracking-[0.08em]">
                      {completion}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.18em] uppercase text-cs-muted">
                    Reminders
                  </div>
                  <div className="text-[12px] text-cs-green mt-0.5">
                    {l.reminder_count}
                    {l.reminder_sent_at && (
                      <span className="text-[10px] text-cs-muted ml-2">
                        last {timeAgo(l.reminder_sent_at)}
                      </span>
                    )}
                  </div>
                </div>
                <LeadRowActions
                  profileId={l.id}
                  canRemind={cooldownLeft === 0}
                  cooldownHoursLeft={Math.ceil(cooldownLeft)}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#FBF8F0] px-5 py-3 min-w-[140px]">
      <div className="text-[10px] tracking-[0.18em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[24px] text-cs-green leading-none mt-1">
        {value}
      </div>
    </div>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function countSubmittedSince(days: number): Promise<number> {
  const supabase = createClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("application_submitted_at", since);
  return count ?? 0;
}

/**
 * The `applications.payload` JSONB starts at `'{}'::jsonb` (handle_new_user
 * trigger). Anything other than a present, empty object means the wizard's
 * submit ran. Defensive against null + the rare case where PostgREST hands
 * back a raw JSON string instead of a parsed value.
 */
function isEmptyPayload(p: unknown): boolean {
  if (p === null || p === undefined) return true;
  if (typeof p === "object") return Object.keys(p as object).length === 0;
  if (typeof p === "string") {
    if (p === "" || p === "{}" || p === "null") return true;
    try {
      const parsed = JSON.parse(p);
      return (
        parsed === null ||
        (typeof parsed === "object" && Object.keys(parsed).length === 0)
      );
    } catch {
      return false;
    }
  }
  return false;
}

async function computeReminderResponse(): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("application_status, reminder_count")
    .gt("reminder_count", 0);
  const reminded = (data ?? []) as { application_status: string; reminder_count: number }[];
  if (reminded.length === 0) return 0;
  const submitted = reminded.filter(
    (r) =>
      r.application_status === "application_submitted" ||
      r.application_status === "approved" ||
      r.application_status === "waitlisted",
  ).length;
  return Math.round((submitted / reminded.length) * 100);
}
