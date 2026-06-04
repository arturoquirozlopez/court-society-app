-- =====================================================================
-- Court Society — denormalised match city
-- =====================================================================
-- Some matches are logged directly without a challenge link, so the only
-- source of truth for "where was this match played" should live on the
-- match itself. The log-match server action sets `city_id` from the linked
-- challenge if present, falling back to the author's home city.

alter table matches
  add column city_id uuid references cities(id);

-- Backfill: prefer the challenge city; otherwise the author's home city.
update matches m
   set city_id = c.city_id
  from challenges c
 where m.challenge_id = c.id
   and m.city_id is null;

update matches m
   set city_id = p.home_city_id
  from profiles p
 where m.author_id = p.id
   and m.city_id is null
   and p.home_city_id is not null;

create index if not exists matches_city_idx on matches(city_id);
