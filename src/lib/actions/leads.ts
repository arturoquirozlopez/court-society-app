"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const { data: lead } = await supabase
    .from("profiles")
    .select("id, email, full_name, status, reminder_sent_at")
    .eq("id", profileId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found." };
  const row = lead as {
    id: string;
    email: string;
    full_name: string | null;
    status: string;
    reminder_sent_at: string | null;
  };
  if (row.status !== "pending")
    return { ok: false, error: "Lead is no longer incomplete." };

  // Confirm the application is actually empty (payload-driven, so we don't
  // depend on application_status classification).
  const { data: appRow } = await supabase
    .from("applications")
    .select("payload")
    .eq("profile_id", profileId)
    .maybeSingle();
  const payload = (appRow as { payload?: Record<string, unknown> | null } | null)?.payload;
  if (payload && Object.keys(payload).length > 0)
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

  await supabase
    .from("profiles")
    .update({
      reminder_sent_at: new Date().toISOString(),
      reminder_count: (await currentReminderCount(profileId)) + 1,
    })
    .eq("id", profileId);
  revalidatePath("/admin/incomplete");
  return { ok: true };
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
  // Update profile + the underlying application atomically (best-effort).
  const { error: pErr } = await supabase
    .from("profiles")
    .update({ application_status: "rejected" })
    .eq("id", profileId);
  if (pErr) return { ok: false, error: pErr.message };

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

  revalidatePath("/admin/incomplete");
  return { ok: true };
}
