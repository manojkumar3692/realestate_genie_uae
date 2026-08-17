import { getAiProvider } from "./provider";

export interface MatchExplanationInput {
  customerId: string;
  customerSummary: string;
  projectSummary: string;
  deterministicScore: number;
}

export interface MatchExplanationResult {
  customerId: string;
  /** Optional small nudge to the deterministic score based on textual nuance (e.g. resolved objections). Bounded by the caller. */
  scoreAdjustment: number;
  positives: string[];
  concerns: string[];
}

const BATCH_SIZE = 15;
const CONCURRENCY = 3;
const MAX_ADJUSTMENT = 8;

const SYSTEM_PROMPT = `You write short, explainable reasons why a historical real-estate lead may be worth reactivating for a specific new project. You are NOT calculating the score — a deterministic engine already did that from structured budget/location/bedroom/timeline/payment-plan data. Your job is to read the nuance a filter would miss (e.g. a past objection like "too expensive" resolved by this project's lower price, or "wanted good payment plan" resolved by a flexible plan here) and:
1. Optionally nudge the score by at most ±${MAX_ADJUSTMENT} points if the notes clearly justify it (leave at 0 otherwise).
2. Write 2-5 short positive bullets (why this is a good match) in plain business language — no AI/ML jargon.
3. Write 0-3 short concern bullets (e.g. stale timeline, last contact long ago) if genuinely relevant.

Never fabricate specifics not present in the summaries. Respond with strict JSON: {"results": [{"customerId": string, "scoreAdjustment": number, "positives": string[], "concerns": string[]}]}`;

export async function generateMatchExplanations(
  inputs: MatchExplanationInput[]
): Promise<Map<string, MatchExplanationResult>> {
  const results = new Map<string, MatchExplanationResult>();
  const provider = getAiProvider();
  if (!provider.configured || inputs.length === 0) return results;

  const batches: MatchExplanationInput[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) batches.push(inputs.slice(i, i + BATCH_SIZE));

  let cursor = 0;
  async function worker() {
    while (cursor < batches.length) {
      const batch = batches[cursor++];
      const user = JSON.stringify(
        batch.map((b) => ({
          customerId: b.customerId,
          customerSummary: b.customerSummary,
          projectSummary: b.projectSummary,
          deterministicScore: b.deterministicScore,
        }))
      );
      const response = await provider.completeJson<{ results: MatchExplanationResult[] }>({
        system: SYSTEM_PROMPT,
        user,
        maxOutputTokens: 2500,
      });
      for (const r of response?.results ?? []) {
        if (!r?.customerId) continue;
        const clampedAdjustment = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, r.scoreAdjustment || 0));
        results.set(r.customerId, { ...r, scoreAdjustment: clampedAdjustment });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
  return results;
}
