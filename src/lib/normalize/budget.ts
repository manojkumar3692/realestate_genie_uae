/**
 * Parses messy real-estate budget text into a numeric min/max range.
 * Deterministic — no AI involved, per the "cheap, fast, auditable" principle
 * for anything that can be reliably done with code. The free-text AI
 * extraction layer (src/lib/ai/extractBuyerProfile.ts) handles nuance like
 * "can stretch to 1m if payment plan is good" that this can't.
 */

export interface ParsedBudget {
  min: number | null;
  max: number | null;
  /** ISO 4217-ish currency code we detected, or null if we couldn't tell. */
  currency: string | null;
  /** True if the text contained an explicit currency marker (vs. assumed). */
  currencyExplicit: boolean;
  raw: string;
  /** 0-1 — how confident we are in this parse. */
  confidence: number;
}

const CURRENCY_MARKERS: Array<[RegExp, string]> = [
  [/\baed\b/i, "AED"],
  [/\bdhs?\b/i, "AED"],
  [/د\.إ/, "AED"],
  [/\busd\b/i, "USD"],
  [/\$/, "USD"],
  [/\binr\b/i, "INR"],
  [/₹/, "INR"],
  [/\brs\.?\b/i, "INR"],
  [/\bgbp\b/i, "GBP"],
  [/£/, "GBP"],
  [/\beur\b/i, "EUR"],
  [/€/, "EUR"],
];

/** Indian numbering-system multipliers — only applied when "lakh"/"lac"/"cr"/"crore" appear. */
const LAKH = 100_000;
const CRORE = 10_000_000;

function unitMultiplier(unit: string): number {
  const u = unit.toLowerCase();
  if (u === "k" || u === "thousand") return 1_000;
  if (u === "m" || u === "mn" || u === "million") return 1_000_000;
  if (u.startsWith("lakh") || u.startsWith("lac")) return LAKH;
  if (u.startsWith("crore") || u === "cr") return CRORE;
  return 1;
}

export function parseBudget(raw: string | null | undefined): ParsedBudget {
  const empty: ParsedBudget = {
    min: null,
    max: null,
    currency: null,
    currencyExplicit: false,
    raw: raw ?? "",
    confidence: 0,
  };
  if (!raw || !raw.trim()) return empty;

  const text = raw.trim();
  const lower = text.toLowerCase();

  let currency: string | null = null;
  let currencyExplicit = false;
  for (const [re, code] of CURRENCY_MARKERS) {
    if (re.test(text)) {
      currency = code;
      currencyExplicit = true;
      break;
    }
  }
  // Indian-numbering words strongly imply INR if no other currency was stated.
  const hasIndianUnits = /\b(lakh|lac|lakhs|lacs|crore|cr)\b/i.test(lower);
  if (!currency && hasIndianUnits) currency = "INR";
  if (!currency) currency = "AED"; // default assumption for a UAE agency's own database

  // Special-case "1-1.2M" style ranges where only the second number carries a
  // unit suffix — the unit implicitly applies to both sides.
  const impliedUnitRange = lower.match(
    /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|k|m|mn|million|thousand)\b/
  );
  if (impliedUnitRange) {
    const [, first, second, unit] = impliedUnitRange;
    const multiplier = unitMultiplier(unit);
    const min = parseFloat(first) * multiplier;
    const max = parseFloat(second) * multiplier;
    return { min: Math.min(min, max), max: Math.max(min, max), currency, currencyExplicit, raw: text, confidence: 0.9 };
  }

  // Extract every "number + optional unit" token in the string, in order.
  const tokenRe =
    /(\d[\d,]*\.?\d*)\s*(lakhs?|lacs?|crores?|cr|k|m|mn|million|thousand)?/gi;
  const values: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(lower)) !== null) {
    const numStr = match[1].replace(/,/g, "");
    const num = parseFloat(numStr);
    if (Number.isNaN(num)) continue;
    const unit = (match[2] || "").toLowerCase();
    let value = num;
    if (unit === "k" || unit === "thousand") value = num * 1_000;
    else if (unit === "m" || unit === "mn" || unit === "million") value = num * 1_000_000;
    else if (unit.startsWith("lakh") || unit.startsWith("lac")) value = num * LAKH;
    else if (unit.startsWith("crore") || unit === "cr") value = num * CRORE;
    else {
      // A bare large number like "1000000" or "800000" — keep as-is. A bare
      // small number ("1.2" with no unit in a budget field) is too ambiguous
      // to trust, so we drop it rather than guess.
      if (num < 1000) continue;
      value = num;
    }
    values.push(value);
  }

  if (values.length === 0) return { ...empty, currency, currencyExplicit };

  if (values.length === 1) {
    const [v] = values;
    // "under 900k" => treat as a max cap. "can stretch to 1m" => also a max.
    if (/\b(under|below|max|up to|upto|budget of|around|approx)\b/i.test(lower)) {
      return { min: null, max: v, currency, currencyExplicit, raw: text, confidence: 0.7 };
    }
    if (/\b(stretch|can go up to|willing to go)\b/i.test(lower)) {
      return { min: null, max: v, currency, currencyExplicit, raw: text, confidence: 0.6 };
    }
    return { min: v, max: v, currency, currencyExplicit, raw: text, confidence: 0.85 };
  }

  // Two or more numbers found — treat as a range (min = smallest, max = largest).
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, currency, currencyExplicit, raw: text, confidence: 0.9 };
}

/** True only when both budgets share a known, equal currency — never compare across currencies silently. */
export function budgetsComparable(a: ParsedBudget, b: ParsedBudget): boolean {
  return Boolean(a.currency && b.currency && a.currency === b.currency);
}

export function formatMoney(value: number | null | undefined, currency = "AED"): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 2)}M`;
  if (value >= 1_000) return `${currency} ${(value / 1_000).toFixed(0)}K`;
  return `${currency} ${value.toFixed(0)}`;
}
