"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendApplicationReminder } from "@/lib/email";

const REMINDER_COOLDOWN_HOURS = 48;

type Result = { ok: true } | { ok: false; error: string };

/**
 * Manually send the "Complete your application" reminder to a lead. Enforces
 * the 48-hour cooldown server-side so a leaning-on-refresh admin can't
 * spam the same person.
 */
export async function sendLeadReminder(profileId: string): Promise<Result> {
  await requireAdmin();
  const supabase = createClient();

  // `select("*")` so we don't crash when migration 0012 hasn't yet added
  // the reminder columns. Cast through Record so missing columns surface
  // as `undefined`, not as a query error.
  const { data: leadRaw, error: leadErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  if (leadErr) {
    console.error("[sendLeadReminder] profile lookup failed", leadErr);
    return { ok: false, error: leadErr.message };
  }
  if (!leadRaw) return { ok: false, error: "Lead not found." };
  const r = leadRaw as Record<string, unknown>;
  const row = {
    id: String(r.id ?? ""),
    email: String(r.email ?? ""),
    full_name: (r.full_name as string | null) ?? null,
    reminder_sent_at: (r.reminder_sent_at as string | null) ?? null,
  };
  if (!row.email)
    return { ok: false, error: "Lead has no email on file." };

  // Source of truth: the application row. Status must still be pending and
  // payload must be empty (legacy magic-link users may have payload='{}'
  // exactly as the trigger seeded it).
  const { data: appRow } = await supabase
    .from("applications")
    .select("status, payload")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!appRow)
    return { ok: false, error: "No application row for this lead." };
  const app = appRow as { status: string; payload: unknown };
  if (app.status !== "pending")
    return { ok: false, error: "Lead is no longer pending." };
  if (!isEmptyPayload(app.payload))
    return { ok: false, error: "Application is already submitted." };

  if (row.reminder_sent_at) {
    const last = new Date(row.reminder_sent_at).getTime();
    const elapsedHrs = (Date.now() - last) / 3600000;
    if (elapsedHrs < REMINDER_COOLDOWN_HOURS)
      return {
        ok: false,
        error: `Reminder cooldown — try again in ${Math.ceil(REMINDER_COOLDOWN_HOURS - elapsedHrs)} h.`,
      };
  }

  try {
    await sendApplicationReminder({
      to: row.email,
      firstName: row.full_name?.split(" ")[0],
    });
  } catch (e) {
    return {
      ok: false,
      error: `Email failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }

  // Increment the counter. The email already left; this just persists the
  // bookkeeping. If the normal client update fails (RLS surprise / column
  // missing), fall back to the service-role client so the cooldown still
  // takes effect and the counter advances.
  const nextCount = (await currentReminderCount(profileId)) + 1;
  const updatePayload = {
    reminder_sent_at: new Date().toISOString(),
    reminder_count: nextCount,
  };
  const { data: updData, error: updErr, status: updStatus } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", profileId)
    .select("id, reminder_count, reminder_sent_at");
  console.log("[sendLeadReminder] update", {
    profileId,
    nextCount,
    status: updStatus,
    rowsReturned: updData?.length ?? 0,
    error: updErr?.message ?? null,
  });
  if (updErr || (updData?.length ?? 0) === 0) {
    console.warn(
      "[sendLeadReminder] anon client update did not persist — retrying with service role",
      { error: updErr?.message, rowsReturned: updData?.length ?? 0 },
    );
    try {
      const admin = createServiceClient();
      const { data: svcData, error: svcErr } = await admin
        .from("profiles")
        .update(updatePayload)
        .eq("id", profileId)
        .select("id, reminder_count, reminder_sent_at");
      console.log("[sendLeadReminder] service-role update", {
        rowsReturned: svcData?.length ?? 0,
        error: svcErr?.message ?? null,
      });
    } catch (e) {
      console.error("[sendLeadReminder] service-role update threw", e);
    }
  }
  revalidatePath("/admin/incomplete");
  return { ok: true };
}

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

async function currentReminderCount(profileId: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("reminder_count")
    .eq("id", profileId)
    .maybeSingle();
  return ((data as { reminder_count?: number } | null)?.reminder_count ?? 0);
}

/**
 * "Mark not interested" — funnel-terminating action. Same data shape as
 * a rejection but tagged so we can report on it separately if needed.
 */
export async function markLeadNotInterested(
  profileId: string,
): Promise<Result> {
  return await terminate(profileId, "not_interested");
}

/**
 * "Archive" — same DB effect as not-interested but a different intent label.
 * Useful for clearing out stale account_created rows without judgement.
 */
export async function archiveLead(profileId: string): Promise<Result> {
  return await terminate(profileId, "archived");
}

async function terminate(
  profileId: string,
  reason: "not_interested" | "archived",
): Promise<Result> {
  await requireAdmin();
  const supabase = createClient();

  // Source of truth for "lead is no longer in the queue" is the application
  // row (legacy column). The sync trigger on `applications.status` will
  // mirror onto profiles.status and profiles.application_status if those
  // columns exist; we don't need to touch profiles ourselves.
  const { error: aErr } = await supabase
    .from("applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      review_note: `Lead ${reason}.`,
    })
    .eq("profile_id", profileId)
    .eq("status", "pending");
  if (aErr) return { ok: false, error: aErr.message };

  // Best-effort: try to flip application_status directly too. If migration
  // 0012 hasn't landed, the column is missing and we skip silently.
  const { error: pErr } = await supabase
    .from("profiles")
    .update({ application_status: "rejected" })
    .eq("id", profileId);
  if (pErr)
    console.warn(
      "[terminate] application_status update skipped (migration 0012 likely pending)",
      pErr.message,
    );

  revalidatePath("/admin/incomplete");
  return { ok: true };
}
