# Court Society — Auth & Onboarding Redesign

Spec only. Implementation begins once approved.

---

## 1. Current auth flow audit

```
Apply for Membership / nomination link
        │
        ▼
   /login  ──────────  user types email
        │
        │  signInWithOtp({email, shouldCreateUser: true})
        ▼
   Supabase sends magic-link email
        │
        ▼
   user opens link  (often on a different device → drop-off)
        │
        ▼
   /auth/callback  ── exchangeCodeForSession
        │
        ▼
   /apply  ── 4-step wizard (Club · Tennis · Contact · Travel)
        │
        ▼
   submitApplication updates `applications.payload`
        │
        ▼
   /pending  ── waits for admin review
        │
        ▼
   Admin approves → status='approved' → /app/profile
```

**Database shape today** (from `0001_init.sql`):

- DB trigger `handle_new_user()` fires on every `auth.users` insert and:
  - inserts a `profiles` row with `status='pending'`
  - inserts an `applications` row with `status='pending'` and `payload='{}'`
- A second trigger `sync_profile_status_from_application` reflects admin
  decisions onto `profiles.status`.

So today "pending" means **both** "I just signed up but haven't filled
anything" and "I submitted my application, waiting for review". The admin
can't tell the difference. That's the conversion-leak blind spot.

**Drop-off points** (where users vanish):

1. **Magic link friction**: 100% of registrations require an email round-trip
   before the application even appears. Many users never click the link.
2. **Cross-device drops**: mobile mail clients open links in a different
   browser, which kills the PKCE flow.
3. **Account-created-but-empty**: the user signs up, sees a glimpse of the
   wizard, leaves, and we have no flag distinguishing them from a real
   pending review.

---

## 2. New proposed auth flow

```
Landing / nomination link
        │
        ▼
  /login  ── tabs:  [Sign in]  [Create account]
        │                  │
        │                  └── Email + password + confirm  (primary)
        │                                                 ┌─ "Send me a magic link instead" (secondary)
        │                                                 └─ "Forgot password?"
        ▼
  signUpWithPassword
        │
        ▼
  Session established **immediately** (no email round-trip)
        │
        ▼
  /apply  ── same 4-step wizard, but:
        │     ──   Step 1 enter ⇒ application_status = 'application_started'
        │     ──   Wizard advance ⇒ application_step updated
        │     ──   Final submit  ⇒ application_status = 'application_submitted'
        ▼
  /pending  ── "Your application has been received…"
        │
        ▼
  Admin approves → application_status='approved' → /app/dashboard
```

**Key differences from today:**

| | Today | New |
|---|---|---|
| Primary credential | Magic link | Email + password |
| Email round-trip before apply | Required | Removed (user lands directly on `/apply` after signup) |
| Magic link | Only path | Optional, visually secondary |
| Password reset | None | `/auth/reset` flow |
| "Started but not submitted" | Looks identical to "submitted" | Explicit `application_status` value |
| Admin lead nurture | None | "Incomplete applications" panel + reminder email |

---

## 3. Supabase changes

### 3.1 Migration `0012_application_lifecycle.sql`

Cleanest architecture: extend `profiles` with explicit lifecycle fields. No
new tables — the existing `applications` row is preserved for backward
compat with the admin queue, but the source of truth for "where is this
person in the funnel" moves to `profiles.application_status`.

```sql
-- New enum that supersedes member_status for funnel reporting.
create type application_status as enum (
  'account_created',
  'application_started',
  'application_submitted',
  'approved',
  'waitlisted',
  'rejected'
);

alter table profiles
  add column application_status   application_status not null default 'account_created',
  add column application_started_at   timestamptz,
  add column application_submitted_at timestamptz,
  add column application_step          smallint not null default 0,
  add column reminder_sent_at         timestamptz,
  add column reminder_count           int not null default 0;

-- Reuse `last_seen_at` (migration 0010) for "last active". No new column needed.

-- Backfill: anyone already approved/waitlisted/rejected → mirror their
-- old status onto the new enum. Anyone "pending" who has any application
-- payload counts as submitted; otherwise account_created.
update profiles p
   set application_status = case
        when p.status = 'approved'   then 'approved'::application_status
        when p.status = 'waitlisted' then 'waitlisted'::application_status
        when p.status = 'rejected'   then 'rejected'::application_status
        when exists (
          select 1 from applications a
           where a.profile_id = p.id and a.payload <> '{}'::jsonb
        ) then 'application_submitted'::application_status
        else 'account_created'::application_status
      end,
      application_submitted_at = case
        when p.status in ('approved','waitlisted','rejected') then coalesce(p.joined_at, p.updated_at)
        else null
      end;

-- Sync trigger: when admin decides on an application, mirror onto the new
-- enum too. Keep the old trigger for backward compat with member_status.
create or replace function sync_application_status_v2() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    update public.profiles
       set application_status = new.status::text::application_status,
           joined_at = case when new.status='approved' and joined_at is null then now() else joined_at end
     where id = new.profile_id
       and new.status::text in ('approved','waitlisted','rejected');
  end if;
  return new;
end $$;

create trigger sync_application_status_v2_trg
  after update on applications
  for each row execute function sync_application_status_v2();

create index profiles_application_status_idx on profiles(application_status);
```

### 3.2 No second table for reminders

Two columns (`reminder_sent_at`, `reminder_count`) cover the spec. A
dedicated `application_reminders` history table is overkill for v1 and adds
join overhead to every Incomplete-Applications list query. If we ever want
audit, we add it then.

### 3.3 Supabase Auth dashboard config

In the Supabase project console — operator action, not a migration:

- **Settings → Authentication → Providers → Email** — turn **Enable email
  password sign-up** ON (it is already ON for sign-in).
- **Settings → Authentication → Email Templates** — magic link template
  unchanged. Add the "Reset password" template (English copy in §6).
- **Site URL** — unchanged (`https://app.courtsociety.org`).
- **Confirm email** — keep **OFF** (we already confirmed during the
  original launch; turning it back on would force email verification before
  the application, which is the whole problem we're solving).

---

## 4. Migration plan for existing users

The current ~50 approved members can only sign in with magic links because
they never set a password. We need to give them a one-time bridge.

**Approach:** silent. They keep using whatever they used before.

1. The `/login` page shows `[Sign in]` tab by default with **email +
   password** fields. Below it: `Send me a sign-in link instead`.
2. If an existing user clicks Sign in with a password they never set, Supabase
   returns `Invalid login credentials`. We catch that and surface a friendly
   message:
   > Looks like you haven't set a password yet. We've sent you a sign-in
   > link — open it to set one.
3. We send the magic link automatically and on the callback, redirect
   approved members to `/app/account/password` (a one-time set-password
   page) which calls `supabase.auth.updateUser({ password })`.
4. From then on they can use either credential.

This means **zero breakage** for the existing cohort and a one-time nudge
the next time they sign in.

For `/app/account/password` we also add a dismissible banner in the member
app for approved users with `last_password_set_at` null, suggesting they
set one — they can skip if they prefer magic links forever.

---

## 5. Admin reminder UX

### 5.1 New section in admin nav

The admin sidebar gains an **"Incomplete applications"** tab between
Analytics and Applications. It is a queue UI listing every profile with
`application_status in ('account_created', 'application_started')` ordered
by `created_at DESC`.

### 5.2 Columns

| Column | Source |
|---|---|
| Avatar + Name | `profiles.full_name` (may be null → "Unnamed") |
| Email | `profiles.email` |
| City | `profiles.home_city_id → cities.name` if set |
| Club | `profiles.home_club_id → clubs.name` if set |
| Step | `application_step` of 4 — rendered as `2/4` |
| Completion % | `application_step / 4 * 100` |
| Created | `profiles.created_at` |
| Last active | `profiles.last_seen_at` |
| Reminders | `reminder_count` + `reminder_sent_at` (tooltip) |
| Actions | `Send reminder` · `Mark not interested` · `Archive` |

### 5.3 Actions

- **Send reminder** — sends the reminder email (see §6), sets
  `reminder_sent_at = now()`, increments `reminder_count`. Button disabled
  for 48 hours after the last send (computed from `reminder_sent_at`).
- **Mark not interested** — sets `application_status = 'rejected'` with
  `payload = { lead_state: 'not_interested', set_by: <admin_id> }` on the
  applications row, no email sent. Hidden from the queue.
- **Archive** — same effect as Mark not interested but with
  `lead_state: 'archived'`. Functionally identical at the data layer;
  separate labels make the intent obvious in admin UI.

### 5.4 Visual treatment

Right rail of the admin layout shows three sticky KPIs:

- Incomplete leads
- Submitted this week
- Reminder response rate _(% of reminded leads that go on to submit)_

---

## 6. Email copy

### 6.1 Reminder email — `Complete your Court Society application`

```
Subject: Complete your Court Society application
Preheader: A few moments to finish what you started.

Dear {{first_name}},

You began your application to Court Society, but it has not yet
been completed.

Applications are reviewed individually by the Steward's Office, and
only completed applications can be considered for membership.

You may continue your application here:

  [Continue Application] ── https://app.courtsociety.org/apply

— Court Society
```

Visual treatment matches the existing branded email templates: ivory
background, dark-green CS monogram top-left, brass underline on the CTA,
quiet body copy in Playfair italic for the salutation.

### 6.2 Password reset email — `Reset your Court Society password`

```
Subject: Reset your Court Society password
Preheader: Set a new password for your account.

You requested to reset your Court Society password. Open the link below to
choose a new one. The link is valid for one hour.

  [Set a new password] ── https://app.courtsociety.org/auth/reset?token=…

If you didn't request this, you can safely ignore this message.

— Court Society
```

Configured in Supabase → Email Templates → Reset Password.

---

## 7. Implementation plan

Ordered, each step shippable on its own.

### Step A — Database

1. `supabase/migrations/0012_application_lifecycle.sql` (full DDL in §3.1).

### Step B — Auth flows

1. **`/lib/actions/auth.ts`** — add `signUpWithPassword`,
   `signInWithPassword`, `requestPasswordReset`, `updatePassword`. Keep
   `sendMagicLink` exactly as-is for the secondary path.
2. **`/login`** — tabs UI with [Sign in] / [Create account]. Each form is
   email + password (+ confirm on create). Below both forms: subdued
   "Send me a sign-in link" + "Forgot password?" links.
3. **`/auth/callback`** — unchanged for magic-link flow. Reused by reset.
4. **`/auth/reset`** — page where the reset link lands; user sets a new
   password.
5. **`/app/account/password`** — one-time set-password page surfaced via
   banner for approved members without a password.

### Step C — Application status tracking

1. **`apply/page.tsx`** — on first GET, set `application_status =
   'application_started'`, `application_started_at = now()`.
2. **`ApplyWizard`** — on each `Next`, save `application_step` so we can
   show progress in admin.
3. **`submitApplication`** — set `application_status = 'application_submitted'`,
   `application_submitted_at = now()`.
4. Existing application admin queue continues to work; it now shows only
   `submitted` rows (filter on `application_status`).

### Step D — Admin "Incomplete applications"

1. Migration adds nothing — uses the same columns added in Step A.
2. **`/admin/incomplete/page.tsx`** — server-rendered list, with action
   buttons that call server actions:
   - `sendReminderEmail(profileId)`
   - `markLeadNotInterested(profileId)`
   - `archiveLead(profileId)`
3. **`/lib/email.ts`** — add `sendApplicationReminder({ to, firstName })`.
4. Sidebar adds the new nav entry.

### Step E — Migration for existing users

1. Banner component in `/app/layout.tsx` that surfaces to approved members
   with `application_status = 'approved'` AND `last_password_set_at is
   null`. Suggests setting a password; dismissible.
2. The "wrong password" handling in `signInWithPassword` action automatically
   sends a magic link with a `next=/app/account/password` parameter.

### Estimated scope

| Step | Files touched | Migrations |
|---|---|---|
| A — DB | 1 SQL | 1 |
| B — Auth flows | ~6 (login form, server actions, reset page, set-password page, callback) | 0 |
| C — Status tracking | 2 (apply page, action) | 0 |
| D — Admin incomplete | 3 (page, server actions, email) | 0 |
| E — Existing-user migration | 1 (banner) | 0 |

No third-party dependencies. No Supabase plan upgrade. No new tables.

---

## What I need from you to proceed

1. **Approve the application_status enum** values — the 6 I proposed match
   your spec verbatim, but if you want different names say so now.
2. **Confirm the silent-migration plan** for existing approved members
   (auto magic link + set-password banner). Alternative: blast a
   "set your password" email at deploy time.
3. **Confirm reminder copy** (English-only first; ES/PT later if needed).
4. **48 h reminder cooldown** — fine as proposed? Bigger?
5. **"Mark not interested" vs "Archive"** — keep both, or merge?

Reply with which of these to change (or "looks good, ship it") and I move
to Step A.
