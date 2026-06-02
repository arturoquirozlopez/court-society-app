-- =====================================================================
-- Court Society — direct challenges
-- =====================================================================
-- A challenge can now be directed at a specific member. When target_id
-- is set, only the author and the target see it (and only the target
-- can accept/decline). When target_id is null, behaviour is unchanged
-- (open challenge visible to any approved member in the same city).

alter table challenges
  add column target_id uuid references profiles(id) on delete cascade;

create index challenges_target_idx
  on challenges(target_id)
  where target_id is not null;

-- ----- Updated read policy --------------------------------------------
drop policy if exists "challenges approved read" on challenges;

create policy "challenges approved read"
  on challenges for select to authenticated
  using (
    is_approved(auth.uid()) and (
      target_id is null
      or author_id = auth.uid()
      or target_id = auth.uid()
    )
  );

-- ----- Accept policy: only the target may accept a directed one -------
drop policy if exists "challenges accept" on challenges;

create policy "challenges accept"
  on challenges for update to authenticated
  using (
    is_approved(auth.uid())
    and status = 'open'
    and expires_at > now()
    and author_id <> auth.uid()
    and (target_id is null or target_id = auth.uid())
  )
  with check (
    accepted_by = auth.uid() and status = 'accepted'
  );

-- ----- Decline policy: target can decline a direct challenge ----------
-- Decline is modelled as `status = 'cancelled'` (no new enum value).
-- Combined with target_id being set and accepted_by being null, that
-- means "the target said no thanks".
create policy "challenges decline by target"
  on challenges for update to authenticated
  using (
    target_id = auth.uid()
    and author_id <> auth.uid()
    and status = 'open'
  )
  with check (
    target_id = auth.uid()
    and status = 'cancelled'
  );
