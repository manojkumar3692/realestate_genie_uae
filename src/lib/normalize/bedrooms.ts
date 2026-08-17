/** Parses bedroom labels ("Studio", "1BR", "2 Bedroom", "3BHK") into a comparable numeric count (0 = studio). */
export function parseBedroomCount(label: string): number | null {
  if (!label) return null;
  const s = label.trim().toLowerCase();
  if (/studio/.test(s)) return 0;
  const match = s.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isNaN(n) ? null : n;
}

export function parseBedroomCounts(labels: string[]): number[] {
  return labels.map(parseBedroomCount).filter((n): n is number => n !== null);
}

/** True if any of a's counts exactly matches any of b's. */
export function bedroomsExactOverlap(a: number[], b: number[]): boolean {
  return a.some((x) => b.includes(x));
}

/** True if the closest counts across the two lists are within 1 bedroom of each other. */
export function bedroomsAdjacent(a: number[], b: number[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  let minDiff = Infinity;
  for (const x of a) for (const y of b) minDiff = Math.min(minDiff, Math.abs(x - y));
  return minDiff <= 1;
}
