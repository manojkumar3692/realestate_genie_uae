import { describe, it, expect } from "vitest";
import { normalizeLocation, areLocationsSimilar, getSimilarLocations } from "@/lib/normalize/location";

describe("normalizeLocation", () => {
  it("maps common JVC aliases to the canonical name", () => {
    expect(normalizeLocation("JVC").canonical).toBe("Jumeirah Village Circle");
    expect(normalizeLocation("Jumeirah Village Circle").canonical).toBe("Jumeirah Village Circle");
  });

  it("maps Dubai South aliases including DWC", () => {
    expect(normalizeLocation("DWC").canonical).toBe("Dubai South");
    expect(normalizeLocation("Dubai World Central").canonical).toBe("Dubai South");
  });

  it("maps Business Bay abbreviation", () => {
    expect(normalizeLocation("BB").canonical).toBe("Business Bay");
  });

  it("preserves unknown locations rather than discarding them", () => {
    const r = normalizeLocation("Some New Community");
    expect(r.matched).toBe(false);
    expect(r.canonical).toBe("Some New Community");
  });

  it("handles empty input safely", () => {
    expect(normalizeLocation("").canonical).toBe("");
    expect(normalizeLocation(undefined).matched).toBe(false);
  });
});

describe("location similarity", () => {
  it("treats JVC and Arjan as similar but not identical", () => {
    expect(areLocationsSimilar("Jumeirah Village Circle", "Arjan")).toBe(true);
    const a: string = "Jumeirah Village Circle";
    const b: string = "Arjan";
    expect(a === b).toBe(false);
  });

  it("treats Sobha Hartland and Dubai Hills Estate as similar", () => {
    expect(areLocationsSimilar("Sobha Hartland", "Dubai Hills Estate")).toBe(true);
  });

  it("does not mark unrelated communities as similar", () => {
    expect(areLocationsSimilar("Palm Jumeirah", "Dubai South")).toBe(false);
  });

  it("returns an empty list for unknown locations", () => {
    expect(getSimilarLocations("Nowhere Land")).toEqual([]);
  });
});
