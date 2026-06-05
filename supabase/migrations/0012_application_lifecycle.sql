-- =====================================================================
-- Court Society — application lifecycle (auth redesign)
-- =====================================================================
-- Introduces an explicit application_status enum on profiles so the admin
-- can tell apart "account created but didn't fill anything" from "applied,
-- waiting for review". Powers the Incomplete Applications queue and the
-- reminder feature. No new tables.
--
-- The legacy member_status on profiles + applications stays in place so
-- existing queries and the approval trigger don't break.

create type application_status as enum (
  'account_created',
  'application_started',
  'application_submitted',
  'approved',
  'waitlisted',
  'rejected'
);

alter table profiles
  add column application_status      application_status not null default 'account_created',
  add column application_started_at  timestamptz,
  add column application_submitted_at timestamptz,
  add column application_step        smallint not null default 0,
  add column reminder_sent_at        timestamptz,
  add column reminder_count          int not null default 0,
  add column password_set_at         timestamptz;

-- Backfill: derive the new state from existing data so the dashboard works
-- immediately after migrating.
update profiles p
   set application_status = case
        when p.status = 'approved'   then 'approved'::application_status
        when p.status = 'waitlisted' then 'waitlisted'::application_status
        when p.status = 'rejected'   then 'rejected'::application_status
        when exists (
          select 1 from applications a
           where a.profile_id = p.id and a.payload <> '{}'::jsonb
        ) then 'application_submitted'::application_status
        else 'account_created'::application_status
      end,
      application_submitted_at = case
        when p.status in ('approved','waitlisted','rejected')
          then coalesce(p.joined_at, p.updated_at)
        else null
      end;

create index if not exists profiles_application_status_idx
  on profiles(application_status);

-- When an admin moves an application's member_status, mirror it onto the
-- new enum too. (The original sync_profile_status_from_application trigger
-- continues to manage joined_at.)
create or replace function sync_application_status_v2() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    update public.profiles
       set application_status = (new.status::text)::application_status
     where id = new.profile_id
       and new.status::text in ('approved','waitlisted','rejected');
  end if;
  return new;
end $$;

drop trigger if exists sync_application_status_v2_trg on applications;
create trigger sync_application_status_v2_trg
  after update on applications
  for each row execute function sync_application_status_v2();
