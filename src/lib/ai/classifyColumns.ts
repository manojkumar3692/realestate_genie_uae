import { getAiProvider } from "./provider";
import { CANONICAL_FIELDS, type CanonicalFieldKey } from "@/lib/import/canonicalFields";

const FIELD_KEYS = CANONICAL_FIELDS.map((f) => f.key);

interface AiColumnResult {
  header: string;
  field: CanonicalFieldKey;
  confidence: number;
}

/**
 * AI fallback for columns the deterministic/fuzzy/value-inspection pipeline
 * couldn't confidently classify. Always called as a single batched request
 * for every ambiguous column in an import (never one call per column) — see
 * src/lib/import/detectColumns.ts's refineUnmappedColumnsWithAi, which this
 * feeds into as the injected classifier.
 */
export async function classifyColumnsBatch(
  columns: Array<{ header: string; samples: string[] }>
): Promise<Array<AiColumnResult | null>> {
  const provider = getAiProvider();
  if (!provider.configured || columns.length === 0) {
    return columns.map(() => null);
  }

  const fieldList = CANONICAL_FIELDS.map((f) => `- ${f.key}: ${f.label} — ${f.description}`).join("\n");
  const system = `You are a data-mapping assistant for a real-estate lead database. Given a spreadsheet column header and a few sample values, classify which canonical field it represents. Only choose from this exact list of field keys:\n${fieldList}\n- unmapped: none of the above fit\n\nRespond with strict JSON: {"results": [{"header": string, "field": one of the keys above, "confidence": number between 0 and 1}]}. Base confidence on how sure you are — use "unmapped" with low confidence if genuinely unclear. Never invent a field key outside the list.`;

  const user = JSON.stringify(
    columns.map((c) => ({ header: c.header, samples: c.samples.slice(0, 5) }))
  );

  const result = await provider.completeJson<{ results: AiColumnResult[] }>({
    system,
    user,
    maxOutputTokens: 800,
  });

  if (!result?.results) return columns.map(() => null);

  const byHeader = new Map(result.results.map((r) => [r.header, r]));
  return columns.map((c) => {
    const r = byHeader.get(c.header);
    if (!r || !FIELD_KEYS.includes(r.field)) return null;
    return { header: c.header, field: r.field, confidence: Math.min(Math.max(r.confidence, 0), 1) };
  });
}
