import { describe, it, expect } from "vitest";
import { scoreMatch, bucketFor, type MatchCustomerInput, type MatchProjectInput } from "@/lib/matching/score";

const NOW = new Date("2026-08-17T00:00:00Z");

function baseCustomer(overrides: Partial<MatchCustomerInput> = {}): MatchCustomerInput {
  return {
    id: "cust_1",
    doNotContact: false,
    status: "new",
    budgetMin: null,
    budgetMax: null,
    budgetCurrency: "AED",
    preferredLocations: [],
    preferredDevelopers: [],
    bedrooms: [],
    propertyTypes: [],
    purpose: "unclear",
    paymentPlanPreference: "",
    readyOrOffplanPreference: "either",
    purchaseReadiness: "unknown",
    lostReason: "",
    lastContactedAt: null,
    interactionDates: [],
    distinctProjectsCount: 0,
    ...overrides,
  };
}

function baseProject(overrides: Partial<MatchProjectInput> = {}): MatchProjectInput {
  return {
    id: "proj_1",
    developer: "XYZ Developer",
    location: "Dubai South",
    nearbyAreas: ["Arjan"],
    bedroomTypes: ["Studio", "1BR", "2BR"],
    propertyTypes: ["Apartment"],
    startingPrice: 750_000,
    maxPrice: 1_500_000,
    currency: "AED",
    constructionStatus: "off_plan",
    targetBuyerType: "investor",
    paymentPlanSummary: "20/50/30",
    downPaymentPercent: 20,
    ...overrides,
  };
}

describe("scoreMatch — hard exclusions", () => {
  it("excludes customers marked do not contact", () => {
    const result = scoreMatch(baseCustomer({ doNotContact: true }), baseProject(), NOW);
    expect(result.excluded).toBe(true);
    expect(result.bucket).toBe("none");
  });

  it("excludes customers who already purchased", () => {
    const result = scoreMatch(baseCustomer({ status: "won" }), baseProject(), NOW);
    expect(result.excluded).toBe(true);
  });
});

describe("scoreMatch — the spec's Rahul-style scenario", () => {
  it("still scores well on a different-but-similar community when underlying intent matches", () => {
    // Customer previously considered Sobha Hartland (premium, investment, 1BR, ~1.3M).
    // New project is in Dubai Hills — a different community, but similar profile.
    const customer = baseCustomer({
      budgetMin: 1_100_000,
      budgetMax: 1_300_000,
      preferredLocations: ["Sobha Hartland"],
      bedrooms: ["1BR"],
      purpose: "investment",
      purchaseReadiness: "warm",
      lastContactedAt: new Date("2026-06-01"),
      interactionDates: [new Date("2026-01-01"), new Date("2026-06-01")],
      distinctProjectsCount: 2,
    });
    const project = baseProject({
      location: "Dubai Hills Estate",
      nearbyAreas: [],
      bedroomTypes: ["1BR", "2BR"],
      startingPrice: 1_150_000,
      maxPrice: 1_400_000,
      targetBuyerType: "investor",
    });
    const result = scoreMatch(customer, project, NOW);
    expect(result.bucket === "hot" || result.bucket === "warm").toBe(true);
    expect(result.breakdown.location.score).toBeGreaterThan(0.5 * result.breakdown.location.max);
  });
});

describe("scoreMatch — objection resolution", () => {
  it("rewards a project that resolves a previous price objection", () => {
    const customer = baseCustomer({
      budgetMin: 800_000,
      budgetMax: 950_000,
      lostReason: "Too expensive",
    });
    const project = baseProject({ startingPrice: 900_000, maxPrice: 950_000 });
    const result = scoreMatch(customer, project, NOW);
    expect(result.breakdown.objectionResolution.score).toBeGreaterThan(0);
    expect(result.positives).toContain("This project resolves a previous objection they raised.");
  });

  it("rewards a project that resolves a previous payment-plan objection", () => {
    const customer = baseCustomer({ lostReason: "Payment plan not good" });
    const project = baseProject({ downPaymentPercent: 10, paymentPlanSummary: "10/70 flexible" });
    const result = scoreMatch(customer, project, NOW);
    expect(result.breakdown.objectionResolution.score).toBeGreaterThan(0);
  });
});

describe("scoreMatch — negative signals", () => {
  it("heavily discounts a ready-only customer matched against an off-plan project", () => {
    const withReadyOnly = scoreMatch(
      baseCustomer({ readyOrOffplanPreference: "ready", budgetMin: 800_000, budgetMax: 1_600_000, preferredLocations: ["Dubai South"] }),
      baseProject({ constructionStatus: "off_plan" }),
      NOW
    );
    const withoutPreference = scoreMatch(
      baseCustomer({ readyOrOffplanPreference: "either", budgetMin: 800_000, budgetMax: 1_600_000, preferredLocations: ["Dubai South"] }),
      baseProject({ constructionStatus: "off_plan" }),
      NOW
    );
    expect(withReadyOnly.totalScore).toBeLessThan(withoutPreference.totalScore);
  });

  it("heavily discounts a customer whose budget is far below the project's starting price", () => {
    const result = scoreMatch(baseCustomer({ budgetMin: 200_000, budgetMax: 300_000 }), baseProject({ startingPrice: 900_000 }), NOW);
    expect(result.totalScore).toBeLessThan(30);
  });
});

describe("scoreMatch — recency", () => {
  it("scores a recently-active customer higher than an identical but stale one", () => {
    const shared = { budgetMin: 800_000, budgetMax: 1_000_000, purchaseReadiness: "warm" as const, preferredLocations: ["Dubai South"] };
    const recent = scoreMatch(
      baseCustomer({ ...shared, lastContactedAt: new Date("2026-08-01") }),
      baseProject(),
      NOW
    );
    const stale = scoreMatch(
      baseCustomer({ ...shared, lastContactedAt: new Date("2023-01-01") }),
      baseProject(),
      NOW
    );
    expect(recent.breakdown.timeline.score).toBeGreaterThanOrEqual(stale.breakdown.timeline.score);
  });
});

describe("scoreMatch — never returns out-of-range totals", () => {
  it("clamps between 0 and 100", () => {
    const result = scoreMatch(
      baseCustomer({ budgetMin: 900_000, budgetMax: 1_000_000, preferredLocations: ["Dubai South"], bedrooms: ["1BR"], purpose: "investment", purchaseReadiness: "immediate", preferredDevelopers: ["XYZ Developer"] }),
      baseProject(),
      NOW
    );
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });
});

describe("bucketFor", () => {
  it("buckets scores per the spec's thresholds", () => {
    expect(bucketFor(90)).toBe("hot");
    expect(bucketFor(80)).toBe("hot");
    expect(bucketFor(70)).toBe("warm");
    expect(bucketFor(45)).toBe("possible");
    expect(bucketFor(20)).toBe("none");
  });
});
