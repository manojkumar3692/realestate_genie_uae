import { describe, it, expect } from "vitest";
import { normalizeUaePhone, phoneFragmentsMatch } from "@/lib/normalize/phone";

describe("normalizeUaePhone", () => {
  it("normalizes local format with leading 0", () => {
    expect(normalizeUaePhone("0501234567").normalized).toBe("+971501234567");
  });

  it("normalizes numbers already carrying +971", () => {
    expect(normalizeUaePhone("+971501234567").normalized).toBe("+971501234567");
  });

  it("normalizes numbers with spaces and dashes", () => {
    expect(normalizeUaePhone("050 123 4567").normalized).toBe("+971501234567");
    expect(normalizeUaePhone("050-123-4567").normalized).toBe("+971501234567");
  });

  it("normalizes 00971 international prefix", () => {
    expect(normalizeUaePhone("00971501234567").normalized).toBe("+971501234567");
  });

  it("normalizes bare 9-digit mobile numbers", () => {
    expect(normalizeUaePhone("501234567").normalized).toBe("+971501234567");
  });

  it("flags UAE mobile numbers", () => {
    expect(normalizeUaePhone("0501234567").isUaeMobile).toBe(true);
  });

  it("all four Ahmed variants normalize to the same key", () => {
    const variants = ["0501234567", "+971501234567", "501234567", "050 123 4567"];
    const normalized = variants.map((v) => normalizeUaePhone(v).normalized);
    expect(new Set(normalized).size).toBe(1);
  });

  it("returns invalid for junk input", () => {
    expect(normalizeUaePhone("abc").valid).toBe(false);
    expect(normalizeUaePhone("").valid).toBe(false);
    expect(normalizeUaePhone(undefined).valid).toBe(false);
  });

  it("still normalizes non-UAE international numbers generically", () => {
    const result = normalizeUaePhone("+14155552671");
    expect(result.valid).toBe(true);
    expect(result.isUaeMobile).toBe(false);
  });
});

describe("phoneFragmentsMatch", () => {
  it("matches on shared trailing digits", () => {
    expect(phoneFragmentsMatch("+971501234567", "+971-50-1234567")).toBe(true);
  });

  it("does not match unrelated numbers", () => {
    expect(phoneFragmentsMatch("+971501234567", "+971559998888")).toBe(false);
  });
});
