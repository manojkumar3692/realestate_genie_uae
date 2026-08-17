import { CANONICAL_FIELDS, type CanonicalFieldKey } from "./canonicalFields";
import { normalizeKey, similarityRatio } from "@/lib/normalize/text";

export interface ColumnDetection {
  sourceColumn: string;
  detectedField: CanonicalFieldKey;
  confidence: number; // 0-1
  method: "deterministic" | "fuzzy" | "value_inspection" | "ai" | "manual";
  sampleValues: string[];
}

const FUZZY_THRESHOLD = 0.55;
const UNMAPPED_CONFIDENCE_CEILING = 0.35;

/**
 * Hybrid column detection: deterministic alias matching first (cheap, exact),
 * then fuzzy header matching, then value-inspection (looking at the actual
 * cell contents), all without any AI call. This alone handles the large
 * majority of real CRM exports. Columns that stay below
 * UNMAPPED_CONFIDENCE_CEILING are left for the optional AI pass
 * (src/lib/ai/classifyColumns.ts) to attempt, and always remain reviewable
 * and editable by the user regardless of source.
 */
export function detectColumns(
  headers: string[],
  columnSamples: Record<string, string[]>
): ColumnDetection[] {
  return headers.map((header) => detectOneColumn(header, columnSamples[header] ?? []));
}

/** Columns that are clearly internal record identifiers (Opportunity ID, Contact ID, Pipeline Stage ID...)
 *  should never be guessed into name/phone/email/status/date fields — we have no use for a raw internal
 *  ID today, and matching one in by accident (e.g. an alphanumeric CRM ID landing in "phone") silently
 *  corrupts dedupe. Always leave these unmapped for manual review instead of guessing. */
function isLikelyIdentifierColumn(headerKey: string): boolean {
  return /(^|_)(id|uuid|guid|ref|reference)(_|$)/.test(headerKey);
}

/** Token overlap (Jaccard-ish) between two normalized, underscore-joined keys. */
function keyTokenOverlap(aKey: string, bKey: string): number {
  const ta = new Set(aKey.split("_").filter(Boolean));
  const tb = new Set(bKey.split("_").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

function detectOneColumn(header: string, samples: string[]): ColumnDetection {
  const headerKey = normalizeKey(header);

  if (isLikelyIdentifierColumn(headerKey)) {
    return { sourceColumn: header, detectedField: "unmapped", confidence: 0.1, method: "deterministic", sampleValues: samples };
  }

  let best: { field: CanonicalFieldKey; confidence: number; method: ColumnDetection["method"] } | null =
    null;

  for (const field of CANONICAL_FIELDS) {
    // 1. Deterministic exact/substring alias match. Substring hits are weighted by how much of the
    // (longer of the two) string the alias actually covers, so a short generic alias like "name" loosely
    // contained inside a longer, more specific header ("lost reason name") doesn't outrank — or
    // arbitrarily tie with — a longer, more specific alias ("lost reason") that also matches. Without
    // this, ties were broken by field declaration order, which is what caused "lost reason name" to be
    // guessed as the customer's name.
    let headerScore = 0;
    let method: ColumnDetection["method"] = "deterministic";
    for (const alias of [field.label, ...field.aliases]) {
      const aliasKey = normalizeKey(alias);
      if (!aliasKey) continue;
      if (headerKey === aliasKey) {
        headerScore = Math.max(headerScore, 0.97);
      } else if (aliasKey.length >= 3 && (headerKey.includes(aliasKey) || aliasKey.includes(headerKey))) {
        const coverage = Math.min(aliasKey.length, headerKey.length) / Math.max(aliasKey.length, headerKey.length);
        headerScore = Math.max(headerScore, 0.82 * coverage);
      }
    }

    // 2. Fuzzy header similarity if no strong deterministic hit yet. For multi-token strings, plain
    // character-level Levenshtein similarity is unreliable — "Lead Value" and "lead date" are ~80%
    // similar character-by-character despite meaning nothing alike. Require genuine token overlap too
    // whenever either side has more than one token.
    if (headerScore < 0.6) {
      let fuzzyBest = 0;
      for (const alias of [field.label, ...field.aliases]) {
        const aliasKey = normalizeKey(alias);
        const isMultiToken = headerKey.includes("_") || aliasKey.includes("_");
        // Strictly greater than half: a single shared generic word ("lead" in "lead value" vs
        // "lead name") is not enough evidence on its own — the other, differentiating token(s) still
        // have to actually agree for a multi-token fuzzy match to mean anything.
        if (isMultiToken && keyTokenOverlap(headerKey, aliasKey) <= 0.5) continue;
        fuzzyBest = Math.max(fuzzyBest, similarityRatio(header, alias));
      }
      if (fuzzyBest >= FUZZY_THRESHOLD && fuzzyBest * 0.9 > headerScore) {
        headerScore = fuzzyBest * 0.9;
        method = "fuzzy";
      }
    }

    // 3. Value inspection — can independently support (or boost) a field guess.
    let valueScore = 0;
    if (field.valueHeuristic) {
      valueScore = field.valueHeuristic(samples);
    }

    let combined = headerScore;
    if (valueScore > 0) {
      if (headerScore >= 0.6) {
        // Header already confident — value inspection just nudges it up slightly.
        combined = Math.min(0.99, headerScore + valueScore * 0.15);
      } else if (valueScore > headerScore) {
        // Header was weak/ambiguous but the data itself is a strong signal
        // (e.g. a column named "X1" full of phone numbers).
        combined = valueScore;
        method = "value_inspection";
      }
    }

    if (!best || combined > best.confidence) {
      best = { field: field.key, confidence: combined, method };
    }
  }

  if (!best || best.confidence < UNMAPPED_CONFIDENCE_CEILING) {
    return {
      sourceColumn: header,
      detectedField: "unmapped",
      confidence: best ? Math.round(best.confidence * 100) / 100 : 0.2,
      method: "deterministic",
      sampleValues: samples,
    };
  }

  return {
    sourceColumn: header,
    detectedField: best.field,
    confidence: Math.round(Math.min(best.confidence, 0.99) * 100) / 100,
    method: best.method,
    sampleValues: samples,
  };
}

/**
 * Optional AI pass for columns the deterministic/fuzzy/value-inspection
 * pipeline couldn't confidently classify. Accepts an injected classifier so
 * this module stays provider-agnostic — the actual OpenAI call lives in
 * src/lib/ai/classifyColumns.ts and is only wired in where an API key is
 * configured. Batches every ambiguous column into a single call rather than
 * one request per column.
 */
export async function refineUnmappedColumnsWithAi(
  detections: ColumnDetection[],
  classifyBatch: (
    columns: Array<{ header: string; samples: string[] }>
  ) => Promise<Array<{ header: string; field: CanonicalFieldKey; confidence: number } | null>>
): Promise<ColumnDetection[]> {
  // Exclude columns the deterministic pass deliberately refused to map because they look like
  // internal record identifiers (Contact ID, Pipeline Stage ID...) — that refusal is intentional,
  // not a low-confidence guess to improve on. Sending them to the AI anyway defeats the point:
  // a model with no visibility into that rule can "rescue" a raw UUID into a plausible-sounding
  // wrong field (e.g. guessing a Pipeline Stage ID's UUID value is a "Status").
  const ambiguous = detections.filter((d) => d.confidence < 0.6 && !isLikelyIdentifierColumn(normalizeKey(d.sourceColumn)));
  if (ambiguous.length === 0) return detections;

  const results = await classifyBatch(
    ambiguous.map((d) => ({ header: d.sourceColumn, samples: d.sampleValues }))
  );

  const byHeader = new Map(results.filter(Boolean).map((r) => [r!.header, r!]));
  return detections.map((d) => {
    const aiResult = byHeader.get(d.sourceColumn);
    if (aiResult && aiResult.confidence > d.confidence) {
      return {
        ...d,
        detectedField: aiResult.field,
        confidence: Math.round(Math.min(aiResult.confidence, 0.95) * 100) / 100,
        method: "ai" as const,
      };
    }
    return d;
  });
}
