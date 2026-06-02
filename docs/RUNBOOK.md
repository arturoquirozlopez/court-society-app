# Operator runbook — Court Society Member App

One-page reference for the Steward team and on-call.

---

## Daily / weekly

### Approve the cohort
1. `/admin/applications?status=pending` — sorted newest first.
2. For each: expand details → write a one-line reviewer note → **Approve / Waitlist / Reject**.
3. Approval triggers the welcome email automatically.

### Spot-check the inbox
- Resend dashboard → confirm <1% bounce. Watch for spikes; common cause is members typoing their email at apply time.

### Watch the H2H queue
- `/app/h2h` shows the red dot when matches need confirmation. Encourage members to clear their queue weekly via the WhatsApp broadcast.

---

## Monthly

- Run `select count(*) from matches where status = 'confirmed' and created_at >= now() - interval '30 days';` to size monthly activity. Use it as your north-star.
- Review **Disputed** matches in Supabase:
  ```sql
  select m.*, a.full_name as author, o.full_name as opponent
    from matches m
    join profiles a on a.id = m.author_id
    join profiles o on o.id = m.opponent_id
   where m.status = 'disputed'
   order by m.created_at desc;
  ```
- Reach out to both players; resolve manually (`update matches set status = 'confirmed' where id = ...`).

---

## Annually — open a new ranking season

When the season cutoff hits (default: calendar year):

1. Sign in as an **admin**.
2. `/admin/seasons` → confirm the active season + current year.
3. Click **Open Season {next-year}** → confirm.
4. Old season becomes `Archived`, new season becomes `Active`.
5. Verify `/app/ranking` resets to 0 W–0 L for all members.

Historical matches stay attached to the prior `season_id` and are queryable for a Hall of Champions feature later.

---

## Promoting a teammate

`/admin/members` → search → change role dropdown.

- **`steward`** can review applications and toggle other members ↔ steward. Cannot grant `admin` or modify an existing admin.
- **`admin`** can do everything, including open seasons and grant other admins. Keep this list to ≤2 people.

You **cannot** change your own role. Have a second admin do it.

---

## Rotating keys

Quarterly, or immediately if a key is exposed.

### Supabase service-role key
1. Supabase → Settings → API → **Regenerate** service role.
2. Vercel → Project Settings → Environment Variables → update `SUPABASE_SERVICE_ROLE_KEY` (Production + Preview).
3. Redeploy from Vercel UI.

### Resend API key
1. Resend → API Keys → **Revoke** old, **Create** new.
2. Vercel → update `RESEND_API_KEY`.
3. Redeploy.

### Supabase anon key
Only rotate if compromised — anon key is public by design. Same procedure as service-role.

---

## Backups & restore

Supabase Pro: daily PITR with 7-day window. To restore:

1. Supabase → Database → Backups → **Restore**.
2. Pick a timestamp.
3. **Stop traffic first**: in Vercel, redeploy the maintenance route (or pause the project) before restoring. A restore replays everything atop the current DB and can race in-flight writes.

Manual logical backup (anytime):
```bash
pg_dump "$DATABASE_URL" --schema=public --no-owner > backup-$(date +%F).sql
```
Keep these in a private S3 bucket or 1Password.

---

## Incident response

### Symptom: members can sign in but `/app/profile` 500s
Likely cause: trigger `handle_new_user` failed for a recent signup, so a `profiles` row is missing.

1. Find the orphan: `select id, email from auth.users u where not exists (select 1 from profiles p where p.id = u.id);`
2. Backfill: `insert into profiles (id, email) values (...);` and `insert into applications (profile_id, status, payload) values (..., 'pending', '{}');`

### Symptom: no application emails arriving
1. Resend dashboard → Emails → check for bounces or "domain not verified."
2. If DKIM/SPF broke (DNS change), re-verify domain in Resend.
3. As a temporary workaround, the app does **not** fail application submission when Resend errors — admins can still review from `/admin/applications`. Manually email the applicant via their `profiles.email`.

### Symptom: a member is locked out
- They never received a magic link → resend from `/login`.
- They got rejected by mistake → in `/admin/applications` filter to **Rejected**, click their row, change status to **Approved**. The trigger updates the profile.

### Symptom: someone is spamming the application form
- Each `auth.users` row can only have one `profiles` row (PK enforced) and only one `applications` row created by the trigger. Spam from the app surface is bounded.
- Spam at sign-in (magic links) is rate-limited by Supabase Auth defaults. If under attack, in Supabase → Auth → Rate Limits, tighten "OTPs" to a lower per-hour value.

---

## Useful read-only SQL

```sql
-- Applications by status this week
select status, count(*) from applications
  where created_at >= now() - interval '7 days'
  group by status order by 2 desc;

-- New approved members this month
select full_name, email, home_club_id, joined_at
  from profiles
  where status = 'approved' and joined_at >= now() - interval '30 days'
  order by joined_at desc;

-- Top 10 active members (matches this season)
select p.full_name, count(*) as matches
  from matches m
  join profiles p on p.id = m.author_id or p.id = m.opponent_id
  join seasons s on s.id = m.season_id and s.active
  where m.status = 'confirmed'
  group by p.id, p.full_name
  order by matches desc
  limit 10;
```

---

## Escalation

- Vercel down → status.vercel-status.com; nothing to do but wait.
- Supabase down → status.supabase.com; the app is read-blocked until they recover. There is no useful fallback.
- DNS / domain misconfigured → check Vercel → Domains for the diagnostic; usually a CNAME drift.

Phase 2 will add Sentry alerts to Slack and PostHog session replay. Until then, the runbook above is the on-call.
