-- =====================================================================
-- Court Society — initial schema (Phase 1 MVP)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------------------------------------------------
create type member_status   as enum ('pending','approved','waitlisted','rejected');
create type member_role     as enum ('member','steward','admin');
create type play_level      as enum ('beginner','recreational','intermediate','strong_club','competitive','former_pro');
create type play_format     as enum ('singles','doubles','both');
create type play_frequency  as enum ('less_than_weekly','weekly','two_to_three','four_plus');
create type challenge_status as enum ('open','accepted','expired','cancelled');
create type match_status    as enum ('pending','confirmed','disputed');
create type match_result    as enum ('W','L');

-- ---------- reference tables -----------------------------------------
create table cities (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table clubs (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references cities(id) on delete restrict,
  slug        text not null,
  name        text not null,
  is_other    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (city_id, slug)
);
create index clubs_city_idx on clubs(city_id);

-- ---------- profiles (1:1 auth.users) -------------------------------
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null unique,
  full_name         text,
  photo_url         text,
  headline          text,
  linkedin_url      text,
  whatsapp          text,
  role              member_role   not null default 'member',
  status            member_status not null default 'pending',
  home_city_id      uuid references cities(id),
  home_club_id      uuid references clubs(id),
  other_club_name   text,
  level             play_level,
  format            play_format,
  frequency         play_frequency,
  travel_city_ids   uuid[] not null default '{}',
  nominated_by_text text,
  joined_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index profiles_status_idx on profiles(status);
create index profiles_city_idx   on profiles(home_city_id);
create index profiles_role_idx   on profiles(role);

-- ---------- visiting plans ------------------------------------------
create table visiting_plans (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  city_id     uuid not null references cities(id),
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now()
);
create index visiting_plans_lookup on visiting_plans(profile_id, city_id);

-- ---------- applications --------------------------------------------
create table applications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  status       member_status not null default 'pending',
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz,
  review_note  text,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index applications_status_idx  on applications(status);
create index applications_profile_idx on applications(profile_id);

-- ---------- seasons -------------------------------------------------
create table seasons (
  id          uuid primary key default gen_random_uuid(),
  year        int unique not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  active      boolean not null default true
);
-- Only one active season at a time
create unique index seasons_one_active on seasons (active) where active = true;

-- ---------- challenges ----------------------------------------------
create table challenges (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references profiles(id) on delete cascade,
  city_id      uuid not null references cities(id),
  level        play_level not null,
  format       play_format not null default 'singles',
  note         text,
  status       challenge_status not null default 'open',
  accepted_by  uuid references profiles(id),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '72 hours'),
  created_at   timestamptz not null default now()
);
create index challenges_open_idx on challenges(city_id, status, expires_at);

create table challenge_clubs (
  challenge_id uuid not null references challenges(id) on delete cascade,
  club_id      uuid not null references clubs(id),
  primary key (challenge_id, club_id)
);

create table challenge_passes (
  challenge_id uuid not null references challenges(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (challenge_id, profile_id)
);

-- ---------- matches -------------------------------------------------
create table matches (
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid not null references seasons(id),
  author_id      uuid not null references profiles(id) on delete cascade,
  opponent_id    uuid not null references profiles(id) on delete cascade,
  author_result  match_result not null,
  score          text,
  note           text,
  status         match_status not null default 'pending',
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now(),
  check (author_id <> opponent_id)
);
create index matches_author_idx   on matches(author_id, status);
create index matches_opponent_idx on matches(opponent_id, status);
create index matches_season_idx   on matches(season_id, status);

-- ---------- helpers --------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated
  before update on profiles
  for each row execute function set_updated_at();

create or replace function is_admin(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','steward') from profiles where id = uid), false);
$$;

create or replace function is_approved(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' from profiles where id = uid), false);
$$;

-- Block non-admins from changing role or status
create or replace function prevent_self_promotion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.status is distinct from old.status)
     and not is_admin(auth.uid()) then
    raise exception 'forbidden: cannot change role or status';
  end if;
  return new;
end $$;

create trigger profiles_prevent_promotion
  before update on profiles
  for each row execute function prevent_self_promotion();

-- New auth user → profile + application rows
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
    values (new.id, coalesce(new.email, ''))
    on conflict (id) do nothing;
  insert into public.applications (profile_id, status, payload)
    values (new.id, 'pending', '{}'::jsonb);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- When admin moves an application to 'approved' → reflect on profile + set joined_at
create or replace function sync_profile_status_from_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    update public.profiles
      set status = new.status,
          joined_at = case when new.status = 'approved' and joined_at is null then now() else joined_at end
      where id = new.profile_id;
  end if;
  return new;
end $$;

create trigger applications_sync_profile
  after update of status on applications
  for each row execute function sync_profile_status_from_application();

-- =====================================================================
-- Row-Level Security
-- =====================================================================

alter table cities          enable row level security;
alter table clubs           enable row level security;
alter table seasons         enable row level security;
alter table profiles        enable row level security;
alter table visiting_plans  enable row level security;
alter table applications    enable row level security;
alter table challenges      enable row level security;
alter table challenge_clubs enable row level security;
alter table challenge_passes enable row level security;
alter table matches         enable row level security;

-- Reference tables: world-readable for any authed user; admin writes
create policy "cities read"   on cities   for select to authenticated using (true);
create policy "clubs read"    on clubs    for select to authenticated using (true);
create policy "seasons read"  on seasons  for select to authenticated using (true);

create policy "cities admin"  on cities   for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "clubs admin"   on clubs    for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "seasons admin" on seasons  for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- Profiles
create policy "profile self select"     on profiles for select to authenticated
  using (auth.uid() = id);
create policy "profile approved select" on profiles for select to authenticated
  using (is_approved(auth.uid()) and status = 'approved');
create policy "profile admin select"    on profiles for select to authenticated
  using (is_admin(auth.uid()));
create policy "profile self update"     on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profile admin update"    on profiles for update to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- Visiting plans
create policy "vp self all"        on visiting_plans for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "vp approved read"   on visiting_plans for select to authenticated
  using (is_approved(auth.uid()));
create policy "vp admin all"       on visiting_plans for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- Applications
create policy "app self select"  on applications for select to authenticated
  using (profile_id = auth.uid());
create policy "app admin select" on applications for select to authenticated
  using (is_admin(auth.uid()));
create policy "app self update"  on applications for update to authenticated
  using (profile_id = auth.uid() and status = 'pending')
  with check (profile_id = auth.uid() and status = 'pending');
create policy "app admin update" on applications for update to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
-- Insert handled by trigger; deny direct inserts
create policy "app no insert" on applications for insert to authenticated
  with check (false);

-- Challenges
create policy "challenges approved read" on challenges for select to authenticated
  using (is_approved(auth.uid()));
create policy "challenges author insert" on challenges for insert to authenticated
  with check (is_approved(auth.uid()) and author_id = auth.uid());
create policy "challenges author update" on challenges for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "challenges accept" on challenges for update to authenticated
  using (
    is_approved(auth.uid())
    and status = 'open'
    and expires_at > now()
    and author_id <> auth.uid()
  )
  with check (
    accepted_by = auth.uid() and status = 'accepted'
  );

-- Challenge clubs
create policy "cc read"   on challenge_clubs for select to authenticated
  using (is_approved(auth.uid()));
create policy "cc author" on challenge_clubs for all to authenticated
  using (exists (select 1 from challenges c where c.id = challenge_id and c.author_id = auth.uid()))
  with check (exists (select 1 from challenges c where c.id = challenge_id and c.author_id = auth.uid()));

-- Challenge passes
create policy "cp self select" on challenge_passes for select to authenticated
  using (profile_id = auth.uid());
create policy "cp self insert" on challenge_passes for insert to authenticated
  with check (profile_id = auth.uid() and is_approved(auth.uid()));

-- Matches
create policy "matches participants" on matches for select to authenticated
  using (auth.uid() in (author_id, opponent_id));
create policy "matches confirmed read" on matches for select to authenticated
  using (is_approved(auth.uid()) and status = 'confirmed');
create policy "matches insert author" on matches for insert to authenticated
  with check (
    is_approved(auth.uid())
    and author_id = auth.uid()
    and exists (select 1 from profiles p where p.id = opponent_id and p.status = 'approved')
  );
create policy "matches opponent confirm" on matches for update to authenticated
  using (opponent_id = auth.uid() and status = 'pending')
  with check (opponent_id = auth.uid() and status in ('confirmed','disputed'));

-- =====================================================================
-- Storage: avatars bucket
-- =====================================================================

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
