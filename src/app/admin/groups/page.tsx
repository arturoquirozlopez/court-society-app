import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getProfilesByIds } from "@/lib/queries";
import { GroupsAdminClient } from "./GroupsClient";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  await requireAdmin();
  // Use service client to bypass RLS — admin should see every group, not just
  // the ones they belong to.
  const svc = createServiceClient();

  const { data: groupsData } = await svc
    .from("groups")
    .select("id, name, creator_id, created_at")
    .order("created_at", { ascending: false });

  const groupIds = (groupsData ?? []).map((g) => g.id as string);
  const { data: gmRows } = groupIds.length
    ? await svc
        .from("group_members")
        .select("group_id, profile_id, status, joined_at")
        .in("group_id", groupIds)
    : { data: [] as { group_id: string; profile_id: string; status: string; joined_at: string }[] };

  const accepted = new Map<string, string[]>();
  const pending = new Map<string, string[]>();
  for (const r of gmRows ?? []) {
    const map = r.status === "accepted" ? accepted : pending;
    const arr = map.get(r.group_id as string) ?? [];
    arr.push(r.profile_id as string);
    map.set(r.group_id as string, arr);
  }

  const allProfileIds = Array.from(
    new Set([
      ...(groupsData ?? []).map((g) => g.creator_id as string),
      ...(gmRows ?? []).map((r) => r.profile_id as string),
    ]),
  );
  const profiles = await getProfilesByIds(allProfileIds);
  const profileById = new Map<string, Profile>(
    profiles.map((p) => [p.id, p] as const),
  );

  const rows = ((groupsData ?? []) as unknown as {
    id: string;
    name: string;
    creator_id: string;
    created_at: string;
  }[]).map((g) => ({
    ...g,
    creator: profileById.get(g.creator_id) ?? null,
    accepted_members: (accepted.get(g.id) ?? []).map(
      (id) => profileById.get(id) ?? null,
    ),
    pending_members: (pending.get(g.id) ?? []).map(
      (id) => profileById.get(id) ?? null,
    ),
  }));

  return <GroupsAdminClient rows={rows} />;
}
