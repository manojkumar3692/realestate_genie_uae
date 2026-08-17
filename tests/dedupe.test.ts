import { describe, it, expect } from "vitest";
import { findDuplicateCandidates } from "@/lib/import/dedupe";
import { normalizeUaePhone } from "@/lib/normalize/phone";

const phone = (raw: string) => normalizeUaePhone(raw).normalized;

describe("findDuplicateCandidates", () => {
  it("flags exact phone matches as confirmed", () => {
    const candidates = [
      { id: "1", name: "Ahmed Khan", normalizedPhone: phone("0501234567"), normalizedEmail: "" },
      { id: "2", name: "A. Khan", normalizedPhone: phone("+971501234567"), normalizedEmail: "" },
    ];
    const pairs = findDuplicateCandidates(candidates);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].confidenceLevel).toBe("confirmed");
    expect(pairs[0].matchType).toBe("exact_phone");
  });

  it("flags exact email matches as confirmed", () => {
    const candidates = [
      { id: "1", name: "Ahmed", normalizedPhone: "", normalizedEmail: "ahmed@example.com" },
      { id: "2", name: "Ahmed K", normalizedPhone: "", normalizedEmail: "ahmed@example.com" },
    ];
    const pairs = findDuplicateCandidates(candidates);
    expect(pairs[0].confidenceLevel).toBe("confirmed");
    expect(pairs[0].matchType).toBe("exact_email");
  });

  it("flags similar-name + matching phone-tail as probable, not confirmed", () => {
    const candidates = [
      { id: "1", name: "Ahmed Khan", normalizedPhone: "+971501234567", normalizedEmail: "" },
      { id: "2", name: "Ahmed Khann", normalizedPhone: "+9715011234567", normalizedEmail: "" }, // different lead digit, shares tail
    ];
    const pairs = findDuplicateCandidates(candidates);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0].confidenceLevel).not.toBe("confirmed");
  });

  it("does not flag unrelated customers as duplicates", () => {
    const candidates = [
      { id: "1", name: "Ahmed Khan", normalizedPhone: phone("0501234567"), normalizedEmail: "ahmed@example.com" },
      { id: "2", name: "Sarah Malik", normalizedPhone: phone("0559998888"), normalizedEmail: "sarah@example.com" },
    ];
    expect(findDuplicateCandidates(candidates)).toHaveLength(0);
  });

  it("never produces duplicate pairs for the same pair twice across rules", () => {
    const candidates = [
      { id: "1", name: "Ahmed Khan", normalizedPhone: phone("0501234567"), normalizedEmail: "ahmed@example.com" },
      { id: "2", name: "Ahmed Khan", normalizedPhone: phone("0501234567"), normalizedEmail: "ahmed@example.com" },
    ];
    const pairs = findDuplicateCandidates(candidates);
    expect(pairs).toHaveLength(1);
  });
});
