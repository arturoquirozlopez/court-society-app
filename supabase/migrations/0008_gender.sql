-- =====================================================================
-- Court Society — gender field on profiles
-- =====================================================================
-- Used only to split the ranking into Men / Women / All. Mixed matches
-- still happen and still count toward activity multipliers, but they
-- don't award ranking points (so the M / F rankings stay clean).
-- Optional — nullable for members who prefer not to answer.

alter table profiles
  add column gender text check (gender in ('M', 'F'));

create index profiles_gender_idx on profiles(gender) where gender is not null;
