"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const NewGroupInput = z.object({
  name: z.string().trim().min(2, "Give the group a name.").max(80),
  member_ids: z
    .array(z.string().uuid())
    .min(1, "Pick at least one other member.")
    .max(80),
});

/**
 * Create a private ranking group. Caller becomes a member automatically
 * via the `on_group_created` trigger. The remaining selected member_ids
 * are inserted as group_members rows. RLS verifies that those ids belong
 * to approved members and that the caller is the group's creator.
 */
export async function createGroup(
  input: z.infer<typeof NewGroupInput>,
): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = NewGroupInput.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  const v = parsed.data;

  const { data: created, error } = await supabase
    .from("groups")
    .insert({ name: v.name, creator_id: user.id })
    .select("id")
    .single();
  if (error || !created)
    return { ok: false, error: error?.message ?? "Insert failed." };

  const group = created as { id: string };
  const otherMembers = v.member_ids.filter((id) => id !== user.id);

  if (otherMembers.length > 0) {
    const { error: insertErr } = await supabase
      .from("group_members")
      .insert(
        otherMembers.map((profile_id) => ({
          group_id: group.id,
          profile_id,
        })),
      );
    if (insertErr) {
      // Roll back the empty group so we don't leave a creator-only artifact
      await supabase.from("groups").delete().eq("id", group.id);
      return { ok: false, error: insertErr.message };
    }
  }

  revalidatePath("/app/ranking");
  return { ok: true, id: group.id };
}

/** Rename — creator only (RLS enforces it). */
export async function renameGroup(
  id: string,
  name: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80)
    return { ok: false, error: "Name must be 2–80 characters." };
  const { error } = await supabase
    .from("groups")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/ranking");
  return { ok: true };
}

/** Delete — creator only. Cascades to group_members. */
export async function deleteGroup(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/ranking");
  return { ok: true };
}

/** Leave — any member can remove themselves. */
export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/ranking");
  return { ok: true };
}

/** Add members to an existing group (creator only). */
export async function addGroupMembers(
  groupId: string,
  memberIds: string[],
): Promise<ActionResult> {
  if (memberIds.length === 0) return { ok: true };
  const supabase = createClient();
  const { error } = await supabase
    .from("group_members")
    .insert(
      memberIds.map((profile_id) => ({ group_id: groupId, profile_id })),
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/ranking");
  return { ok: true };
}

/** Remove a specific member (creator only, or self). */
export async function removeGroupMember(
  groupId: string,
  profileId: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", profileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/ranking");
  return { ok: true };
}
