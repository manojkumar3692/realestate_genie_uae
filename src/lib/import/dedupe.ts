import { tokenSetSimilarity } from "@/lib/normalize/text";
import { phoneFragmentsMatch } from "@/lib/normalize/phone";

export interface IdentityCandidate {
  id: string;
  name: string;
  normalizedPhone: string;
  normalizedEmail: string;
}

export type DuplicateMatchType = "exact_phone" | "exact_email" | "fuzzy_name_phone" | "other";
export type DuplicateConfidence = "confirmed" | "probable" | "possible";

export interface DuplicatePair {
  aId: string;
  bId: string;
  matchType: DuplicateMatchType;
  confidenceLevel: DuplicateConfidence;
  score: number;
}

const PROBABLE_NAME_SIMILARITY = 0.55;
const POSSIBLE_NAME_SIMILARITY = 0.3;

/**
 * Finds duplicate candidate pairs across a set of customer identities.
 * Deterministic and conservative by design (per spec: "do NOT aggressively
 * merge uncertain records") — only exact phone/email matches are "confirmed"
 * (safe to auto-merge); everything else is "probable"/"possible" and left
 * for review. Scales to large imports by bucketing on exact keys / phone
 * tail-fragments rather than doing a full O(n^2) comparison.
 */
export function findDuplicateCandidates(candidates: IdentityCandidate[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const seenPairs = new Set<string>();

  const addPair = (
    aId: string,
    bId: string,
    matchType: DuplicateMatchType,
    confidenceLevel: DuplicateConfidence,
    score: number
  ) => {
    if (aId === bId) return;
    const key = [aId, bId].sort().join("::");
    if (seenPairs.has(key)) return;
    seenPairs.add(key);
    pairs.push({ aId, bId, matchType, confidenceLevel, score });
  };

  // 1. Exact phone matches — confirmed.
  const byPhone = new Map<string, string[]>();
  for (const c of candidates) {
    if (!c.normalizedPhone) continue;
    if (!byPhone.has(c.normalizedPhone)) byPhone.set(c.normalizedPhone, []);
    byPhone.get(c.normalizedPhone)!.push(c.id);
  }
  for (const ids of byPhone.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addPair(ids[i], ids[j], "exact_phone", "confirmed", 1);
      }
    }
  }

  // 2. Exact email matches — confirmed.
  const byEmail = new Map<string, string[]>();
  for (const c of candidates) {
    if (!c.normalizedEmail) continue;
    if (!byEmail.has(c.normalizedEmail)) byEmail.set(c.normalizedEmail, []);
    byEmail.get(c.normalizedEmail)!.push(c.id);
  }
  for (const ids of byEmail.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addPair(ids[i], ids[j], "exact_email", "confirmed", 1);
      }
    }
  }

  // 3. Fuzzy name + phone-fragment matches — probable/possible, never auto-merged.
  const byFragment = new Map<string, string[]>();
  for (const c of candidates) {
    if (!c.normalizedPhone || c.normalizedPhone.length < 7) continue;
    const fragment = c.normalizedPhone.slice(-7);
    if (!byFragment.has(fragment)) byFragment.set(fragment, []);
    byFragment.get(fragment)!.push(c.id);
  }
  const byId = new Map(candidates.map((c) => [c.id, c]));
  for (const ids of byFragment.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = byId.get(ids[i])!;
        const b = byId.get(ids[j])!;
        if (!phoneFragmentsMatch(a.normalizedPhone, b.normalizedPhone)) continue;
        const nameSim = tokenSetSimilarity(a.name, b.name);
        if (nameSim >= PROBABLE_NAME_SIMILARITY) {
          addPair(a.id, b.id, "fuzzy_name_phone", "probable", nameSim);
        } else if (nameSim >= POSSIBLE_NAME_SIMILARITY) {
          addPair(a.id, b.id, "fuzzy_name_phone", "possible", nameSim);
        }
      }
    }
  }

  return pairs;
}
