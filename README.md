# Court Society — Member App

`app.courtsociety.org` — the member-facing application.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind · Supabase (Postgres / Auth / Storage / RLS) · Resend · Vercel.

---

## Status

Phase 1 MVP — feature-complete. Ships:

- Magic-link auth (Supabase Auth, email OTP)
- 4-step membership application with Zod-validated submission
- Steward review queue with Approve / Waitlist / Reject + reviewer note + email notification
- Role-gated routing (`pending` / `waitlisted` / `rejected` / `approved` / `steward` / `admin`)
- Member profile with avatar upload to Supabase Storage, edit, visiting-city
- Members directory + member detail with H2H stats + WhatsApp deep-link
- Challenges feed scoped by city/visiting city, 72h TTL, accept / pass / cancel, WhatsApp on accept
- Match logging + two-sided confirmation (pending → confirmed | disputed)
- Live-computed ranking from confirmed matches, filterable by city / level / club
- Annual seasons with admin-controlled rollover
- Admin: applications queue, members directory with role toggle, season management

---

## Local setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# fill in Supabase + Resend keys (see docs/DEPLOY.md §1.5 and §2)

# 3. Apply schema to your Supabase project
#    Paste these into the Supabase SQL editor, in order:
#      supabase/migrations/0001_init.sql
#      supabase/seed.sql

# 4. (Optional) regenerate typed DB types
npm run db:types

# 5. Run
npm run dev
# → http://localhost:3000
```

### Promote yourself to admin (one-time)

After signing in with a real email and completing the application form:

```sql
update profiles
  set role = 'admin', status = 'approved', joined_at = now()
  where email = 'you@yourdomain.com';
```

Then refresh — you'll see the **Open Steward's Office** button on your profile.

---

## Project layout

```
court-society-app/
├── docs/
│   ├── DEPLOY.md            full Supabase + Resend + Vercel runbook
│   ├── SMOKE_TESTS.md       pre-launch checklist
│   └── RUNBOOK.md           daily / weekly / annually + incident response
├── src/
│   ├── app/
│   │   ├── (auth surfaces)  login / auth/callback / apply / pending / waitlisted / rejected
│   │   ├── app/             member surfaces (profile / members / challenges / h2h / ranking)
│   │   └── admin/           Steward's Office (applications / members / seasons)
│   ├── components/          Hero, BottomTabs, Avatar, Sheet, GateScreen, SignOutLink
│   ├── lib/
│   │   ├── auth.ts          getCurrentProfile / requireApproved / requireAdmin
│   │   ├── supabase/        browser / server / middleware / service clients
│   │   ├── actions/         server actions (auth, application, profile, challenges, matches, admin)
│   │   ├── queries.ts       server-only data helpers
│   │   ├── email.ts         Resend wrapper (degrades gracefully without API key)
│   │   ├── format.ts        date, win-rate, WhatsApp link
│   │   ├── types.ts         domain types + labels
│   │   └── db/types.ts      Supabase generated types (placeholder; regen via npm run db:types)
│   └── styles/globals.css   Court Society design tokens
├── supabase/
│   ├── migrations/0001_init.sql   10 tables, enums, triggers, RLS, avatars bucket
│   ├── seed.sql                   cities, clubs, opening season
│   └── config.toml                CLI config
├── middleware.ts            status- and role-based routing
├── vercel.json
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## Deploying

Follow `docs/DEPLOY.md`. Short version:

1. Create Supabase project, run `0001_init.sql` + `seed.sql`.
2. Verify `courtsociety.org` in Resend, capture API key.
3. Create Vercel project, set env vars (`.env.example` is the matrix).
4. Add domain `app.courtsociety.org` (CNAME → `cname.vercel-dns.com`).
5. Add `https://app.courtsociety.org/auth/callback` to Supabase Auth redirect allowlist.
6. Promote first admin (SQL one-liner in §5 of the deploy doc).
7. Run `docs/SMOKE_TESTS.md`.

---

## What this MVP does **not** include

Deliberately deferred to later phases:

- **Phase 2** — Sentry, PostHog, GitHub Actions CI, preview-isolated Supabase per PR, GDPR data-export
- **Phase 3** — Nominations engine, City Stewards, events, in-app messaging (replacing WhatsApp punt), Hall of Champions, search, marketing site at `courtsociety.org`
- **Phase 4** — Expo native app

See `../court-society-phase1-architecture.md` for the full Phase 1 plan and `../court-society-audit.md` for the broader roadmap.
