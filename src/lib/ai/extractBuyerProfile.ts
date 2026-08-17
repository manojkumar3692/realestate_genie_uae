import { getAiProvider } from "./provider";

export interface BuyerProfileInput {
  customerId: string;
  /** Every free-text signal we have on this customer, newest last, each tagged with its date if known. */
  notes: Array<{ text: string; date?: string }>;
  /** Structured (deterministic) context already known, to avoid the AI re-deriving what we already have precisely. */
  structuredContext: {
    budgetMin?: number | null;
    budgetMax?: number | null;
    budgetCurrency?: string | null;
    preferredLocations?: string[];
    bedrooms?: string[];
    purpose?: string;
  };
}

export interface BuyerProfileEvidence {
  field: string;
  value: string;
  confidence: number;
  sourceExcerpt: string;
}

export interface BuyerProfileResult {
  customerId: string;
  inferredBudgetMin: number | null;
  inferredBudgetMax: number | null;
  inferredLocations: string[];
  inferredPropertyTypes: string[];
  inferredBedrooms: string[];
  inferredPurpose: "investment" | "end_use" | "holiday_home" | "unclear";
  inferredPaymentPreferences: string[];
  inferredTimeline: string;
  inferredObjections: string[];
  inferredDeveloperPreferences: string[];
  inferredPurchaseReadiness: "immediate" | "warm" | "cold" | "unknown";
  profileConfidence: number;
  aiSummary: string;
  evidence: BuyerProfileEvidence[];
}

const BATCH_SIZE = 12;
const CONCURRENCY = 3;

const SYSTEM_PROMPT = `You are a buyer-intelligence analyst for a UAE real-estate agency. For each customer, read their free-text notes (call notes, WhatsApp excerpts, remarks) plus any structured data already known, and infer their TRUE current buyer profile — not just what a form field says, but what the notes actually reveal.

Example: a note saying "1.2 is okay if payment plan is good" for a customer whose structured budget field says "1M" means their real ceiling is closer to 1.2M *if* the payment plan is attractive — capture that nuance in inferredBudgetMax and note it in evidence.

For every inferred field, you MUST provide a short verbatim excerpt from the notes as evidence and a confidence 0-1. If nothing in the notes supports a field, omit it (do not guess). Recent notes matter more than old ones. Write aiSummary as 2-3 plain-English sentences a busy agent can read in 5 seconds, in the voice of an analyst describing the customer (e.g. "Ahmed appears to be an investment-oriented buyer currently targeting approximately AED 900K-1.2M...").

Respond with strict JSON: {"results": [{
  "customerId": string,
  "inferredBudgetMin": number|null, "inferredBudgetMax": number|null,
  "inferredLocations": string[], "inferredPropertyTypes": string[], "inferredBedrooms": string[],
  "inferredPurpose": "investment"|"end_use"|"holiday_home"|"unclear",
  "inferredPaymentPreferences": string[], "inferredTimeline": string, "inferredObjections": string[],
  "inferredDeveloperPreferences": string[],
  "inferredPurchaseReadiness": "immediate"|"warm"|"cold"|"unknown",
  "profileConfidence": number,
  "aiSummary": string,
  "evidence": [{"field": string, "value": string, "confidence": number, "sourceExcerpt": string}]
}]}`;

export async function extractBuyerProfiles(
  inputs: BuyerProfileInput[]
): Promise<Map<string, BuyerProfileResult>> {
  const results = new Map<string, BuyerProfileResult>();
  const provider = getAiProvider();
  if (!provider.configured || inputs.length === 0) return results;

  const withNotes = inputs.filter((i) => i.notes.some((n) => n.text.trim().length > 0));
  const batches: BuyerProfileInput[][] = [];
  for (let i = 0; i < withNotes.length; i += BATCH_SIZE) {
    batches.push(withNotes.slice(i, i + BATCH_SIZE));
  }

  let cursor = 0;
  async function worker() {
    while (cursor < batches.length) {
      const batch = batches[cursor++];
      const user = JSON.stringify(
        batch.map((b) => ({
          customerId: b.customerId,
          notes: b.notes.slice(-8), // cap per-customer notes to keep the prompt bounded
          structuredContext: b.structuredContext,
        }))
      );
      const response = await provider.completeJson<{ results: BuyerProfileResult[] }>({
        system: SYSTEM_PROMPT,
        user,
        maxOutputTokens: 3000,
      });
      for (const r of response?.results ?? []) {
        if (r?.customerId) results.set(r.customerId, r);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
  return results;
}
