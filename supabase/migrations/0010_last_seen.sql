-- =====================================================================
-- Court Society — profile last-seen tracking
-- =====================================================================
-- Powers the Active / At Risk / Dormant slices on the admin analytics
-- dashboard, plus retention computations. Updated by a debounced server
-- helper called from the member-app layout (5 minute cadence).

alter table profiles
  add column last_seen_at timestamptz;

-- Backfill: best-known proxy for "last activity" before we started tracking.
update profiles
  set last_seen_at = greatest(
    coalesce(updated_at, created_at),
    coalesce(joined_at, created_at),
    created_at
  );

create index if not exists profiles_last_seen_idx
  on profiles(last_seen_at);
