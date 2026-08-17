/**
 * Single source of truth for the two commercial plans. Both the landing page's pricing
 * section and the signup flow (src/lib/auth/actions.ts) read from here — change a price or
 * limit in one place, not in multiple components. No live FX conversion: UAE and India prices
 * are fixed, independently-set numbers (see product spec), not derived from each other.
 *
 * No payment gateway is wired up yet — signup only captures and stores the chosen plan key.
 */

export type PlanKey = "individual" | "team";
export type Region = "AE" | "IN";

export interface PlanPrice {
  amount: number;
  currency: "AED" | "INR";
}

export interface Plan {
  key: PlanKey;
  name: string;
  tagline: string;
  badge?: string;
  price: Record<Region, PlanPrice>;
  limits: {
    maxUsers: number;
    maxProfiles: number;
  };
  features: string[];
  cta: string;
}

export const PLANS: Plan[] = [
  {
    key: "individual",
    name: "Individual",
    tagline: "For independent agents.",
    price: {
      AE: { amount: 199, currency: "AED" },
      IN: { amount: 1999, currency: "INR" },
    },
    limits: { maxUsers: 1, maxProfiles: 20_000 },
    features: [
      "1 user",
      "20,000 buyer profiles",
      "CSV/XLSX imports with automatic column mapping",
      "AI buyer intelligence",
      "Unlimited projects*",
      "Hot / Warm / Possible matches",
      "Why-they-match explanations",
      "Suggested outreach (call opener + WhatsApp)",
      "Basic reactivation analytics",
    ],
    cta: "Start Individual",
  },
  {
    key: "team",
    name: "Team",
    tagline: "For agencies and small teams.",
    badge: "BEST FOR BROKERAGES",
    price: {
      AE: { amount: 699, currency: "AED" },
      IN: { amount: 6999, currency: "INR" },
    },
    limits: { maxUsers: 5, maxProfiles: 100_000 },
    features: [
      "Up to 5 users",
      "100,000 buyer profiles total",
      "Private lead workspace for every agent",
      "Shared company projects",
      "AI matching for every agent",
      "Team opportunity overview",
      "Owner/Admin controls",
      "Everything in Individual",
    ],
    cta: "Start Team",
  },
];

export function getPlan(key: string | undefined | null): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export function isPlanKey(key: string | undefined | null): key is PlanKey {
  return PLANS.some((p) => p.key === key);
}

export function formatPlanPrice(plan: Plan, region: Region): string {
  const p = plan.price[region];
  return `${p.currency} ${p.amount.toLocaleString("en-US")}`;
}
