-- =====================================================================
-- Court Society — wipe arturo@wareclouds.com
-- =====================================================================
-- Borra el usuario de prueba y TODO lo que esté asociado a él:
--   · profile + auth user
--   · matches (como autor u oponente)
--   · challenges (como autor, accepted_by o target) + challenge_clubs + challenge_passes
--   · nominations (hechas por él, y las que estén dirigidas a su email)
--   · groups creados por él + group_members
--   · visiting_plans
--   · applications con ese email
--
-- Corre como una transacción. Si algo falla, no borra nada.
-- Antes de correr: confirma que el email es el correcto.
-- =====================================================================

begin;

with target as (
  select id, email
  from auth.users
  where lower(email) = lower('arturo@wareclouds.com')
)
select count(*) as users_to_delete from target;
-- ^ Si esto devuelve 0, el email no existe y los DELETEs no hacen nada.
--   Si devuelve > 1, revisa antes de seguir.

-- ── matches: como autor u oponente ──────────────────────────────────
delete from matches
where author_id   in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
   or opponent_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'));

-- ── challenge_passes ────────────────────────────────────────────────
delete from challenge_passes
where profile_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'));

-- ── challenge_clubs (de challenges que vamos a borrar) ──────────────
delete from challenge_clubs
where challenge_id in (
  select id from challenges
  where author_id   in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
     or accepted_by in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
     or target_id   in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
);

-- ── challenges ──────────────────────────────────────────────────────
delete from challenges
where author_id   in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
   or accepted_by in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
   or target_id   in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'));

-- ── nominations: hechas por él Y las dirigidas a su email ───────────
delete from nominations
where nominator_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
   or lower(nominee_email) = lower('arturo@wareclouds.com');

-- ── group_members: como miembro, y todos los miembros de grupos que él creó ─
delete from group_members
where profile_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
   or group_id in (
     select id from groups
     where creator_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'))
   );

-- ── groups creados por él ───────────────────────────────────────────
delete from groups
where creator_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'));

-- ── visiting_plans ──────────────────────────────────────────────────
delete from visiting_plans
where profile_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'));

-- ── applications (no tiene email; se enlaza por profile_id) ─────────
delete from applications
where profile_id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'));

-- ── profile ─────────────────────────────────────────────────────────
delete from profiles
where id in (select id from auth.users where lower(email) = lower('arturo@wareclouds.com'));

-- ── auth user (último) ──────────────────────────────────────────────
delete from auth.users
where lower(email) = lower('arturo@wareclouds.com');

commit;

-- Verificación post-borrado
select 'auth.users'   as table_name, count(*) as remaining
  from auth.users where lower(email) = lower('arturo@wareclouds.com')
union all
select 'profiles',    count(*) from profiles
  where lower(email) = lower('arturo@wareclouds.com')
union all
select 'nominations', count(*) from nominations
  where lower(nominee_email) = lower('arturo@wareclouds.com');
