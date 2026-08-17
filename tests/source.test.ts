import { describe, it, expect } from "vitest";
import { normalizeSource } from "@/lib/normalize/source";

describe("normalizeSource", () => {
  it("groups Facebook/FB/Meta/Instagram under meta", () => {
    for (const raw of ["Facebook", "FB", "Meta Lead Ads", "Instagram", "IG"]) {
      expect(normalizeSource(raw).platform).toBe("meta");
    }
  });

  it("groups Google variants", () => {
    expect(normalizeSource("Google Ads").platform).toBe("google");
  });

  it("groups portal sources", () => {
    expect(normalizeSource("Bayut").platform).toBe("portal");
    expect(normalizeSource("Property Finder").platform).toBe("portal");
  });

  it("preserves the original raw value alongside the normalized platform", () => {
    const r = normalizeSource("Meta Lead Ads");
    expect(r.original).toBe("Meta Lead Ads");
    expect(r.platform).toBe("meta");
  });

  it("falls back to unknown for empty input", () => {
    expect(normalizeSource("").platform).toBe("unknown");
  });

  it("falls back to other for unrecognized sources", () => {
    expect(normalizeSource("Cold Call List Q3").platform).toBe("other");
  });
});
