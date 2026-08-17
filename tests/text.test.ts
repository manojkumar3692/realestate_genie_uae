import { describe, it, expect } from "vitest";
import { levenshtein, similarityRatio, tokenSetSimilarity, normalizeName } from "@/lib/normalize/text";

describe("levenshtein / similarityRatio", () => {
  it("returns 0 distance for identical strings", () => {
    expect(levenshtein("ahmed", "ahmed")).toBe(0);
  });

  it("computes edit distance for near-identical names", () => {
    expect(levenshtein("ahmed", "ahmad")).toBe(1);
  });

  it("similarityRatio is high for near-identical strings", () => {
    expect(similarityRatio("Ahmed Khan", "Ahmed Khaan")).toBeGreaterThan(0.85);
  });

  it("similarityRatio is low for unrelated strings", () => {
    expect(similarityRatio("Ahmed Khan", "Sarah Malik")).toBeLessThan(0.4);
  });
});

describe("normalizeName", () => {
  it("strips honorifics", () => {
    expect(normalizeName("Mr. Ahmed Khan")).toBe("ahmed khan");
  });
});

describe("tokenSetSimilarity", () => {
  it("is order-independent", () => {
    expect(tokenSetSimilarity("Ahmed Khan", "Khan Ahmed")).toBe(1);
  });

  it("handles a shortened name (A. Khan vs Ahmed Khan)", () => {
    expect(tokenSetSimilarity("A Khan", "Ahmed Khan")).toBeGreaterThan(0.4);
  });
});
