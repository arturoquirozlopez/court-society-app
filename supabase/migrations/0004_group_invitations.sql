-- =====================================================================
-- Court Society — group membership requires acceptance
-- =====================================================================
-- Members invited to a private group now have a `pending` row until they
-- accept (status → 'accepted') or decline (row deleted). Existing rows
-- are kept as 'accepted' so the migration is non-breaking.

alter table group_members
  add column status text not null default 'pending'
  check (status in ('pending', 'accepted'));

-- Backfill: any pre-existing rows were already-active members
update group_members set status = 'accepted';

-- Re-set default so future creator inserts (via trigger) and future
-- API inserts are explicit about the state.

-- Creator trigger now explicitly creates an accepted row
create or replace function add_group_creator_as_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, profile_id, status)
  values (new.id, new.creator_id, 'accepted')
  on conflict do nothing;
  return new;
end $$;

-- is_group_member now means "accepted member"
create or replace function is_group_member(gid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = uid and status = 'accepted'
  );
$$;

-- New helper: "knows about this group" — used for visibility (incl. pending invitees)
create or replace function is_in_group(gid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = uid
  );
$$;

-- ----- Updated policies -----

-- A pending invitee should be able to see the group row to accept/decline
drop policy if exists "groups read by member" on groups;
create policy "groups read by member or invitee" on groups for select to authenticated
  using (is_in_group(id, auth.uid()));

-- A pending invitee should NOT see other members yet — only their own row.
-- Other group_members rows visible only to accepted members.
drop policy if exists "gm read by member" on group_members;
create policy "gm read self or by accepted member"
  on group_members for select to authenticated
  using (
    profile_id = auth.uid()
    or is_group_member(group_id, auth.uid())
  );

-- Invitee can flip their own pending row → accepted
create policy "gm self accept invitation"
  on group_members for update to authenticated
  using (profile_id = auth.uid() and status = 'pending')
  with check (profile_id = auth.uid() and status = 'accepted');
