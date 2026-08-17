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

function detectOneColumn(header: string, samples: string[]): ColumnDetection {
  const headerKey = normalizeKey(header);
  let best: { field: CanonicalFieldKey; confidence: number; method: ColumnDetection["method"] } | null =
    null;

  for (const field of CANONICAL_FIELDS) {
    // 1. Deterministic exact/substring alias match.
    let headerScore = 0;
    let method: ColumnDetection["method"] = "deterministic";
    for (const alias of [field.label, ...field.aliases]) {
      const aliasKey = normalizeKey(alias);
      if (!aliasKey) continue;
      if (headerKey === aliasKey) {
        headerScore = Math.max(headerScore, 0.97);
      } else if (aliasKey.length >= 3 && (headerKey.includes(aliasKey) || aliasKey.includes(headerKey))) {
        headerScore = Math.max(headerScore, 0.82);
      }
    }

    // 2. Fuzzy header similarity if no strong deterministic hit yet.
    if (headerScore < 0.6) {
      let fuzzyBest = 0;
      for (const alias of [field.label, ...field.aliases]) {
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
  const ambiguous = detections.filter((d) => d.confidence < 0.6);
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
