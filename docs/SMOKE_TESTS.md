# Smoke tests — pre-launch checklist

Run through this list against the live `app.courtsociety.org` before sharing the URL with the first cohort. Use a real second email (your phone's email, a partner's) for the applicant flow — don't reuse the admin email.

---

## A. Routing & auth

- [ ] Visit `/` while signed out → lands on `/login`.
- [ ] Visit `/app/profile` while signed out → redirects to `/login`.
- [ ] Visit `/admin` while signed out → redirects to `/login`.
- [ ] Submit `/login` with an obviously bad email (`abc`) → inline validation error, no email sent.
- [ ] Submit `/login` with a real email → "Check your email" state shown; email arrives within 60s.
- [ ] Click the magic link → lands on `/apply` (first time) or `/pending` / `/app/profile` (subsequent times) based on status.
- [ ] Sign out from any screen → returns to `/login`; back-button into `/app/profile` redirects back to `/login`.

## B. Application flow

- [ ] Step 1 — City + Club: cascading select works, "Other" reveals the text input, **Continue** disabled until both filled.
- [ ] Step 2 — Tennis: level / format / frequency required to proceed.
- [ ] Step 3 — Contact: full name (≥2 chars) and WhatsApp (≥6 chars) required.
- [ ] Step 4 — Travel: optional; **Submit** always available.
- [ ] On Submit, the user is redirected to `/pending` with the exact copy: "Your application has been received…"
- [ ] An email arrives with subject "Your Court Society application".
- [ ] In Supabase → `applications`, a new row with `status='pending'` and a populated `payload` jsonb exists.
- [ ] In Supabase → `profiles`, the new row reflects the applicant data and has `status='pending'`.

## C. Admin review

Use the admin account.

- [ ] `/admin` → redirects to `/admin/applications` filtered on Pending.
- [ ] The applicant from §B appears with a "Pending" chip.
- [ ] Expand **View details** → headline / level / format / frequency / travel cities all match what the applicant submitted.
- [ ] Add a reviewer note ("Welcome aboard!") and click **Approve**.
- [ ] Applicant receives an email "Welcome to Court Society" (subject) with the reviewer note embedded.
- [ ] In Supabase → `applications`, the row now has `status='approved'`, `reviewed_by=<admin id>`, `reviewed_at`, `review_note`.
- [ ] In Supabase → `profiles`, the applicant's row now has `status='approved'` and `joined_at` set.
- [ ] The applicant signs back in → lands directly on `/app/profile` (no `/pending` intermediate).
- [ ] Repeat with two more applicants for **Waitlist** and **Reject** outcomes — both receive the corresponding email and are routed to `/waitlisted` / `/rejected`.

## D. Profile

As the approved applicant:

- [ ] `/app/profile` shows correct name, club, city, level, etc.
- [ ] **Edit** opens the form; updating name / WhatsApp / LinkedIn saves and reflects on refresh.
- [ ] **Change photo** uploads a JPG/PNG to Supabase Storage → avatar updates within 1–2s.
- [ ] In Supabase → `profiles.photo_url`, the URL is `https://<project>.supabase.co/storage/v1/object/public/avatars/<uid>/avatar.<ext>?t=...`.
- [ ] Set **Currently visiting** to Miami → save → `/app/challenges` now shows the Miami feed.
- [ ] Set it back to "— Home city —" → feed returns to your home city.

## E. Members directory

- [ ] `/app/members` lists all approved members (at least: you, the admin).
- [ ] City filter scopes the list. Club filter only appears once a city is selected.
- [ ] Tapping a member opens `/app/members/<id>` with stats, club badge, and the WhatsApp button.
- [ ] WhatsApp button opens `wa.me/<digits>?text=...` (prefilled message).

## F. Challenges

- [ ] `/app/challenges` shows "No active challenges" when empty.
- [ ] FAB → open sheet → pick city, format, optional clubs, optional note → **Post challenge** → returns to feed, card visible at top with a 72h timer.
- [ ] Sign in as another approved member in the same city → the challenge appears with **Accept** / **Pass**.
- [ ] **Pass** removes the card for that member only.
- [ ] **Accept** by another member: opens a WhatsApp message draft prefilled with the city; both members see the "Match accepted" card on the original challenge.
- [ ] Original author sees a **Cancel** action while still open; cancelling removes the card from everyone's feed.

## G. Matches & H2H

- [ ] `/app/h2h` → **＋** → pick opponent (My club / My city / All), pick **Won** / **Lost**, enter score, save → returns to H2H list.
- [ ] H2H detail page shows the match with a "Pending" chip.
- [ ] Opponent's `/app/profile` shows "Pending confirmations (1)" with **Confirm** / **Dispute**.
- [ ] After Confirm: both H2H counters update; the match shows "✓ Confirmed".
- [ ] After Dispute: status moves to "⚠ Disputed"; no counter changes.
- [ ] `/app/ranking` reflects the confirmed match in win-rate and W-L counts. Sorting holds. City / level / club filters do what they say.

## H. Admin: members + seasons

- [ ] `/admin/members` lists every profile regardless of status. Search by name and email works.
- [ ] Change a member from `member` → `steward`; refresh `/admin/members`; persists. The steward can now open `/admin` themselves.
- [ ] Verify a **steward** cannot toggle anyone to `admin` (the option doesn't render).
- [ ] Verify nobody can change their own role (dropdown disabled on own row).
- [ ] `/admin/seasons` shows "Season {YEAR} · Active" and `0` matches if no confirmed matches yet.
- [ ] (Admin only) **Open Season {YEAR+1}** → confirm → previous season `Archived`, new season `Active`.
- [ ] `/app/ranking` now reads from the new season (back to zero W-L).

## I. Security spot-checks

- [ ] Manually craft a request to `/app/profile` as a `pending` user (e.g., paste cookie from a pending session) → middleware sends you to `/pending`.
- [ ] In Supabase → SQL editor, run `select * from applications` as the anon role (Settings → API → "Run as: anon") → returns 0 rows (RLS).
- [ ] As an approved member, try to `update profiles set role = 'admin' where id = auth.uid()` via the JS console → blocked by the `prevent_self_promotion` trigger.
- [ ] Upload an avatar then attempt to overwrite another member's avatar via the Storage API → blocked by `avatars owner write` policy.

## J. Mobile / PWA polish

- [ ] iPhone Safari: open `app.courtsociety.org` → tap Share → **Add to Home Screen**. Icon appears (CS monogram). Launching from the home screen opens full-screen, no Safari chrome.
- [ ] Android Chrome: same flow via three-dot menu → Install app.

If every item passes, you're live. Hold for ≥30 min before broadcasting the URL, to make sure the magic-link email reputation has time to warm with Resend.
