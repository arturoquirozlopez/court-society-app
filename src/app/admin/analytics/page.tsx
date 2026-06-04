import { requireAdmin } from "@/lib/auth";
import { getAnalyticsBundle } from "@/lib/admin/analytics";

export const dynamic = "force-dynamic";

/**
 * Admin Analytics — executive dashboard. Server-rendered, single
 * `getAnalyticsBundle` call returns every signal the page needs.
 *
 * Design: ivory canvas, dark green hero for the North Star, brass accents.
 * Sections are stacked, not boxed (editorial feel, not back-office).
 */
export default async function AnalyticsPage() {
  await requireAdmin();
  const a = await getAnalyticsBundle();

  return (
    <div className="px-7 lg:px-10 pb-20">
      {/* Page head */}
      <div className="flex items-end justify-between pt-8 pb-6 border-b border-cs-green/10">
        <div>
          <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
            S T E W A R D &nbsp; D A S H B O A R D
          </div>
          <h1 className="font-display italic text-[32px] lg:text-[42px] leading-none mt-2 text-cs-green -tracking-[0.015em]">
            Analytics
          </h1>
        </div>
        <div className="hidden lg:block text-[10px] tracking-[0.22em] uppercase text-cs-muted text-right">
          Live · refreshed every load<br />
          {new Date(a.generatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* ════════════════ NORTH STAR ════════════════ */}
      <NorthStarBlock a={a.northStar} />

      {/* ════════════════ SECTION 01 — COMMUNITY HEALTH ════════════════ */}
      <Block n="0 1" title="Community health">
        <KpiRow cols={5}>
          <Kpi label="Total members" value={a.community.total} />
          <Kpi
            label="Fully active"
            value={`${a.community.fullyActive.pct}%`}
            detail={`${a.community.fullyActive.count} of ${a.community.total}`}
            delta={a.community.fullyActive.delta}
          />
          <Kpi
            label="Active"
            value={`${a.community.active.pct}%`}
            detail={`${a.community.active.count} of ${a.community.total}`}
            delta={a.community.active.delta}
          />
          <Kpi
            label="At risk"
            value={`${a.community.atRisk.pct}%`}
            detail={`${a.community.atRisk.count} of ${a.community.total}`}
            delta={-a.community.atRisk.delta /* inverted: rising at-risk is bad */}
          />
          <Kpi
            label="Dormant"
            value={`${a.community.dormant.pct}%`}
            detail={`${a.community.dormant.count} of ${a.community.total}`}
            delta={-a.community.dormant.delta}
          />
        </KpiRow>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 mt-6">
          <Card title="Engagement distribution">
            <Donut
              slices={[
                { label: "Fully active", value: a.community.fullyActive.pct, color: "#0E2A1F" },
                { label: "Active only", value: a.community.active.pct, color: "#214a3a" },
                { label: "At risk", value: a.community.atRisk.pct, color: "#A68B5B" },
                { label: "Dormant", value: a.community.dormant.pct, color: "#9c4a3a" },
              ]}
            />
          </Card>
          <Card title="Activity by city">
            <Leader
              rows={a.community.cityActivity.slice(0, 6).map((c, i) => ({
                rank: roman(i + 1),
                name: c.cityName,
                sub: `${c.members} members · ${c.activePct}% active`,
                value: c.matches30d,
              }))}
              emptyLabel="No members yet."
            />
          </Card>
        </div>
      </Block>

      {/* ════════════════ SECTION 02 — MATCH ACTIVITY ════════════════ */}
      <Block n="0 2" title="Match activity">
        <KpiRow cols={5}>
          <Kpi label="All time" value={a.matchActivity.total} />
          <Kpi label="This month" value={a.matchActivity.thisMonth} delta={a.matchActivity.monthDelta} />
          <Kpi label="Last 7 days" value={a.matchActivity.last7d} />
          <Kpi label="Last 30 days" value={a.matchActivity.last30d} />
          <Kpi label="Last 90 days" value={a.matchActivity.last90d} />
        </KpiRow>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mt-6">
          <Card title="Matches over time · 13 weeks">
            <BarChart points={a.matchActivity.weekly} grain="week" highlightLast />
          </Card>
          <Card title="Averages">
            <BigStat label="Per active member · 30 d" value={a.matchActivity.avgPerActiveMember} />
            <BigStat label="Per city" value={a.matchActivity.avgPerCity} />
            <BigStat label="Per club" value={a.matchActivity.avgPerClub} />
          </Card>
        </div>
      </Block>

      {/* ════════════════ SECTION 03 — MEMBER GROWTH ════════════════ */}
      <Block n="0 3" title="Member growth">
        <KpiRow cols={4}>
          <Kpi label="Total members" value={a.growth.total} />
          <Kpi label="New · 7 d" value={a.growth.new7d} />
          <Kpi label="New · 30 d" value={a.growth.new30d} />
          <Kpi label="New · 90 d" value={a.growth.new90d} />
        </KpiRow>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mt-6">
          <Card title="Cumulative growth · 12 months">
            <AreaChart points={a.growth.cumulativeMonthly} grain="month" />
          </Card>
          <Card title="Application funnel">
            <Funnel
              steps={[
                { name: "Submitted", value: a.growth.funnel.submitted },
                { name: "Reviewed", value: a.growth.funnel.reviewed },
                { name: "Approved", value: a.growth.funnel.approved, brass: true },
              ]}
            />
            <SubGrid>
              <SubStat label="Approval" value={`${a.growth.approvalRate}%`} />
              <SubStat label="Waitlist" value={`${a.growth.waitlistRate}%`} />
              <SubStat label="Rejection" value={`${a.growth.rejectionRate}%`} />
            </SubGrid>
          </Card>
        </div>
      </Block>

      {/* ════════════════ SECTION 04 — REFERRALS ════════════════ */}
      <Block n="0 4" title="Referrals & nominations">
        <KpiRow cols={4}>
          <Kpi label="Total nominations" value={a.referrals.total} />
          <Kpi label="Last 30 d" value={a.referrals.last30d} />
          <Kpi label="Acceptance rate" value={`${a.referrals.acceptanceRate}%`} />
          <Kpi label="Referral rate" value={`${a.referrals.referralRate}%`} detail="of new members" />
        </KpiRow>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mt-6">
          <Card title="Top referrers">
            <Leader
              rows={a.referrals.topReferrers.map((r, i) => ({
                rank: roman(i + 1),
                name: r.name,
                sub: `${r.club} · ${r.city}`,
                value: r.count,
              }))}
              emptyLabel="No accepted referrals yet."
            />
          </Card>
          <Card title="Member participation">
            <BigStat label="Members who nominated ≥1" value={`${a.referrals.nominatorsCount} of ${a.community.total}`} />
            <BigStat label="% members who nominate" value={`${a.referrals.pctWhoNominate}%`} />
            <BigStat label="Avg nominations per member" value={a.referrals.avgPerMember} />
          </Card>
        </div>
      </Block>

      {/* ════════════════ SECTION 05 — CHALLENGES ════════════════ */}
      <Block n="0 5" title="Challenges">
        <KpiRow cols={4}>
          <Kpi label="Sent" value={a.challenges.sent} />
          <Kpi label="Accepted" value={a.challenges.accepted} detail={`${a.challenges.acceptanceRate}%`} />
          <Kpi label="Cancelled" value={a.challenges.cancelled} />
          <Kpi label="Expired" value={a.challenges.expired} />
        </KpiRow>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mt-6">
          <Card title="Challenge funnel">
            <Funnel
              steps={[
                { name: "Sent", value: a.challenges.funnel.sent },
                { name: "Accepted", value: a.challenges.funnel.accepted },
                { name: "Match played", value: a.challenges.funnel.played },
                { name: "Confirmed", value: a.challenges.funnel.confirmed, brass: true },
              ]}
            />
          </Card>
          <Card title="Conversion timing">
            <BigStat label="Acceptance rate" value={`${a.challenges.acceptanceRate}%`} />
            <BigStat
              label="Avg time to accept"
              value={a.challenges.avgTimeToAcceptHours !== null ? `${a.challenges.avgTimeToAcceptHours} h` : "—"}
            />
            <BigStat
              label="Avg time to play"
              value={a.challenges.avgTimeToPlayDays !== null ? `${a.challenges.avgTimeToPlayDays} d` : "—"}
            />
          </Card>
        </div>
      </Block>

      {/* ════════════════ SECTION 06 — NETWORK DENSITY ════════════════ */}
      <Block n="0 6" title="Network density">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Cities">
            <Leader
              rows={a.density.cities.map((c, i) => ({
                rank: roman(i + 1),
                name: c.cityName,
                sub: `${c.members} members · ${c.matches} matches`,
                value: c.density,
              }))}
              emptyLabel="No active cities yet."
            />
            <p className="text-[10px] tracking-[0.2em] uppercase text-cs-muted mt-4">
              Density = matches per member, all-time
            </p>
          </Card>
          <Card title="Clubs">
            <Leader
              rows={a.density.clubs.map((c, i) => ({
                rank: roman(i + 1),
                name: c.clubName,
                sub: `${c.members} members · ${c.matches} matches`,
                value: c.density,
              }))}
              emptyLabel="No active clubs yet."
            />
          </Card>
        </div>
      </Block>

      {/* ════════════════ SECTION 07 — RETENTION ════════════════ */}
      <Block n="0 7" title="Retention">
        <KpiRow cols={5}>
          <Kpi label="D30 retention" value={`${a.retention.d30}%`} />
          <Kpi label="D60 retention" value={`${a.retention.d60}%`} />
          <Kpi label="D90 retention" value={`${a.retention.d90}%`} />
          <Kpi label="Returning · 7 d" value={`${a.retention.returning7d}%`} />
          <Kpi label="Repeat players" value={`${a.retention.repeatPlayersPct}%`} detail=">1 match" />
        </KpiRow>
      </Block>

      {/* ════════════════ SECTION 08 — TRAVEL ════════════════ */}
      <Block n="0 8" title="Travel network">
        <KpiRow cols={4}>
          <Kpi label="Currently traveling" value={a.travel.currentlyTraveling} />
          <Kpi label="Visiting · 30 d" value={a.travel.visiting30d} />
          <Kpi label="Travel matches · 30 d" value={a.travel.travelMatches30d} />
          <Kpi label="Travel match rate" value={`${a.travel.travelMatchRate}%`} />
        </KpiRow>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mt-6">
          <Card title="Most visited cities · 90 days">
            <Leader
              rows={a.travel.mostVisited.map((c, i) => ({
                rank: roman(i + 1),
                name: c.cityName,
                sub: `${c.visits} visit${c.visits === 1 ? "" : "s"} · ${c.uniqueMembers} unique members`,
                value: c.visits,
              }))}
              emptyLabel="No visiting plans on file."
            />
          </Card>
          <Card title="Travel match share">
            <RatioDonut percent={a.travel.travelMatchRate} caption={`${a.travel.travelMatches30d} of ${a.matchActivity.last30d} confirmed matches in the last 30 days involved a member visiting a different city.`} />
          </Card>
        </div>
      </Block>

      {/* ════════════════ SECTION 09 — INSIGHTS ════════════════ */}
      <Block n="0 9" title="Insights">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {a.insights.length === 0 ? (
            <p className="text-[13px] text-cs-muted">
              Not enough data to generate insights yet.
            </p>
          ) : (
            a.insights.map((s, i) => (
              <div
                key={i}
                className="bg-cs-ivory border border-cs-green/10 border-l-2 border-l-cs-brass px-4 py-3.5 flex gap-3"
              >
                <span className="font-display italic text-cs-brass text-[22px] leading-none">·</span>
                <p
                  className="text-[13px] text-cs-black/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: emphasize(s) }}
                />
              </div>
            ))
          )}
        </div>
      </Block>
    </div>
  );
}

/* ═══════════════ Presentational ═══════════════ */

function NorthStarBlock({ a }: { a: import("@/lib/admin/analytics").NorthStar }) {
  return (
    <div className="relative overflow-hidden bg-cs-green text-cs-ivory mt-8 px-7 lg:px-10 py-8 lg:py-10">
      <div
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-20 right-8 font-display italic text-white/[0.03] text-[280px] leading-none"
      >
        CS
      </div>
      <div className="text-[10px] tracking-[0.32em] uppercase text-cs-brassLight relative z-10">
        N O R T H &nbsp; S T A R
      </div>
      <div className="text-[12px] tracking-[0.06em] mt-1 text-cs-ivory/60 relative z-10">
        Matches played
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:gap-12 mt-4 relative z-10">
        <div>
          <div className="font-display italic font-medium text-[80px] lg:text-[120px] leading-[0.9] -tracking-[0.015em]">
            {a.total}
          </div>
          <div
            className={`inline-block text-[12px] tracking-[0.04em] px-3 py-1.5 mt-3 ${
              a.growthPct >= 0
                ? "bg-[#3a7a4f]/20 text-[#a4d6b3]"
                : "bg-cs-loss/16 text-[#e0a594]"
            }`}
          >
            <b>{a.growthPct >= 0 ? "▲" : "▼"} {Math.abs(a.growthPct)}%</b>
            {"  "}vs previous 30 days
          </div>
        </div>
        <div className="flex flex-wrap gap-8 lg:gap-12 mt-6 lg:mt-0 text-[12px] tracking-[0.06em] text-cs-ivory/55">
          <SubKpi value={a.thisMonth} label="This month" />
          <SubKpi value={a.last7d} label="Last 7 d" />
          <SubKpi value={a.last30d} label="Last 30 d" />
          <SubKpi value={a.last90d} label="Last 90 d" />
        </div>
      </div>
      {/* Sparkline */}
      <Sparkline points={a.spark} />
    </div>
  );
}

function SubKpi({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display italic text-[22px] text-cs-ivory leading-none">
        {value}
      </div>
      <div className="mt-1.5">{label}</div>
    </div>
  );
}

function Block({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex justify-between items-baseline border-b border-cs-green/10 pb-3 mb-6">
        <h3 className="font-display italic text-[24px] lg:text-[26px] text-cs-green m-0 -tracking-[0.005em]">
          {title}
        </h3>
        <span className="text-[11px] tracking-[0.28em] uppercase text-cs-brass">
          S E C T I O N &nbsp; {n}
        </span>
      </div>
      {children}
    </section>
  );
}

function KpiRow({
  cols,
  children,
}: {
  cols: 3 | 4 | 5;
  children: React.ReactNode;
}) {
  const tw =
    cols === 3
      ? "lg:grid-cols-3"
      : cols === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-5";
  return (
    <div
      className={`grid grid-cols-2 ${tw} gap-px bg-cs-green/10 border border-cs-green/10`}
    >
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  detail,
  delta,
}: {
  label: string;
  value: string | number;
  detail?: string;
  delta?: number;
}) {
  return (
    <div className="bg-[#FBF8F0] px-5 lg:px-6 py-5">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic font-medium text-[28px] lg:text-[34px] text-cs-green leading-none mt-2 -tracking-[0.01em]">
        {value}
      </div>
      {(detail || typeof delta === "number") && (
        <div className="flex gap-2 items-center text-[11px] text-cs-muted mt-2">
          {typeof delta === "number" && delta !== 0 && (
            <span className={delta > 0 ? "text-[#3a7a4f]" : "text-cs-loss"}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} pts
            </span>
          )}
          {detail && <span>{detail}</span>}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FBF8F0] border border-cs-green/10 px-6 py-5">
      <h4 className="font-display italic text-[18px] text-cs-green mb-3">{title}</h4>
      {children}
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[30px] text-cs-green leading-none mt-1.5">
        {value}
      </div>
    </div>
  );
}

function SubGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-px bg-cs-green/10 border border-cs-green/10 mt-4">
      {children}
    </div>
  );
}

function SubStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FBF8F0] px-3 py-2.5">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[20px] text-cs-green leading-none mt-1">
        {value}
      </div>
    </div>
  );
}

function Funnel({
  steps,
}: {
  steps: { name: string; value: number; brass?: boolean }[];
}) {
  const top = steps[0]?.value ?? 1;
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => {
        const w = top > 0 ? (s.value / top) * 100 : 0;
        return (
          <div
            key={i}
            className="grid grid-cols-[110px_minmax(0,1fr)_60px] items-center gap-3"
          >
            <span className="text-[12px] text-cs-green">{s.name}</span>
            <div className="h-10 bg-cs-green/10 relative overflow-hidden">
              <span
                className={`absolute left-0 top-0 bottom-0 ${s.brass ? "bg-cs-brass" : "bg-cs-green"}`}
                style={{ width: `${w}%` }}
              />
            </div>
            <span className="text-right font-display italic text-[16px] text-cs-green">
              {s.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Leader({
  rows,
  emptyLabel,
}: {
  rows: { rank: string; name: string; sub: string; value: string | number }[];
  emptyLabel: string;
}) {
  if (rows.length === 0)
    return <p className="text-[12px] text-cs-muted py-2">{emptyLabel}</p>;
  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[36px_minmax(0,1fr)_70px] items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0"
        >
          <span className="font-display italic text-cs-brass text-[18px]">{r.rank}</span>
          <div className="min-w-0">
            <div className="text-[13px] text-cs-green truncate">{r.name}</div>
            <div className="text-[11px] text-cs-muted mt-0.5 truncate">{r.sub}</div>
          </div>
          <span className="text-right font-display italic text-[18px] text-cs-green">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function BarChart({
  points,
  grain,
  highlightLast,
}: {
  points: { ts: string; count: number }[];
  grain: "day" | "week" | "month";
  highlightLast?: boolean;
}) {
  const W = 700;
  const H = 200;
  const max = Math.max(1, ...points.map((p) => p.count));
  const slotW = W / Math.max(points.length, 1);
  const barW = slotW * 0.6;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {/* grid */}
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#0E2A1F" strokeOpacity="0.07" />
        ))}
        {points.map((p, i) => {
          const h = (p.count / max) * (H - 12);
          const x = i * slotW + (slotW - barW) / 2;
          const y = H - h - 4;
          const isLast = i === points.length - 1;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={highlightLast && isLast ? "#A68B5B" : "#0E2A1F"}
            />
          );
        })}
        <line x1="0" y1={H - 4} x2={W} y2={H - 4} stroke="#0E2A1F" strokeOpacity="0.2" />
      </svg>
      <div className="flex justify-between text-[9px] text-cs-muted tracking-[0.18em] uppercase mt-1">
        <span>{labelFor(points[0]?.ts, grain)}</span>
        <span>{labelFor(points[Math.floor(points.length / 2)]?.ts, grain)}</span>
        <span>{labelFor(points[points.length - 1]?.ts, grain)}</span>
      </div>
    </>
  );
}

function AreaChart({
  points,
  grain,
}: {
  points: { ts: string; count: number }[];
  grain: "day" | "week" | "month";
}) {
  const W = 700;
  const H = 200;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = W / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = H - 4 - (p.count / max) * (H - 14);
    return `${x},${y}`;
  });
  const areaPoints = `${coords.join(" ")} ${(points.length - 1) * step},${H - 4} 0,${H - 4}`;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {[40, 100, 160].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#0E2A1F" strokeOpacity="0.07" />
        ))}
        <polyline fill="rgba(166,139,91,0.15)" stroke="none" points={areaPoints} />
        <polyline fill="none" stroke="#A68B5B" strokeWidth="2" points={coords.join(" ")} />
      </svg>
      <div className="flex justify-between text-[9px] text-cs-muted tracking-[0.18em] uppercase mt-1">
        <span>{labelFor(points[0]?.ts, grain)}</span>
        <span>{labelFor(points[Math.floor(points.length / 2)]?.ts, grain)}</span>
        <span>Now</span>
      </div>
    </>
  );
}

function Sparkline({ points }: { points: { ts: string; count: number }[] }) {
  if (points.length === 0) return null;
  const W = 800;
  const H = 60;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = W / Math.max(points.length - 1, 1);
  const coords = points
    .map((p, i) => {
      const x = i * step;
      const y = H - (p.count / max) * (H - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" height={H} preserveAspectRatio="none">
      <polyline
        fill="rgba(201,168,117,0.12)"
        stroke="none"
        points={`${coords} ${W},${H} 0,${H}`}
      />
      <polyline fill="none" stroke="#C9A875" strokeWidth="1.5" points={coords} />
    </svg>
  );
}

function Donut({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const r = 46;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
      <svg viewBox="0 0 120 120" width="170" height="170" className="flex-shrink-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e8e1cd" strokeWidth="14" />
        {slices.map((s, i) => {
          const len = (s.value / total) * C;
          const dash = `${len} ${C - len}`;
          const el = (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += len;
          return el;
        })}
        <text
          x="60"
          y="58"
          textAnchor="middle"
          fontFamily="Playfair Display, serif"
          fontStyle="italic"
          fill="#0E2A1F"
          fontSize="22"
        >
          {slices[0]?.value ?? 0}%
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          fontFamily="DM Sans, sans-serif"
          fill="#7a7567"
          fontSize="8"
          letterSpacing="2"
        >
          {(slices[0]?.label ?? "").toUpperCase()}
        </text>
      </svg>
      <div className="flex flex-col gap-2.5">
        {slices.map((s, i) => (
          <div key={i} className="text-[12px] text-cs-green">
            <span
              className="inline-block w-2.5 h-2.5 mr-2 align-middle"
              style={{ background: s.color }}
            />
            <span className="font-display italic">{s.label}</span>{" "}
            <span className="text-cs-muted">— {s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatioDonut({ percent, caption }: { percent: number; caption: string }) {
  const r = 80;
  const C = 2 * Math.PI * r;
  const len = (percent / 100) * C;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 220" width="100%" height="220" className="max-w-[260px]">
        <circle cx="110" cy="110" r={r} fill="none" stroke="#e8e1cd" strokeWidth="22" />
        <circle
          cx="110"
          cy="110"
          r={r}
          fill="none"
          stroke="#A68B5B"
          strokeWidth="22"
          strokeDasharray={`${len} ${C - len}`}
          transform="rotate(-90 110 110)"
        />
        <text
          x="110"
          y="105"
          textAnchor="middle"
          fontFamily="Playfair Display, serif"
          fontStyle="italic"
          fill="#0E2A1F"
          fontSize="42"
        >
          {percent}%
        </text>
        <text
          x="110"
          y="128"
          textAnchor="middle"
          fontFamily="DM Sans, sans-serif"
          fill="#7a7567"
          fontSize="9"
          letterSpacing="3"
        >
          TRAVEL · 30 D
        </text>
      </svg>
      <p className="text-[11px] text-cs-muted text-center leading-relaxed mt-2">{caption}</p>
    </div>
  );
}

/* ─── helpers ─── */

function roman(n: number): string {
  const map: Record<number, string> = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
  };
  return map[n] ?? String(n);
}

function labelFor(ts: string | undefined, grain: "day" | "week" | "month"): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (grain === "day") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (grain === "week") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function emphasize(s: string): string {
  // Wrap numbers and percentages in <b> to give insight cards a touch of
  // hierarchy without bloating the data layer with markup.
  return s.replace(/(\b\d+(?:\.\d+)?%?\b)/g, "<b style=\"color:#0E2A1F;font-weight:500\">$1</b>");
}
