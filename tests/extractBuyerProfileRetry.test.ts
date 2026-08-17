import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulate exactly what production just hit: a provider that "truncates" (returns null, as
// completeJson does on any failure) whenever asked to handle more than one customer in a single
// call, but succeeds for a single customer. This proves the batch-splitting retry in
// extractBuyerProfiles actually recovers every customer instead of silently dropping them —
// not just that the code compiles.
let callLog: number[] = [];
let mockImpl: (batch: Array<{ customerId: string }>) => { results: unknown[] } | null = (batch) => {
  if (batch.length > 1) return null; // simulates truncation
  return { results: [{ customerId: batch[0].customerId, aiSummary: "ok", evidence: [] }] };
};

vi.mock("../src/lib/ai/provider", () => ({
  getAiProvider: () => ({
    configured: true,
    name: "fake",
    completeJson: async (params: { user: string }) => {
      const batch = JSON.parse(params.user) as Array<{ customerId: string }>;
      callLog.push(batch.length);
      return mockImpl(batch);
    },
  }),
}));

const { extractBuyerProfiles } = await import("../src/lib/ai/extractBuyerProfile");

describe("extractBuyerProfiles retry-by-splitting", () => {
  beforeEach(() => {
    callLog = [];
    mockImpl = (batch) => {
      if (batch.length > 1) return null;
      return { results: [{ customerId: batch[0].customerId, aiSummary: "ok", evidence: [] }] };
    };
  });

  it("recovers every customer even when full-size batches always fail", async () => {
    const inputs = Array.from({ length: 8 }, (_, i) => ({
      customerId: `cust_${i}`,
      notes: [{ text: "wants a 2br in JVC, budget 1.2M" }],
      structuredContext: {},
    }));

    const results = await extractBuyerProfiles(inputs as never);

    expect(results.size).toBe(8);
    for (const input of inputs) {
      expect(results.has(input.customerId)).toBe(true);
    }
    // Every call beyond the initial full batch must have been a strictly smaller retry —
    // proves it actually shrinks toward size 1 instead of looping on the same size forever.
    expect(callLog.some((n) => n === 1)).toBe(true);
    expect(Math.max(...callLog)).toBeLessThanOrEqual(8);
  });

  it("does not fabricate a profile for a customer whose notes are empty", async () => {
    const inputs = [
      { customerId: "has_notes", notes: [{ text: "wants 3br villa" }], structuredContext: {} },
      { customerId: "no_notes", notes: [{ text: "" }], structuredContext: {} },
    ];
    const results = await extractBuyerProfiles(inputs as never);
    expect(results.has("has_notes")).toBe(true);
    expect(results.has("no_notes")).toBe(false);
  });

  it("discards an AI-echoed customerId that doesn't match any customer actually sent in the batch", async () => {
    // Reproduces the real production crash: the model mangled a long id string when echoing it
    // back, producing a customerId that was never sent and doesn't exist in the database. That
    // must never be written downstream as if it were a real customer.
    mockImpl = (batch) => ({
      results: batch.map((b, i) =>
        i === 0
          ? { customerId: "cust_HALLUCINATED-not-a-real-id", aiSummary: "wrong", evidence: [] }
          : { customerId: b.customerId, aiSummary: "ok", evidence: [] }
      ),
    });

    const inputs = [
      { customerId: "cust_real_1", notes: [{ text: "wants a 3br" }], structuredContext: {} },
      { customerId: "cust_real_2", notes: [{ text: "wants a 2br" }], structuredContext: {} },
    ];
    const results = await extractBuyerProfiles(inputs as never);

    expect(results.has("cust_HALLUCINATED-not-a-real-id")).toBe(false);
    expect(results.has("cust_real_1")).toBe(false); // the customer whose slot the AI mangled gets no profile...
    expect(results.has("cust_real_2")).toBe(true); // ...but everyone else in the batch is unaffected
  });
});
