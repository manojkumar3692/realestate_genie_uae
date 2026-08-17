import { describe, it, expect } from "vitest";
import { parseBudget, budgetsComparable } from "@/lib/normalize/budget";

describe("parseBudget", () => {
  it("parses 1M", () => {
    const r = parseBudget("1M");
    expect(r.min).toBe(1_000_000);
    expect(r.max).toBe(1_000_000);
  });

  it("parses 1.2m", () => {
    const r = parseBudget("1.2m");
    expect(r.min).toBe(1_200_000);
  });

  it("parses 800k", () => {
    const r = parseBudget("800k");
    expect(r.max).toBe(800_000);
  });

  it("parses lakhs", () => {
    expect(parseBudget("8 lakh").max).toBe(800_000);
    expect(parseBudget("10 lakhs").max).toBe(1_000_000);
  });

  it("parses crore", () => {
    expect(parseBudget("1 cr").max).toBe(10_000_000);
  });

  it("parses explicit AED amounts with commas", () => {
    const r = parseBudget("AED 1,000,000");
    expect(r.currency).toBe("AED");
    expect(r.max).toBe(1_000_000);
  });

  it("parses explicit ranges with a dash", () => {
    const r = parseBudget("1-1.2M");
    expect(r.min).toBe(1_000_000);
    expect(r.max).toBe(1_200_000);
  });

  it("parses explicit ranges with 'to'", () => {
    const r = parseBudget("800000 to 1000000");
    expect(r.min).toBe(800_000);
    expect(r.max).toBe(1_000_000);
  });

  it("treats 'under X' as a max cap only", () => {
    const r = parseBudget("under 900k");
    expect(r.min).toBeNull();
    expect(r.max).toBe(900_000);
  });

  it("treats 'can stretch to X' as a max cap", () => {
    const r = parseBudget("can stretch 1m if good PP");
    expect(r.max).toBe(1_000_000);
  });

  it("defaults to AED when no currency is present", () => {
    expect(parseBudget("900k").currency).toBe("AED");
    expect(parseBudget("900k").currencyExplicit).toBe(false);
  });

  it("infers INR from lakh/crore language when no other currency stated", () => {
    expect(parseBudget("50 lakh").currency).toBe("INR");
  });

  it("returns nulls for empty/unparseable input", () => {
    const r = parseBudget("not sure yet");
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
  });

  it("never silently compares mismatched currencies", () => {
    const a = parseBudget("AED 1,000,000");
    const b = parseBudget("50 lakh"); // INR
    expect(budgetsComparable(a, b)).toBe(false);
  });

  it("allows comparison when currencies match", () => {
    const a = parseBudget("AED 1,000,000");
    const b = parseBudget("AED 900,000");
    expect(budgetsComparable(a, b)).toBe(true);
  });
});
