/**
 * Court Society Points — scoring system.
 *
 *  total_points = sum(base_points_per_match) × activity_multiplier × decay_factor
 *
 * Activity multiplier rewards regular play; decay penalises long absence.
 * Base points reward beating stronger opponents disproportionately, so a
 * member can climb by playing up — not by farming below-level matches.
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

/* ────────── Base points ────────── */

/**
 * Points for a single match.
 * `levelDiff = opponent_level - player_level` from the scoring player's POV.
 * - Positive diff → opponent is higher rated → bigger reward for winning, less penalty for losing.
 * - Negative diff (rival below) → small reward / heavy penalty.
 */
export function basePoints(won: boolean, levelDiff: number): number {
  if (won) {
    if (levelDiff >= 2) return 220;
    if (levelDiff === 1) return 150;
    if (levelDiff === 0) return 100;
    return 60; // levelDiff <= -1
  }
  if (levelDiff >= 2) return 65;
  if (levelDiff === 1) return 45;
  if (levelDiff === 0) return 20;
  return 5; // levelDiff <= -1
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
  return v.toLocaleString("fr-FR").replace(/ /g, " ") + " pts";
}

/** Round a multiplier for display (×1.10, ×1.25, …). */
export function formatMultiplier(m: number): string {
  return `×${m.toFixed(2)}`;
}

/* ────────── Reference tables (for the explainer/simulator) ────────── */

export type BaseRow = {
  won: boolean;
  diff: number;
  label: string;
  points: number;
};

export const BASE_POINTS_TABLE: BaseRow[] = [
  { won: true,  diff:  0, label: "Victory · same level",          points: 100 },
  { won: true,  diff:  1, label: "Victory · rival 1 level above", points: 150 },
  { won: true,  diff:  2, label: "Victory · rival 2+ levels above", points: 220 },
  { won: true,  diff: -1, label: "Victory · rival 1 level below", points: 60 },
  { won: false, diff:  0, label: "Defeat · same level",           points: 20 },
  { won: false, diff:  1, label: "Defeat · rival 1 level above",  points: 45 },
  { won: false, diff:  2, label: "Defeat · rival 2+ levels above", points: 65 },
  { won: false, diff: -1, label: "Defeat · rival 1 level below",  points: 5 },
];

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
