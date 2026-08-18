import { getAiProvider } from "./provider";
import { parseBudget } from "@/lib/normalize/budget";
import { normalizeLocation, LOCATION_DICTIONARY } from "@/lib/normalize/location";
import type { Readiness } from "@/lib/matching/score";

/**
 * The outcome loop's follow-up questions (spec §6): after "Budget Changed" / "Different
 * Location" / "Not Now", the agent types one short answer in their own words and this turns it
 * into a structured field for the "Living Buyer Profile" (customerLiveSignals — see schema.ts).
 *
 * AI does the interpreting (per product decision — "AI interprets messy human input ->
 * structured fields are updated -> deterministic matching engine recalculates the score"), but
 * every field already has a deterministic parser from the import pipeline (parseBudget,
 * normalizeLocation) that's reused as the fallback whenever AI is unavailable or fails. Nothing
 * is ever lost either way — worst case, a raw answer resolves to a lower-confidence structured
 * guess instead of an AI-refined one; it never resolves to nothing.
 */

export type OutcomeField = "budget" | "location" | "readiness" | "none";
export type FollowupOutcome = "budget_changed" | "different_location" | "not_now";

export interface OutcomeFollowupInput {
  outcomeStatus: FollowupOutcome;
  rawAnswer: string;
  currentBudgetMin?: number | null;
  currentBudgetMax?: number | null;
  currentCurrency?: string;
}

export interface OutcomeFollowupResult {
  field: OutcomeField;
  /** Shape depends on `field`: {min,max,currency} | {locations: string[]} | {readiness, note} */
  structuredValue: Record<string, unknown>;
  confidence: number;
  interpretedBy: "ai" | "deterministic" | "none";
}

const FIELD_BY_OUTCOME: Record<FollowupOutcome, OutcomeField> = {
  budget_changed: "budget",
  different_location: "location",
  not_now: "readiness",
};

const CANONICAL_LOCATIONS = LOCATION_DICTIONARY.map((e) => e.canonical);

const SYSTEM_PROMPT = `You are a buyer-intelligence analyst for a UAE real-estate agency. An agent just contacted a buyer and typed one short, informal answer to a follow-up question. Turn it into structured data. Be conservative: if the answer doesn't actually contain the information asked for, return low confidence and your best guess rather than inventing precision that isn't there.

For a budget answer: extract an approximate min/max in the stated (or assumed AED) currency. A single number like "900k" or "around 800000" means max ~= that number, min unknown (null). A range means min/max. Numbers may use "k"/"m"/lakh/crore.

For a location answer: match against this known list of canonical UAE community names, choosing every one the buyer mentioned (they may name more than one, e.g. "maybe Arjan or JVC"). Only use a name from this list; if nothing matches, return an empty array rather than guessing: ${CANONICAL_LOCATIONS.join(", ")}.

For a "not now, when" answer: infer a rough readiness — "warm" if they gave a near-term timeframe (weeks to ~3 months), "cold" if it's vague/distant/no timeframe, "unknown" if the answer gives no usable signal at all. Keep the original timing detail in "note" (e.g. "after Ramadan", "in 2 months") so a human can read it later.

Respond with strict JSON: {"field": "budget"|"location"|"readiness"|"none", "structuredValue": object, "confidence": number}`;

export async function interpretOutcomeFollowup(input: OutcomeFollowupInput): Promise<OutcomeFollowupResult> {
  const field = FIELD_BY_OUTCOME[input.outcomeStatus];
  const raw = input.rawAnswer.trim();
  if (!raw) return { field: "none", structuredValue: {}, confidence: 0, interpretedBy: "none" };

  const provider = getAiProvider();
  if (provider.configured) {
    try {
      const response = await provider.completeJson<{
        field: OutcomeField;
        structuredValue: Record<string, unknown>;
        confidence: number;
      }>({
        system: SYSTEM_PROMPT,
        user: JSON.stringify({
          outcomeStatus: input.outcomeStatus,
          expectedField: field,
          answer: raw,
          currentBudget:
            input.currentBudgetMin != null || input.currentBudgetMax != null
              ? { min: input.currentBudgetMin ?? null, max: input.currentBudgetMax ?? null, currency: input.currentCurrency ?? "AED" }
              : null,
        }),
        maxOutputTokens: 300,
        temperature: 0.1,
      });
      if (response && response.structuredValue && Object.keys(response.structuredValue).length > 0) {
        return {
          field: response.field ?? field,
          structuredValue: response.structuredValue,
          confidence: typeof response.confidence === "number" ? response.confidence : 0.5,
          interpretedBy: "ai",
        };
      }
    } catch {
      // Falls through to the deterministic parser below — AI is always optional enrichment here.
    }
  }

  return deterministicFallback(field, raw);
}

function deterministicFallback(field: OutcomeField, raw: string): OutcomeFollowupResult {
  if (field === "budget") {
    const parsed = parseBudget(raw);
    if (parsed.min === null && parsed.max === null) return { field, structuredValue: {}, confidence: 0, interpretedBy: "none" };
    return {
      field,
      structuredValue: { min: parsed.min, max: parsed.max, currency: parsed.currency ?? "AED" },
      confidence: parsed.confidence,
      interpretedBy: "deterministic",
    };
  }

  if (field === "location") {
    const tokens = raw
      .split(/,|\/|&|\bor\b|\band\b/i)
      .map((t) => t.trim())
      .filter(Boolean);
    const locations = Array.from(
      new Set(
        tokens
          .map((t) => normalizeLocation(t))
          .filter((l) => l.matched)
          .map((l) => l.canonical)
      )
    );
    if (locations.length === 0) return { field, structuredValue: {}, confidence: 0, interpretedBy: "none" };
    return { field, structuredValue: { locations }, confidence: 0.6, interpretedBy: "deterministic" };
  }

  if (field === "readiness") {
    const lower = raw.toLowerCase();
    const nearTerm = /\b(\d+\s*(day|week|month)s?|next month|this month|soon)\b/.test(lower);
    const readiness: Readiness = nearTerm ? "warm" : "cold";
    return { field, structuredValue: { readiness, note: raw }, confidence: 0.4, interpretedBy: "deterministic" };
  }

  return { field: "none", structuredValue: {}, confidence: 0, interpretedBy: "none" };
}
