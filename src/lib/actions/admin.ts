"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendStatusChange } from "@/lib/email";

/**
 * Discriminated-union return type for admin server actions. Declared
 * explicitly so the discrimination survives the Server Action boundary
 * (inferred `as const` literal unions degrade to optional fields when
 * imported into Client Components, which breaks narrowing in callers).
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const ReviewSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(["approved", "waitlisted", "rejected"]),
  note: z.string().max(1000).optional().or(z.literal("")),
});

/**
 * Discriminated union for the admin gate. The `ok` field is the
 * discriminator — narrowing on `auth.ok` gives TypeScript a clean
 * `error: string` on the failure branch and `supabase`/`userId`/`role`
 * on the success branch, without the `"error" in auth` narrowing
 * weakness that previously inferred `string | undefined`.
 */
type AdminAuth =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: ReturnType<typeof createClient>;
      userId: string;
      role: "admin" | "steward";
    };

async function requireAdminClient(): Promise<AdminAuth> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (!role || (role !== "admin" && role !== "steward"))
    return { ok: false, error: "Forbidden." };
  return { ok: true, supabase, userId: user.id, role };
}

/**
 * Approve / waitlist / reject an application. The DB trigger
 * (`sync_profile_status_from_application`) mirrors status to profile +
 * sets joined_at on approval. We then fire a Resend status email.
 */
export async function reviewApplication(
  input: z.infer<typeof ReviewSchema>,
): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  const v = parsed.data;

  // Load the application + applicant for the email
  const { data: app } = await supabase
    .from("applications")
    .select("id, profile_id, status")
    .eq("id", v.applicationId)
    .maybeSingle();
  if (!app) return { ok: false, error: "Application not found." } as const;
  if (app.status !== "pending")
    return { ok: false, error: "Application already reviewed." } as const;

  const { error } = await supabase
    .from("applications")
    .update({
      status: v.status,
      review_note: v.note || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", v.applicationId);
  if (error) return { ok: false, error: error.message } as const;

  // Fetch applicant contact and fire email (best-effort)
  const { data: applicant } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", app.profile_id as string)
    .maybeSingle();
  if (applicant?.email) {
    void sendStatusChange({
      to: applicant.email as string,
      firstName: (applicant.full_name as string | null)?.split(" ")[0],
      status: v.status,
      note: v.note,
    }).catch((e) => console.error("[email] sendStatusChange failed:", e));
  }

  // Sync linked nomination's status (if any) so the nominator sees the
  // outcome on their profile. Match the nomination by applied_profile_id.
  const nomStatus =
    v.status === "approved" ? "approved" : "declined";
  await supabase
    .from("nominations")
    .update({ status: nomStatus })
    .eq("applied_profile_id", app.profile_id as string)
    .eq("status", "applied");

  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  revalidatePath("/app/profile");
  return { ok: true } as const;
}

const RoleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["member", "steward", "admin"]),
});

/**
 * Only existing admins can promote anyone to admin or demote an admin.
 * Stewards can toggle member ↔ steward but cannot grant admin.
 */
export async function setMemberRole(
  input: z.infer<typeof RoleSchema>,
): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, role } = auth;

  const parsed = RoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  const v = parsed.data;

  if (v.role === "admin" && role !== "admin")
    return { ok: false, error: "Only admins can grant admin." } as const;

  // Verify target isn't an admin if caller is steward
  if (role === "steward") {
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", v.profileId)
      .maybeSingle();
    if (target?.role === "admin")
      return { ok: false, error: "Only admins can demote admins." } as const;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: v.role })
    .eq("id", v.profileId);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/admin/members");
  return { ok: true } as const;
}

/** Open a new season; closes the currently active one. */
export async function openNewSeason(year: number): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (auth.role !== "admin")
    return { ok: false, error: "Only admins can open seasons." };
  const supabase = auth.supabase;

  // Close current
  await supabase
    .from("seasons")
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq("active", true);

  // Open new
  const { error } = await supabase
    .from("seasons")
    .insert({ year, active: true });
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/admin/seasons");
  revalidatePath("/app/ranking");
  return { ok: true } as const;
}

/* ────────── Admin: groups override ────────── */

/**
 * Admin can delete any group regardless of who created it. Uses the service
 * client because the default RLS only lets the creator delete their own group.
 */
export async function adminDeleteGroup(groupId: string): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const svc = createServiceClient();
  const { error } = await svc.from("groups").delete().eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/groups");
  return { ok: true };
}

/* ────────── Admin: cities & clubs CRUD ────────── */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const CityInput = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function createCity(
  input: z.infer<typeof CityInput>,
): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = CityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const slug = slugify(parsed.data.name);
  if (!slug) return { ok: false, error: "Name produces empty slug." };
  const { error } = await auth.supabase
    .from("cities")
    .insert({ name: parsed.data.name, slug });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/locations");
  revalidatePath("/apply");
  return { ok: true };
}

export async function updateCity(
  id: string,
  patch: { name?: string; active?: boolean },
): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < 2) return { ok: false, error: "Name too short." };
    updates.name = name;
  }
  if (patch.active !== undefined) updates.active = patch.active;
  if (Object.keys(updates).length === 0) return { ok: true };
  const { error } = await auth.supabase
    .from("cities")
    .update(updates)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/locations");
  revalidatePath("/apply");
  return { ok: true };
}

const ClubInput = z.object({
  city_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
});

export async function createClub(
  input: z.infer<typeof ClubInput>,
): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = ClubInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const slug = slugify(parsed.data.name);
  if (!slug) return { ok: false, error: "Name produces empty slug." };
  const { error } = await auth.supabase
    .from("clubs")
    .insert({
      city_id: parsed.data.city_id,
      name: parsed.data.name,
      slug,
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/locations");
  revalidatePath("/apply");
  return { ok: true };
}

export async function updateClub(
  id: string,
  patch: { name?: string; active?: boolean },
): Promise<ActionResult> {
  const auth = await requireAdminClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < 2) return { ok: false, error: "Name too short." };
    updates.name = name;
  }
  if (patch.active !== undefined) updates.active = patch.active;
  if (Object.keys(updates).length === 0) return { ok: true };
  const { error } = await auth.supabase
    .from("clubs")
    .update(updates)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/locations");
  revalidatePath("/apply");
  return { ok: true };
}
