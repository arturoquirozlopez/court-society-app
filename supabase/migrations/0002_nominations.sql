-- =====================================================================
-- Court Society — nominations
-- =====================================================================
-- A `nomination` is a private invitation from one approved member to a
-- prospective applicant. The token in the email link routes the nominee
-- straight into /apply with the nominator's name pre-attributed.

create type nomination_status as enum (
  'pending',     -- email sent, nominee hasn't applied yet
  'applied',     -- nominee submitted an application
  'approved',    -- application reviewed + approved
  'declined',    -- application reviewed + rejected/waitlisted
  'expired',     -- nominator cancelled or 30 days elapsed
  'cancelled'    -- nominator pulled the invite
);

create table nominations (
  id                   uuid primary key default gen_random_uuid(),
  token                uuid not null unique default gen_random_uuid(),
  nominator_id         uuid not null references profiles(id) on delete cascade,
  nominee_email        text not null,
  nominee_name         text not null,
  note                 text,
  status               nomination_status not null default 'pending',
  expires_at           timestamptz not null default (now() + interval '30 days'),
  applied_profile_id   uuid references profiles(id) on delete set null,
  applied_at           timestamptz,
  created_at           timestamptz not null default now()
);

create index nominations_token_idx       on nominations(token);
create index nominations_nominator_idx   on nominations(nominator_id);
create index nominations_email_idx       on nominations(lower(nominee_email));
create index nominations_status_idx      on nominations(status);

-- ----- RLS --------------------------------------------------------------

alter table nominations enable row level security;

-- A nominator can read their own nominations
create policy "nominations self read" on nominations for select to authenticated
  using (nominator_id = auth.uid());

-- Admins see everything
create policy "nominations admin read" on nominations for select to authenticated
  using (is_admin(auth.uid()));

-- Approved members can create nominations on their own behalf
create policy "nominations self insert" on nominations for insert to authenticated
  with check (
    nominator_id = auth.uid()
    and is_approved(auth.uid())
  );

-- A nominator can cancel/edit their pending nominations
create policy "nominations self update" on nominations for update to authenticated
  using (nominator_id = auth.uid() and status = 'pending')
  with check (nominator_id = auth.uid());

create policy "nominations admin update" on nominations for update to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ----- Public token lookup ----------------------------------------------
-- Nominees aren't authenticated yet when they click the email link. We
-- expose a SECURITY DEFINER function that returns the minimal info needed
-- to render the "You've been nominated by X" banner on /apply.

create or replace function nomination_by_token(t uuid)
  returns table (
    id            uuid,
    nominator_id  uuid,
    nominator_name text,
    nominee_email text,
    nominee_name  text,
    note          text,
    status        nomination_status,
    expires_at    timestamptz
  )
  language sql stable security definer set search_path = public as $$
  select
    n.id,
    n.nominator_id,
    p.full_name as nominator_name,
    n.nominee_email,
    n.nominee_name,
    n.note,
    n.status,
    n.expires_at
  from nominations n
  join profiles p on p.id = n.nominator_id
  where n.token = t
    and n.status = 'pending'
    and n.expires_at > now()
  limit 1;
$$;

grant execute on function nomination_by_token(uuid) to anon, authenticated;
