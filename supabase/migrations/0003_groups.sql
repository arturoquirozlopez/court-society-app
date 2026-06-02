-- =====================================================================
-- Court Society — private ranking groups
-- =====================================================================
-- A `group` is a private league within Court Society. A creator picks a
-- handful of members; the app then renders a ranking scoped to that
-- subset. Useful for "my regular foursome", "Polo Club friends", or
-- "Miami crew during travel weeks".

create table groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  creator_id   uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  check (char_length(name) between 2 and 80)
);
create index groups_creator_idx on groups(creator_id);

create table group_members (
  group_id    uuid not null references groups(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index group_members_profile_idx on group_members(profile_id);

-- ----- Helper (SECURITY DEFINER bypasses RLS to avoid recursive policy
--       evaluation when group_members policies reference themselves).
create or replace function is_group_member(gid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = uid
  );
$$;

-- ----- Trigger: when a group is created, add creator as a member ------
create or replace function add_group_creator_as_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, profile_id)
  values (new.id, new.creator_id)
  on conflict do nothing;
  return new;
end $$;

create trigger on_group_created
  after insert on groups
  for each row execute function add_group_creator_as_member();

-- ----- RLS ----------------------------------------------------------------
alter table groups        enable row level security;
alter table group_members enable row level security;

-- Members (incl. creator via the trigger) can read the group row
create policy "groups read by member" on groups for select to authenticated
  using (is_group_member(id, auth.uid()));

create policy "groups admin read" on groups for select to authenticated
  using (is_admin(auth.uid()));

-- Approved members can create groups they own
create policy "groups insert by self" on groups for insert to authenticated
  with check (
    creator_id = auth.uid() and is_approved(auth.uid())
  );

-- Only creator can rename / delete
create policy "groups update by creator" on groups for update to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "groups delete by creator" on groups for delete to authenticated
  using (creator_id = auth.uid());

-- Group members rows: readable to anyone in the group
create policy "gm read by member" on group_members for select to authenticated
  using (is_group_member(group_id, auth.uid()));

create policy "gm admin read" on group_members for select to authenticated
  using (is_admin(auth.uid()));

-- Only the group's creator can add new members; nominee must be approved
create policy "gm insert by creator" on group_members for insert to authenticated
  with check (
    exists (
      select 1 from groups g
      where g.id = group_id and g.creator_id = auth.uid()
    )
    and exists (
      select 1 from profiles p
      where p.id = profile_id and p.status = 'approved'
    )
  );

-- Anyone can remove themselves; creator can remove anyone in the group
create policy "gm delete self or by creator" on group_members for delete to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from groups g
      where g.id = group_id and g.creator_id = auth.uid()
    )
  );
