"use client";

import { useMemo, useState } from "react";
import {
  ACTIVITY_TABLE,
  BASE_POINTS_TABLE,
  DECAY_TABLE,
  activityMultiplier,
  basePoints,
  decayFactor,
  formatMultiplier,
  formatPoints,
} from "@/lib/points";

/**
 * Interactive points simulator — three dimensions (result + opponent level,
 * activity, decay) compose into a final points number that updates live.
 *
 * v2: base points depend only on the opponent's absolute level, not on the
 * difference between players.
 */
export function PointsExplainer() {
  const [won, setWon] = useState<boolean>(true);
  const [oppLevel, setOppLevel] = useState<number>(2); // default Intermediate
  const [activityIdx, setActivityIdx] = useState<number>(2); // default 3-4
  const [decayIdx, setDecayIdx] = useState<number>(0); // default 0-29

  const activityMatches = [0, 2, 3, 5, 7][activityIdx];
  const decayDays = [0, 30, 45, 60, 75][decayIdx];

  const base = useMemo(() => basePoints(won, oppLevel), [won, oppLevel]);
  const mult = useMemo(() => activityMultiplier(activityMatches), [activityMatches]);
  const dec = useMemo(() => decayFactor(decayDays), [decayDays]);
  const total = Math.round(base * mult * dec);

  return (
    <section className="px-7 py-7 border-t border-black/10">
      <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-2">
        How Court Society Points work
      </div>
      <p className="text-[12.5px] text-cs-black/75 leading-relaxed mb-5">
        Points depend only on who you played. Beat a higher-rated opponent
        and you earn more, no matter your own level. Win regularly to
        compound. Take a long break and points slowly decay.
      </p>

      {/* SIMULATOR */}
      <div className="border border-cs-brass/40 bg-cs-brass/[0.04] mb-6">
        <div className="flex items-start gap-4 px-4 py-4 border-b border-cs-brass/30">
          <div>
            <div className="font-display text-[44px] leading-none text-cs-green">
              {formatPoints(total)}
            </div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brass mt-1">
              Match points earned
            </div>
          </div>
          <div className="ml-auto text-right text-[10px] text-cs-muted leading-snug">
            {base}{" "}
            <span className="text-cs-muted/70">base</span>
            <br />
            {formatMultiplier(mult)}{" "}
            <span className="text-cs-muted/70">activity</span>
            <br />
            {Math.round(dec * 100)}%{" "}
            <span className="text-cs-muted/70">retained</span>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <SimulatorGroup
            label="Result"
            options={[
              { val: true, label: "Won" },
              { val: false, label: "Lost" },
            ]}
            selected={won}
            onChange={setWon}
          />
          <SimulatorGroup
            label="Opponent level"
            options={[
              { val: 0, label: "Beg" },
              { val: 1, label: "Rec" },
              { val: 2, label: "Int" },
              { val: 3, label: "Strong" },
              { val: 4, label: "Comp" },
              { val: 5, label: "Pro" },
            ]}
            selected={oppLevel}
            onChange={setOppLevel}
          />
          <SimulatorGroup
            label="Activity"
            options={[
              { val: 0, label: "0–1 / 30d" },
              { val: 1, label: "2 / 30d" },
              { val: 2, label: "3–4 / 30d" },
              { val: 3, label: "5–6 / 30d" },
              { val: 4, label: "7+ / 30d" },
            ]}
            selected={activityIdx}
            onChange={setActivityIdx}
          />
          <SimulatorGroup
            label="Days inactive"
            options={[
              { val: 0, label: "0–29" },
              { val: 1, label: "30–44" },
              { val: 2, label: "45–59" },
              { val: 3, label: "60–74" },
              { val: 4, label: "75+" },
            ]}
            selected={decayIdx}
            onChange={setDecayIdx}
          />
        </div>
      </div>

      {/* REFERENCE TABLES */}
      <ReferenceTable
        eyebrow="Base points by outcome"
        rows={BASE_POINTS_TABLE.map((r) => [r.label, String(r.points)])}
      />
      <div className="h-5" />
      <ReferenceTable
        eyebrow="Activity multiplier"
        rows={ACTIVITY_TABLE.map((r) => [r.range, formatMultiplier(r.mult)])}
      />
      <div className="h-5" />
      <ReferenceTable
        eyebrow="Decay by days inactive"
        rows={DECAY_TABLE.map((r) => [r.range, `${r.pct}%`])}
      />

      <p className="text-[11px] text-cs-muted leading-relaxed mt-6">
        Total points = sum of base points across confirmed matches × current
        activity multiplier × current decay factor. Ties are broken by total
        matches played.
      </p>
    </section>
  );
}

function SimulatorGroup<T extends string | number | boolean>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { val: T; label: string }[];
  selected: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.16em] uppercase text-cs-muted mb-1.5">
        {label}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => {
          const on = o.val === selected;
          return (
            <button
              key={String(o.val)}
              type="button"
              onClick={() => onChange(o.val)}
              className={`text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 border whitespace-nowrap ${
                on
                  ? "border-cs-green bg-cs-green text-cs-ivory"
                  : "border-black/15 text-cs-muted hover:text-cs-black"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReferenceTable({
  eyebrow,
  rows,
}: {
  eyebrow: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.18em] uppercase text-cs-brass mb-2">
        {eyebrow}
      </div>
      <ul className="border border-black/10">
        {rows.map(([k, v], i) => (
          <li
            key={i}
            className="flex justify-between items-center px-3 py-2 border-b border-black/5 last:border-b-0 text-[12.5px]"
          >
            <span className="text-cs-black">{k}</span>
            <span className="font-display text-cs-green">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
