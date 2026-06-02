-- =====================================================================
-- Court Society — match results must come from accepted challenges
-- =====================================================================
-- Every new match is linked to an accepted challenge. The optional FK
-- (set null on delete) preserves historical data if a challenge is ever
-- removed. The unique index ensures only one match per challenge.

alter table matches
  add column challenge_id uuid references challenges(id) on delete set null;

create unique index matches_challenge_unique
  on matches(challenge_id)
  where challenge_id is not null;

create index matches_pair_idx
  on matches(author_id, opponent_id, created_at);
