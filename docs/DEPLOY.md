# Deploy — Court Society Member App

End-to-end deployment runbook for `app.courtsociety.org`. Allow ~60–90 min for a first-time deploy.

---

## 0. What you'll have at the end

- Supabase project (Postgres + Auth + Storage) in São Paulo region
- Resend domain verified for `courtsociety.org`
- Vercel project deployed at `app.courtsociety.org`
- One admin account (you) ready to approve the first cohort

---

## 1. Supabase

### 1.1 Create project
1. https://supabase.com → **New project**.
2. Name: `court-society-prod`.
3. Region: **South America (São Paulo) — sa-east-1**. (Best latency for Santiago / SP; Miami is acceptable.)
4. Choose a strong database password — store in 1Password.
5. Wait for provisioning (~2 min).

### 1.2 Run the schema
Two options. **Option A is enough for MVP.**

**Option A — paste into the SQL editor.**
1. In Supabase → **SQL Editor** → New query.
2. Paste the entire contents of `supabase/migrations/0001_init.sql`. Run.
3. New query. Paste `supabase/seed.sql`. Run.
4. Verify in **Table Editor**: `cities` has 3 rows, `clubs` has 17 (6+6+5), `seasons` has 1 row with `active=true`.

**Option B — Supabase CLI (recommended once you have a team).**
```bash
npm install -g supabase
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push                                       # applies migrations
psql "$DATABASE_URL" -f supabase/seed.sql              # seeds
npm run db:types                                       # regenerates src/lib/db/types.ts
git add src/lib/db/types.ts && git commit -m "db: regen types"
```

### 1.3 Auth configuration
Dashboard → **Authentication**.

- **Providers** → ensure **Email** is on; turn **off "Confirm email"** (we use magic links, not double-opt-in).
- **URL Configuration**:
  - **Site URL**: `https://app.courtsociety.org`
  - **Redirect URLs** (allowlist): add both
    - `https://app.courtsociety.org/auth/callback`
    - `http://localhost:3000/auth/callback`
- **Email Templates → Magic Link**: customize the subject + body in Court Society voice. Keep `{{ .ConfirmationURL }}` intact.
- **Rate Limits**: leave defaults; we'll tighten in Phase 2 if abused.

### 1.4 Storage
Dashboard → **Storage**.
The migration already created the `avatars` bucket. Verify:
- Bucket `avatars` exists, **public read enabled**.
- The four object-level policies are present (`avatars public read`, `avatars owner write`, `avatars owner update`, `avatars owner delete`).

### 1.5 Capture secrets
Dashboard → **Settings → API**. Copy:
- `Project URL` → goes to `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, **never** in `NEXT_PUBLIC_*`)

---

## 2. Resend (transactional email)

1. https://resend.com → **Domains → Add domain** → `courtsociety.org`.
2. Add the DNS records they show (SPF, DKIM, MX-stub) at your DNS provider. Click **Verify**. Usually takes <10 min.
3. **API Keys → Create API key**, scope **Sending access**, name `court-society-prod`. Copy.
4. Decide the sender address. Default: `nominations@courtsociety.org`. You don't need a real inbox there — just verify SPF/DKIM on the apex.

Captured:
- `RESEND_API_KEY` = the key from step 3
- `RESEND_FROM_EMAIL` = `Court Society <nominations@courtsociety.org>`

---

## 3. GitHub

1. Push the `court-society-app/` folder to a new private repo (`court-society/app` or similar).
2. Make sure `.env.local` is **not** committed (the `.gitignore` already excludes it).

---

## 4. Vercel

### 4.1 Import
1. https://vercel.com/new → import the repo.
2. Framework: **Next.js** (auto-detected).
3. Root directory: leave as `./` (or the path to `court-society-app/` if you nest it).
4. Build & install commands: leave defaults.

### 4.2 Environment variables
Project → **Settings → Environment Variables**. Add the following for **Production** *and* **Preview**:

| Name                            | Value                                                   | Visibility |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`      | (from §1.5)                                             | All envs   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from §1.5)                                             | All envs   |
| `SUPABASE_SERVICE_ROLE_KEY`     | (from §1.5)                                             | All envs (secret) |
| `NEXT_PUBLIC_APP_URL`           | `https://app.courtsociety.org` (prod) / preview URL (preview) | All envs |
| `RESEND_API_KEY`                | (from §2)                                               | All envs (secret) |
| `RESEND_FROM_EMAIL`             | `Court Society <nominations@courtsociety.org>`          | All envs   |

> **Phase 2 only** (leave empty for MVP): `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.

### 4.3 Deploy
1. Click **Deploy**. First build takes ~3 min.
2. Vercel gives you a temporary URL like `court-society-xxxx.vercel.app`. Hit it. You should land on `/login`.

### 4.4 Custom domain
1. Vercel project → **Domains → Add** → `app.courtsociety.org`.
2. At your DNS provider (Cloudflare / Route53 / Namecheap):
   - **CNAME** record on `app` → `cname.vercel-dns.com`.
   - If using Cloudflare, set the record to **DNS only** (gray cloud), not proxied, until you confirm SSL — Vercel issues the cert via Let's Encrypt and proxy mode interferes on the handshake.
3. Wait for "Valid configuration" green check in Vercel (~2–5 min).
4. Once green, you can re-enable Cloudflare proxy (orange cloud) if desired — Vercel handles HTTPS on its end.

### 4.5 Update Supabase redirect URL
After the custom domain is live, double-check Supabase → Auth → URL Configuration still has `https://app.courtsociety.org/auth/callback` in the allowlist. If you used a Vercel preview URL during testing, **remove it from production** before launch.

---

## 5. Bootstrap your first admin

You can't open `/admin` until at least one profile has `role='admin'`. Do this once.

1. Visit `https://app.courtsociety.org`. You'll land on `/login`.
2. Sign in with the email you'll use as the founding admin. Click the magic link in your inbox.
3. You'll be redirected to `/apply`. **Fill out the application** end-to-end (this creates your `profiles` row with real data).
4. In Supabase → SQL Editor, promote yourself:
   ```sql
   update profiles
     set role = 'admin',
         status = 'approved',
         joined_at = now()
   where email = 'you@yourdomain.com';
   ```
5. Refresh `app.courtsociety.org`. You'll be routed to `/app/profile` and you'll see an **Open Steward's Office** button.

Subsequent admins (or stewards) are promoted from `/admin/members`.

---

## 6. Smoke test

Run through `docs/SMOKE_TESTS.md` end-to-end before sharing the URL with anyone.

---

## 7. Ongoing operations

See `docs/RUNBOOK.md` for: approving applications, opening a new season, rotating keys, restoring from backup, and the on-call routing for production incidents.

---

## 8. Things you don't need to do yet (Phase 2+)

- Sentry + PostHog — env vars are present but disabled.
- Preview-isolated Supabase project per PR — for MVP, previews share the prod Supabase. Acceptable while the cohort is <100.
- CI typecheck/lint — add GitHub Actions in Phase 2.
- Backups — Supabase runs daily PITR on the Pro plan. If you're on Free, upgrade before launch.
