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

// Note extraction batches carry real free-text (call notes can run several paragraphs — see the
// GHL-style call-log entries this was tuned against), so they need a smaller batch size and a
// bigger output ceiling than the other AI call sites to avoid the model's JSON response getting
// cut off mid-generation before it finishes (which reliably produces a "unterminated string" /
// "unexpected end of input" parse error, not a helpful one).
const BATCH_SIZE = 8;
const MAX_OUTPUT_TOKENS = 4500;
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
  console.log(`  [ai:notes] ${withNotes.length} customers with notes -> ${batches.length} batches (${CONCURRENCY} concurrent)`);

  // Run one batch; on failure (truncation, transient rate limit, etc.) retry as two smaller
  // batches rather than just losing every customer in the batch. Bottoms out at batch size 1 —
  // if a single customer's notes alone still fail, that customer just gets no AI-inferred profile
  // (their raw/normalized data is completely unaffected either way).
  async function runBatch(batch: BuyerProfileInput[], label: string): Promise<void> {
    const validIds = new Set(batch.map((b) => b.customerId));
    const user = JSON.stringify(
      batch.map((b) => ({
        customerId: b.customerId,
        notes: b.notes.slice(-8), // cap per-customer notes to keep the prompt bounded
        structuredContext: b.structuredContext,
      }))
    );
    let response: { results: BuyerProfileResult[] } | null = null;
    try {
      response = await provider.completeJson<{ results: BuyerProfileResult[] }>({
        system: SYSTEM_PROMPT,
        user,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
    } catch (err) {
      // completeJson already swallows provider errors and returns null — this catch is a
      // last-resort net for anything unexpected (e.g. a JSON.stringify issue).
      console.error(`  [ai:notes] batch ${label} threw:`, err instanceof Error ? err.message : err);
    }
    if (response?.results) {
      for (const r of response.results) {
        // Never trust an AI-echoed id as a database key without checking it against what this
        // batch actually asked about. A model reproducing a long random id string (e.g.
        // "cust_ab601807-cb9e-46fc-bd5f70f6252ba1e5") across several customers in one response can
        // occasionally drop or transpose a character — that "customer" then doesn't exist, and
        // writing it straight to the database throws a foreign-key violation deep in an unrelated
        // insert, with no hint the real cause was an unvalidated AI response.
        if (r?.customerId && validIds.has(r.customerId)) {
          results.set(r.customerId, r);
        } else if (r?.customerId) {
          console.error(`  [ai:notes] batch ${label}: AI returned unrecognized customerId "${r.customerId}" — discarding (not one of the ${batch.length} customers sent)`);
        }
      }
      return;
    }
    if (batch.length > 1) {
      console.log(`  [ai:notes] batch ${label} failed — retrying as two smaller batches`);
      const mid = Math.ceil(batch.length / 2);
      await runBatch(batch.slice(0, mid), `${label}a`);
      await runBatch(batch.slice(mid), `${label}b`);
    } else {
      console.error(`  [ai:notes] giving up on customer ${batch[0].customerId} after retry — no AI-inferred profile for them (their raw/normalized data is unaffected)`);
    }
  }

  let cursor = 0;
  let done = 0;
  async function worker() {
    while (cursor < batches.length) {
      const batchNumber = cursor + 1;
      const batch = batches[cursor++];
      await runBatch(batch, String(batchNumber));
      done++;
      console.log(`  [ai:notes] batch ${batchNumber}/${batches.length} done (${done}/${batches.length} total)`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
  return results;
}
