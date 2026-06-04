# Court Society — Admin Analytics & KPI Dashboard

## Objective

A premium executive dashboard inside `/admin` that surfaces the health of the
Court Society network: match activity (North Star), community health,
application funnel, referrals, challenges, density, retention, travel, and
auto-generated insights.

Designed for desktop first; mobile is a stacked condensed version.

---

## North Star Metric

**MATCHES PLAYED** — the single most important number.

| KPI | Definition | Formula | Source | Status |
|---|---|---|---|---|
| Total Matches Played | All confirmed matches ever | `count(matches where status='confirmed')` | `matches` | ✅ Ready |
| Matches This Month | Confirmed matches with `created_at` in current calendar month | `count(matches where status='confirmed' and date_trunc('month', created_at) = date_trunc('month', now()))` | `matches` | ✅ Ready |
| Matches Last 7 / 30 / 90 Days | Confirmed matches in trailing window | `count(matches where status='confirmed' and created_at >= now() - interval 'N days')` | `matches` | ✅ Ready |
| Growth vs Previous Period | % change in matches between current and prior 30-day window | `(curr - prev) / nullif(prev, 0)` | `matches` | ✅ Ready |

---

## Section 1 — Community Health

> **Note on "interaction"**: the platform does not track logins today. Until we
> add `profiles.last_seen_at` (see §Data Requirements), "interaction" is
> derived as
> `max(profile.updated_at, last match created_at, last challenge created_at,
> last nomination created_at, last visiting_plan created_at)`.
> This is a defensible proxy but undercounts pure browsing sessions.

| KPI | Definition | Formula | Status |
|---|---|---|---|
| Total Members | Approved profiles | `count(profiles where status='approved')` | ✅ Ready |
| Fully Active % | Played ≥1 match AND any interaction in last 30 d | `count where match_30d AND interaction_30d / total approved` | ⚠️ Proxy ("interaction") |
| Active % | Any interaction in last 30 d | `count where interaction_30d / total approved` | ⚠️ Proxy |
| At Risk % | No interaction in last 30 d (but interaction in last 90 d) | `1 − Active% − Dormant%` | ⚠️ Proxy |
| Dormant % | No interaction in last 90 d | `count where last_interaction < now() − 90d / total approved` | ⚠️ Proxy |
| Δ vs previous month | Compare each % to its value computed on the prior calendar month | — | ⚠️ Snapshot needed (see Data Requirements) |

---

## Section 2 — Match Activity

| KPI / Chart | Formula | Status |
|---|---|---|
| KPI tiles (5): Total, This Month, Last 7d, Last 30d, Last 90d | as in North Star | ✅ |
| Matches Played Over Time (daily / weekly / monthly) | `group by date_trunc(<grain>, created_at)` | ✅ |
| Avg Matches per Active Member | `confirmed matches in window × 2 / distinct active members in window` | ⚠️ Depends on Active definition |
| Avg Matches per City | `confirmed matches in window / distinct cities with ≥1 active member` (uses match city — see Data Requirements) | ⚠️ Needs `matches.city_id` for precision |
| Avg Matches per Club | `confirmed matches / distinct clubs with ≥1 member` | ⚠️ Same caveat |

---

## Section 3 — Member Growth

| KPI / Chart | Formula | Status |
|---|---|---|
| Total Members | as §1 | ✅ |
| New Members Last 7 / 30 / 90 d | `count(profiles where status='approved' and joined_at >= now() − Nd)` | ✅ |
| Member Growth Over Time | `cumulative count by date_trunc(<grain>, joined_at)` | ✅ |
| Application Funnel | `applications` rows by status | ✅ |
| — Submitted | `count(applications)` | ✅ |
| — Reviewed | `count(applications where reviewed_at is not null or status != 'pending')` | ✅ |
| — Approved | `count(applications where status='approved')` | ✅ |
| Approval Rate | `approved / submitted` | ✅ |
| Waitlist Rate | `waitlisted / submitted` | ✅ |
| Rejection Rate | `rejected / submitted` | ✅ |

---

## Section 4 — Referrals & Nominations

| KPI | Formula | Status |
|---|---|---|
| Total Nominations | `count(nominations)` | ✅ |
| Nominations Last 30 d | `count(nominations where created_at >= now() − 30d)` | ✅ |
| Nomination Acceptance Rate | `count(nominations where status in ('applied','approved')) / count(nominations)` | ✅ |
| Referral Rate | of new approved members in window, % whose profile.id appears in `nominations.applied_profile_id` | ✅ |
| Members Who Have Nominated ≥1 | `count(distinct nominator_id) in nominations` | ✅ |
| % Members Who Nominate | `nominator count / total approved` | ✅ |
| Avg Nominations Per Member | `total nominations / total approved` | ✅ |
| Top Referrers leaderboard | `group nominations by nominator_id where status='approved', order by count desc` | ✅ |

---

## Section 5 — Challenges

> **Note on "Declined"**: today `challenges.status` has `open / accepted /
> expired / cancelled`. There is no explicit "declined". For the dashboard
> we report **Cancelled** instead of Declined unless we add a status (see
> Data Requirements).

| KPI | Formula | Status |
|---|---|---|
| Challenges Sent | `count(challenges)` | ✅ |
| Challenges Accepted | `count where status='accepted'` | ✅ |
| Challenges Cancelled (≈ declined) | `count where status='cancelled'` | ⚠️ Renamed |
| Challenges Expired | `count where status='expired' or (status='open' and expires_at < now())` | ✅ |
| Challenge Acceptance Rate | `accepted / sent` | ✅ |
| Avg Time To Accept | `avg(accepted_at − created_at) where status='accepted'` | ✅ |
| Avg Time To Play Match | `avg(matches.created_at − challenges.accepted_at) where matches.challenge_id = challenges.id` | ✅ |
| Challenge Funnel | Sent → Accepted → Match Played → Confirmed | ✅ (relies on `matches.challenge_id`) |

---

## Section 6 — Network Density

| KPI | Formula | Status |
|---|---|---|
| Members per City | `count(profiles where home_city_id = X)` | ✅ |
| Matches per City | `count(matches where home_city_id of author or opponent = X)` (until we have `matches.city_id`) | ⚠️ Proxy |
| Members per Club | `count(profiles where home_club_id = X)` | ✅ |
| Matches per Club | `count(matches involving members of club)` | ⚠️ Proxy |
| Density score (city) | `matches in city in last 30d / members in city` | ⚠️ Proxy |
| City / Club leaderboards | sorted by members + matches | ✅ |

---

## Section 7 — Retention

| KPI | Definition | Formula | Status |
|---|---|---|---|
| D30 Retention | of members who joined ≥ 30 d ago, % active in last 30 d | `active_30d ∩ joined_at ≤ now()−30d / joined ≤ now()−30d` | ⚠️ Proxy ("active") |
| D60 Retention | of members who joined ≥ 60 d ago, % active in last 60 d | analogous | ⚠️ Proxy |
| D90 Retention | of members who joined ≥ 90 d ago, % active in last 90 d | analogous | ⚠️ Proxy |
| Returning Members % | of members who joined ≥ 30 d ago, % with interaction in last 7 d | analogous | ⚠️ Proxy |
| Repeat Match Players % | `count(profiles with >1 confirmed match) / total approved` | ✅ |

---

## Section 8 — Travel Network

| KPI | Formula | Status |
|---|---|---|
| Members Traveling (right now) | `count(distinct profile_id where end_date is null or end_date ≥ today) from visiting_plans` | ✅ |
| Visiting Members Last 30 d | `count(distinct profile_id) from visiting_plans where created_at ≥ now()−30d` | ✅ |
| Matches Played While Traveling | match where one player's `home_city_id != match city_id` and that player had an active visiting_plan pointing at match_city on `matches.created_at` | ⚠️ Needs `matches.city_id` |
| Travel Match Rate | `travel matches / total matches in window` | ⚠️ Same |
| Most Visited Cities | `visiting_plans` count by city_id (rank desc) | ✅ |

---

## Section 9 — Insights

Auto-generated narrative bullets from the same numbers, e.g.:

- Santiago generated *X*% of all matches this month.
- *Club* is the most active club this month with *N* matches.
- Referral growth changed by *X*% month-over-month.
- Travel matches represented *X*% of all matches.
- Challenge acceptance rate changed by *X*% this month.
- *Member* nominated the most this month (*N* nominations).
- Members joined *N* days ago show *X*% D30 retention.

Each is computed from existing aggregates; no extra data needed.

---

## Data Requirements — Smallest possible migrations

These are not strictly required for v1 (we have proxies), but they materially
improve precision and unlock "Δ vs previous month" without snapshot tables.

### Migration 0010 — `profiles.last_seen_at`

```sql
alter table profiles
  add column last_seen_at timestamptz;
create index profiles_last_seen_idx on profiles(last_seen_at);
```

- Backfill: `update profiles set last_seen_at = greatest(updated_at, joined_at)`.
- Updater: middleware bumps `last_seen_at = now()` once per session (debounced
  by 5 minutes) on every authenticated request to `/app/*`.
- Unlocks: precise Active / At Risk / Dormant, precise retention.

### Migration 0011 — `matches.city_id`

```sql
alter table matches
  add column city_id uuid references cities(id);
create index matches_city_idx on matches(city_id);
```

- Backfill rule:
  1. if `challenge_id` is set, copy `challenges.city_id`
  2. else copy author's `home_city_id`
- Writer: `log match` server action sets `city_id` from the linked challenge
  or from the author's home city.
- Unlocks: precise Matches per City, precise Travel Match Rate.

### Migration 0012 — `challenges.declined_at` *(optional)*

```sql
alter type challenge_status add value 'declined';
alter table challenges add column declined_at timestamptz;
```

- Only needed if you want to surface "Declined" distinct from "Cancelled" /
  "Expired". For v1 we can ship "Cancelled" + "Expired" and skip this.

### Optional — Snapshot table for trends

For "Δ vs previous month" without recomputing history we could add a small
`admin_metric_snapshots(date, metric_key, value)` table written nightly by a
cron. Not strictly needed if we accept on-the-fly window comparisons.

---

## Implementation plan (once spec is approved)

1. Migration `0010_last_seen.sql` (if approved).
2. Migration `0011_match_city.sql` (if approved).
3. Helper `src/lib/admin/analytics.ts` — one server function per KPI block,
   all parallelisable in `Promise.all`.
4. Page `/admin/analytics` (set as the new admin landing). Mark `dynamic =
   "force-dynamic"`, server-rendered, no client lib for charts (SVG only —
   keeps bundle thin).
5. Mobile collapse: each section stacks vertically; charts simplify to
   1-line sparklines.
6. Sidebar item: rename `Applications` link to keep flow; insert `Analytics`
   as the first admin nav item and the default `/admin` landing.
