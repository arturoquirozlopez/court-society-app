-- =====================================================================
-- Court Society — first-time onboarding flag
-- =====================================================================
-- New approved members see a 5-slide onboarding flow on first entry.
-- Existing members (already approved when this migration runs) are
-- backfilled to `true` so we don't surprise them with a tutorial.

alter table profiles
  add column onboarding_completed boolean not null default false;

-- Backfill: anyone already approved has been using the app without it.
update profiles
  set onboarding_completed = true
  where status = 'approved';
