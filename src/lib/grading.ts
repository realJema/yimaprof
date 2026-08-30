/**
 * Grading helpers.
 *
 * The platform grades on an absolute scale (16/20 by default) instead of a
 * percentage. Percentages remain available for charts only.
 */

export const DEFAULT_GRADE_SCALE = 20;

export function scaleScore(
  score: number | null | undefined,
  possible: number | null | undefined,
  outOf: number = DEFAULT_GRADE_SCALE,
): number {
  const s = Number(score ?? 0);
  const p = Number(possible ?? 0);
  if (!p || p <= 0) return 0;
  return Math.round((s / p) * outOf * 100) / 100;
}

/** Trims trailing zeros: 16 -> "16", 15.5 -> "15.5" */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

/** "16/20" */
export function formatGrade(
  score: number | null | undefined,
  possible: number | null | undefined,
  outOf: number = DEFAULT_GRADE_SCALE,
): string {
  return `${formatNumber(scaleScore(score, possible, outOf))}/${outOf}`;
}

/** Accepts an already scaled note. */
export function formatScaled(scaled: number | null | undefined, outOf: number = DEFAULT_GRADE_SCALE): string {
  return `${formatNumber(Number(scaled ?? 0))}/${outOf}`;
}

export function gradeRatio(
  score: number | null | undefined,
  possible: number | null | undefined,
): number {
  const p = Number(possible ?? 0);
  if (!p || p <= 0) return 0;
  return Number(score ?? 0) / p;
}

export function gradeTextColor(ratio: number): string {
  if (ratio >= 0.75) return 'text-emerald-600 dark:text-emerald-400';
  if (ratio >= 0.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function gradeMention(ratio: number, fr: boolean): string {
  if (ratio >= 0.9) return fr ? 'Excellent' : 'Excellent';
  if (ratio >= 0.75) return fr ? 'Très bien' : 'Very good';
  if (ratio >= 0.6) return fr ? 'Bien' : 'Good';
  if (ratio >= 0.5) return fr ? 'Passable' : 'Pass';
  return fr ? 'Insuffisant' : 'Insufficient';
}
