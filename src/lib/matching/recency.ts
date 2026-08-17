/**
 * Recency decay for historical signals. Recent activity should count more
 * than old activity, but repeated activity across years still carries real
 * signal (five investor enquiries over 2 years is a strong profile even if
 * none happened last week) — see spec section 30.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const HALF_LIFE_DAYS = 365; // one year — a signal loses half its weight per year of staleness

export function daysSince(date: Date | null | undefined, now: Date): number {
  if (!date) return Infinity;
  return Math.max(0, (now.getTime() - date.getTime()) / MS_PER_DAY);
}

export function monthsSince(date: Date | null | undefined, now: Date): number {
  const d = daysSince(date, now);
  return d === Infinity ? Infinity : d / 30;
}

/** 0-1 decay weight for a single event, given how long ago it happened. */
export function recencyWeight(date: Date | null | undefined, now: Date): number {
  const days = daysSince(date, now);
  if (days === Infinity) return 0;
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/**
 * Combines multiple historical touchpoints into a single 0-1 "how active/
 * relevant is this history" score. Repeated engagement across time still
 * accumulates value even as any single old event decays.
 */
export function recencyWeightedActivityScore(dates: Array<Date | null | undefined>, now: Date): number {
  if (dates.length === 0) return 0;
  const weights = dates.map((d) => recencyWeight(d, now));
  const sum = weights.reduce((a, b) => a + b, 0);
  // Diminishing returns beyond ~4 strongly-weighted touchpoints, capped at 1.
  return Math.min(1, sum / 3);
}
