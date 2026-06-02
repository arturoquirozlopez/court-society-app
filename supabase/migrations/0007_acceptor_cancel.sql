-- =====================================================================
-- Court Society — accepted challenges may be cancelled by either side
-- =====================================================================
-- Once a challenge is accepted, time stops mattering — the two players
-- can play whenever. But if the match never happens, either of them
-- should be able to mark the challenge as cancelled so it leaves the
-- feed. Author already could (via "challenges author update"); this adds
-- the acceptor.

create policy "challenges acceptor cancel"
  on challenges for update to authenticated
  using (
    status = 'accepted'
    and accepted_by = auth.uid()
  )
  with check (
    status = 'cancelled'
  );
