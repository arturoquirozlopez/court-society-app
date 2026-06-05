/**
 * Court Society Points — scoring system (v2).
 *
 *  total_points = sum(base_points_per_match) × activity_multiplier × decay_factor
 *
 * Activity multiplier rewards regular play; decay penalises long absence.
 *
 * Base points (v2) depend ONLY on the absolute level of the opponent —
 * not on the difference between players. The same win against a Former
 * Pro is worth +200 whether you're a Beginner or a Former Pro yourself,
 * so the table is easier to read and rankings are directly comparable
 * across the whole community.
 *
 * Pure functions: no DB access here. Server-side aggregation lives in
 * `getSeasonRanking()` in `queries.ts`.
 */

import type { PlayLevel } from "./types";

/* ────────── Level index 0–5 ────────── */

export const LEVEL_IDX: Record<PlayLevel, number> = {
  beginner: 0,
  recreational: 1,
  intermediate: 2,
  strong_club: 3,
  competitive: 4,
  former_pro: 5,
};

export const LEVEL_NAME: Record<number, string> = {
  0: "Beginner",
  1: "Recreational",
  2: "Intermediate",
  3: "Strong club",
  4: "Competitive",
  5: "Former pro",
};

export function levelToIdx(
  level: PlayLevel | null | undefined,
): number | null {
  if (!level) return null;
  return LEVEL_IDX[level] ?? null;
}

/* ────────── Base points (v2) ────────── */

/**
 * Points for a single match — depends ONLY on `opponentLevelIdx` (0–5).
 * The scoring player's own level does not enter the calculation.
 *
 * Examples:
 *   basePoints(true,  5) === 200  // beat a Former Pro
 *   basePoints(true,  0) ===  20  // beat a Beginner
 *   basePoints(false, 5) ===  75  // lose to a Former Pro
 */
const WIN_BY_LEVEL: Record<number, number> = {
  0: 20,
  1: 40,
  2: 70,
  3: 100,
  4: 150,
  5: 200,
};
const LOSS_BY_LEVEL: Record<number, number> = {
  0: 5,
  1: 10,
  2: 20,
  3: 35,
  4: 55,
  5: 75,
};

export function basePoints(won: boolean, opponentLevelIdx: number): number {
  const idx = Math.max(0, Math.min(5, Math.floor(opponentLevelIdx)));
  return won ? (WIN_BY_LEVEL[idx] ?? 0) : (LOSS_BY_LEVEL[idx] ?? 0);
}

/* ────────── Activity multiplier ────────── */

/** Matches played in the trailing 30 days → multiplier on total points. */
export function activityMultiplier(matchesLast30Days: number): number {
  if (matchesLast30Days >= 7) return 1.25;
  if (matchesLast30Days >= 5) return 1.18;
  if (matchesLast30Days >= 3) return 1.1;
  if (matchesLast30Days >= 2) return 1.05;
  return 1.0;
}

/* ────────── Decay ────────── */

/** Days since last confirmed match → fraction of points retained. */
export function decayFactor(daysSinceLast: number): number {
  if (daysSinceLast >= 75) return 0.55;
  if (daysSinceLast >= 60) return 0.7;
  if (daysSinceLast >= 45) return 0.85;
  if (daysSinceLast >= 30) return 0.95;
  return 1.0;
}

/* ────────── Display ────────── */

/** "1 840 pts" — thin-space thousand separator. */
export function formatPoints(n: number): string {
  const v = Math.round(n);
  return v.toLocaleString("fr-FR").replace(/ /g, " ") + " pts";
}

/** Round a multiplier for display (×1.10, ×1.25, …). */
export function formatMultiplier(m: number): string {
  return `×${m.toFixed(2)}`;
}

/* ────────── Reference tables (for the explainer/simulator) ────────── */

export type BaseRow = {
  won: boolean;
  oppLevel: number;
  label: string;
  points: number;
};

const LEVEL_LABEL_SHORT: Record<number, string> = {
  0: "Beginner",
  1: "Recreational 2.5–3.0",
  2: "Intermediate 3.0–3.5",
  3: "Strong club 4.0–4.5",
  4: "Competitive 5.0+",
  5: "Former pro",
};

export const BASE_POINTS_TABLE: BaseRow[] = (
  [0, 1, 2, 3, 4, 5] as const
).flatMap((idx) => [
  {
    won: true,
    oppLevel: idx,
    label: `Beat ${LEVEL_LABEL_SHORT[idx]}`,
    points: WIN_BY_LEVEL[idx],
  },
  {
    won: false,
    oppLevel: idx,
    label: `Lose to ${LEVEL_LABEL_SHORT[idx]}`,
    points: LOSS_BY_LEVEL[idx],
  },
]);

export const ACTIVITY_TABLE = [
  { range: "0–1 matches / 30d", mult: 1.0 },
  { range: "2 matches / 30d",   mult: 1.05 },
  { range: "3–4 matches / 30d", mult: 1.1 },
  { range: "5–6 matches / 30d", mult: 1.18 },
  { range: "7+ matches / 30d",  mult: 1.25 },
];

export const DECAY_TABLE = [
  { range: "0–29 days",   pct: 100 },
  { range: "30–44 days",  pct: 95 },
  { range: "45–59 days",  pct: 85 },
  { range: "60–74 days",  pct: 70 },
  { range: "75+ days",    pct: 55 },
];
