import { describe, it, expect } from "vitest";
import { interpretOutcomeFollowup } from "@/lib/ai/interpretOutcomeFollowup";

// No OPENAI_API_KEY is present in the test environment (vitest doesn't load .env.local), so
// every call here exercises the deterministic fallback path — the same parsers the import
// pipeline already relies on (parseBudget, normalizeLocation). This is deliberate: it keeps
// these tests network-free and deterministic while still covering the path every outcome
// actually takes when AI is unavailable or fails, per the "never lose the answer" design.

describe("interpretOutcomeFollowup — budget_changed", () => {
  it("parses a simple 'around Xk' style answer", async () => {
    const result = await interpretOutcomeFollowup({ outcomeStatus: "budget_changed", rawAnswer: "around 900k" });
    expect(result.field).toBe("budget");
    expect(result.interpretedBy).toBe("deterministic");
    expect(result.structuredValue.max).toBe(900_000);
  });

  it("parses a range", async () => {
    const result = await interpretOutcomeFollowup({ outcomeStatus: "budget_changed", rawAnswer: "800k-1.1m" });
    expect(result.structuredValue.min).toBe(800_000);
    expect(result.structuredValue.max).toBe(1_100_000);
  });

  it("returns zero confidence and an empty structured value for an answer with no parseable number", async () => {
    // field stays "budget" (that's still what the question was about) so a human/UI can tell
    // "we tried and got nothing" apart from "no answer was given at all" (see the blank-answer
    // test below, which does resolve to field "none"). Callers must check structuredValue is
    // non-empty before writing a live signal, not just that field isn't "none".
    const result = await interpretOutcomeFollowup({ outcomeStatus: "budget_changed", rawAnswer: "not sure yet" });
    expect(result.field).toBe("budget");
    expect(result.confidence).toBe(0);
    expect(result.structuredValue).toEqual({});
  });
});

describe("interpretOutcomeFollowup — different_location", () => {
  it("resolves a known alias to its canonical name", async () => {
    const result = await interpretOutcomeFollowup({ outcomeStatus: "different_location", rawAnswer: "jvc" });
    expect(result.field).toBe("location");
    expect(result.structuredValue.locations).toContain("Jumeirah Village Circle");
  });

  it("resolves multiple locations separated by 'or'", async () => {
    const result = await interpretOutcomeFollowup({ outcomeStatus: "different_location", rawAnswer: "maybe Arjan or JVC" });
    const locations = result.structuredValue.locations as string[];
    expect(locations).toContain("Arjan");
    expect(locations).toContain("Jumeirah Village Circle");
  });
});

describe("interpretOutcomeFollowup — not_now", () => {
  it("treats a near-term timeframe as warm", async () => {
    const result = await interpretOutcomeFollowup({ outcomeStatus: "not_now", rawAnswer: "in about 2 months" });
    expect(result.field).toBe("readiness");
    expect(result.structuredValue.readiness).toBe("warm");
    expect(result.structuredValue.note).toBe("in about 2 months");
  });

  it("treats a vague answer as cold", async () => {
    const result = await interpretOutcomeFollowup({ outcomeStatus: "not_now", rawAnswer: "no idea, just not now" });
    expect(result.structuredValue.readiness).toBe("cold");
  });
});

describe("interpretOutcomeFollowup — empty answer", () => {
  it("returns field 'none' for a blank answer without calling anything further", async () => {
    const result = await interpretOutcomeFollowup({ outcomeStatus: "budget_changed", rawAnswer: "   " });
    expect(result).toEqual({ field: "none", structuredValue: {}, confidence: 0, interpretedBy: "none" });
  });
});
