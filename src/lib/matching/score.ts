import { areLocationsSimilar } from "@/lib/normalize/location";
import { parseBedroomCounts, bedroomsExactOverlap, bedroomsAdjacent } from "@/lib/normalize/bedrooms";
import { recencyWeightedActivityScore, monthsSince } from "./recency";

export type Purpose = "investment" | "end_use" | "holiday_home" | "unclear";
export type ReadyOffplan = "ready" | "off_plan" | "either";
export type Readiness = "immediate" | "warm" | "cold" | "unknown";

export interface MatchCustomerInput {
  id: string;
  doNotContact: boolean;
  status: string; // "won" / "invalid" / "do_not_contact" trigger exclusion
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  preferredLocations: string[]; // canonical
  preferredDevelopers: string[];
  bedrooms: string[];
  propertyTypes: string[];
  purpose: Purpose;
  paymentPlanPreference: string;
  readyOrOffplanPreference: ReadyOffplan;
  purchaseReadiness: Readiness;
  lostReason: string;
  lastContactedAt: Date | null;
  interactionDates: Date[]; // every touchpoint, for recency + repeated-pattern scoring
  distinctProjectsCount: number;
  // AI-inferred layer (optional — used when available, always additive/refining, never required)
  inferredBudgetMin?: number | null;
  inferredBudgetMax?: number | null;
  inferredLocations?: string[];
  inferredBedrooms?: string[];
  inferredPropertyTypes?: string[];
  inferredPurpose?: Purpose;
  inferredPaymentPreferences?: string[];
  inferredObjections?: string[];
  inferredDeveloperPreferences?: string[];
  inferredPurchaseReadiness?: Readiness;
  // LIVE layer — learned from the outcome loop after a real contact attempt (Budget Changed /
  // Different Location / Not Now). Takes precedence over both stated and AI-inferred when
  // present: it's the freshest, most direct signal we have. See customerLiveSignals in schema.ts.
  liveBudgetMin?: number | null;
  liveBudgetMax?: number | null;
  liveLocations?: string[];
  livePurchaseReadiness?: Readiness;
}

export interface MatchProjectInput {
  id: string;
  developer: string;
  location: string; // canonical
  nearbyAreas: string[];
  bedroomTypes: string[];
  propertyTypes: string[];
  startingPrice: number | null;
  maxPrice: number | null;
  currency: string;
  constructionStatus: "off_plan" | "ready";
  targetBuyerType: "investor" | "end_user" | "both";
  paymentPlanSummary: string;
  downPaymentPercent: number | null;
}

export interface ScoreComponent {
  score: number;
  max: number;
}

export interface MatchScoreResult {
  totalScore: number;
  bucket: "hot" | "warm" | "possible" | "none";
  excluded: boolean;
  excludeReason?: string;
  breakdown: Record<string, ScoreComponent>;
  positives: string[];
  concerns: string[];
}

const WEIGHTS = {
  budget: 25,
  location: 20,
  bedrooms: 15,
  purpose: 10,
  paymentPlan: 10,
  timeline: 10,
  historicalBehaviour: 5,
  objectionResolution: 5,
} as const;

const DEVELOPER_BONUS = 2;

export function scoreMatch(customer: MatchCustomerInput, project: MatchProjectInput, now: Date): MatchScoreResult {
  // --- Hard exclusions -----------------------------------------------------
  if (customer.doNotContact || ["do_not_contact", "invalid", "won", "lost_elsewhere"].includes(customer.status)) {
    return {
      totalScore: 0,
      bucket: "none",
      excluded: true,
      excludeReason:
        customer.status === "won"
          ? "Customer already purchased."
          : customer.status === "lost_elsewhere"
          ? "Customer bought a property elsewhere."
          : customer.doNotContact
          ? "Customer requested no further contact."
          : "Customer marked invalid.",
      breakdown: {},
      positives: [],
      concerns: [],
    };
  }

  // Live (outcome-loop) values win over AI-inferred, which win over stated — freshest signal
  // wins for anything numeric/single-valued. Locations stay a union: a buyer opening up to a new
  // area doesn't necessarily rule out the old one.
  const effBudgetMin = customer.liveBudgetMin ?? customer.inferredBudgetMin ?? customer.budgetMin;
  const effBudgetMax = customer.liveBudgetMax ?? customer.inferredBudgetMax ?? customer.budgetMax;
  const effLocations = uniq([
    ...(customer.preferredLocations ?? []),
    ...(customer.inferredLocations ?? []),
    ...(customer.liveLocations ?? []),
  ]);
  const effBedroomLabels = uniq([...(customer.bedrooms ?? []), ...(customer.inferredBedrooms ?? [])]);
  const effPropertyTypes = uniq([...(customer.propertyTypes ?? []), ...(customer.inferredPropertyTypes ?? [])]);
  const effPurpose = customer.inferredPurpose ?? customer.purpose;
  const effReadiness = customer.livePurchaseReadiness ?? customer.inferredPurchaseReadiness ?? customer.purchaseReadiness;
  const effPaymentSignals = uniq([
    customer.paymentPlanPreference,
    ...(customer.inferredPaymentPreferences ?? []),
  ]).filter(Boolean);
  const effDevelopers = uniq([...(customer.preferredDevelopers ?? []), ...(customer.inferredDeveloperPreferences ?? [])]);
  const effObjections = uniq([customer.lostReason, ...(customer.inferredObjections ?? [])]).filter(Boolean);

  const budget = scoreBudget(effBudgetMin, effBudgetMax, project.startingPrice, project.maxPrice);
  const location = scoreLocation(effLocations, project.location, project.nearbyAreas);
  const bedrooms = scoreBedrooms(effBedroomLabels, project.bedroomTypes);
  const purpose = scorePurpose(effPurpose, project.targetBuyerType);
  const paymentPlan = scorePaymentPlan(effPaymentSignals, project.downPaymentPercent, project.paymentPlanSummary);
  const timeline = scoreTimeline(effReadiness, customer.lastContactedAt, now);
  const historicalBehaviour = scoreHistoricalBehaviour(customer.interactionDates, customer.distinctProjectsCount, now);
  const objectionResolution = scoreObjectionResolution(effObjections, project, effBudgetMax);

  const breakdown: Record<string, ScoreComponent> = {
    budget,
    location,
    bedrooms,
    purpose,
    paymentPlan,
    timeline,
    historicalBehaviour,
    objectionResolution,
  };

  let rawTotal = Object.values(breakdown).reduce((sum, c) => sum + c.score, 0);

  // Soft developer-preference bonus (spec: "use as a soft signal unless explicitly strict").
  let developerBonus = 0;
  if (project.developer && effDevelopers.some((d) => d.toLowerCase() === project.developer.toLowerCase())) {
    developerBonus = DEVELOPER_BONUS;
  }
  rawTotal += developerBonus;

  // --- Negative signals (spec section 31) — heavily discount, don't just subtract points ---
  const { multiplier, concerns: negativeConcerns } = applyNegativeSignals(customer, effBedroomLabels, effPropertyTypes, effBudgetMax, project);
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal * multiplier)));

  const positives = buildPositives(breakdown, developerBonus, project);
  const concerns = [...negativeConcerns, ...buildRecencyConcerns(customer.lastContactedAt, now)];

  return {
    totalScore,
    bucket: bucketFor(totalScore),
    excluded: false,
    breakdown,
    positives,
    concerns,
  };
}

export function bucketFor(score: number): MatchScoreResult["bucket"] {
  if (score >= 80) return "hot";
  if (score >= 55) return "warm";
  if (score >= 35) return "possible";
  return "none";
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

// ---------------------------------------------------------------------------
// Component scorers
// ---------------------------------------------------------------------------

function scoreBudget(
  custMin: number | null,
  custMax: number | null,
  projMin: number | null,
  projMax: number | null
): ScoreComponent {
  const max = WEIGHTS.budget;
  if (custMin === null && custMax === null) return { score: Math.round(max * 0.35), max };
  if (projMin === null && projMax === null) return { score: Math.round(max * 0.35), max };

  const cMin = custMin ?? custMax!;
  const cMax = custMax ?? custMin!;
  const pMin = projMin ?? projMax!;
  const pMax = projMax ?? projMin!;

  const overlapLow = Math.max(cMin, pMin);
  const overlapHigh = Math.min(cMax, pMax);

  if (overlapHigh >= overlapLow) {
    const custWidth = Math.max(cMax - cMin, 1);
    const overlapWidth = overlapHigh - overlapLow;
    const ratio = Math.min(1, overlapWidth / custWidth || 1);
    return { score: Math.round(max * (0.75 + 0.25 * ratio)), max };
  }

  if (pMin > cMax) {
    // Project is pricier than the customer's stated ceiling — allow a stretch tolerance.
    const gap = pMin - cMax;
    const tolerance = cMax * 0.15;
    if (gap <= tolerance) {
      return { score: Math.round(max * (0.55 * (1 - gap / tolerance) + 0.15)), max };
    }
    return { score: 0, max };
  }

  // Customer's minimum is above the project's max — cheaper than they want, but not disqualifying.
  return { score: Math.round(max * 0.45), max };
}

function scoreLocation(customerLocations: string[], projectLocation: string, nearbyAreas: string[]): ScoreComponent {
  const max = WEIGHTS.location;
  if (customerLocations.length === 0) return { score: Math.round(max * 0.4), max };
  if (customerLocations.includes(projectLocation)) return { score: max, max };
  if (nearbyAreas.some((a) => customerLocations.includes(a))) return { score: Math.round(max * 0.8), max };
  if (customerLocations.some((loc) => areLocationsSimilar(loc, projectLocation))) {
    return { score: Math.round(max * 0.7), max };
  }
  return { score: Math.round(max * 0.15), max };
}

function scoreBedrooms(customerLabels: string[], projectLabels: string[]): ScoreComponent {
  const max = WEIGHTS.bedrooms;
  const cCounts = parseBedroomCounts(customerLabels);
  const pCounts = parseBedroomCounts(projectLabels);
  if (cCounts.length === 0 || pCounts.length === 0) return { score: Math.round(max * 0.4), max };
  if (bedroomsExactOverlap(cCounts, pCounts)) return { score: max, max };
  if (bedroomsAdjacent(cCounts, pCounts)) return { score: Math.round(max * 0.6), max };
  return { score: Math.round(max * 0.1), max };
}

function scorePurpose(customerPurpose: Purpose, targetBuyerType: MatchProjectInput["targetBuyerType"]): ScoreComponent {
  const max = WEIGHTS.purpose;
  if (customerPurpose === "unclear") return { score: Math.round(max * 0.5), max };
  if (targetBuyerType === "both") return { score: Math.round(max * 0.85), max };
  if (targetBuyerType === "investor" && customerPurpose === "investment") return { score: max, max };
  if (targetBuyerType === "end_user" && (customerPurpose === "end_use" || customerPurpose === "holiday_home")) {
    return { score: max, max };
  }
  return { score: Math.round(max * 0.3), max };
}

function scorePaymentPlan(
  customerSignals: string[],
  downPaymentPercent: number | null,
  paymentPlanSummary: string
): ScoreComponent {
  const max = WEIGHTS.paymentPlan;
  const text = customerSignals.join(" ").toLowerCase();
  const wantsLowUpfront = /\b(low upfront|flexible|low down ?payment|post.?handover|small down ?payment)\b/.test(text);
  const wantsCash = /\bcash\b/.test(text);
  if (!wantsLowUpfront && !wantsCash) return { score: Math.round(max * 0.55), max };

  const projectIsFlexible =
    (downPaymentPercent !== null && downPaymentPercent <= 20) ||
    /\b(post.?handover|flexible|low down ?payment)\b/i.test(paymentPlanSummary);

  if (wantsLowUpfront && projectIsFlexible) return { score: max, max };
  if (wantsLowUpfront && !projectIsFlexible) return { score: Math.round(max * 0.2), max };
  return { score: Math.round(max * 0.6), max };
}

function scoreTimeline(readiness: Readiness, lastContactedAt: Date | null, now: Date): ScoreComponent {
  const max = WEIGHTS.timeline;
  const base = { immediate: 1, warm: 0.7, unknown: 0.5, cold: 0.2 }[readiness];
  const months = monthsSince(lastContactedAt, now);
  // Stale contact — don't assume the original timeline still holds (spec section 6/30).
  const staleness = months === Infinity ? 0.6 : months > 18 ? 0.6 : months > 8 ? 0.85 : 1;
  return { score: Math.round(max * Math.min(1, base * staleness)), max };
}

function scoreHistoricalBehaviour(interactionDates: Date[], distinctProjectsCount: number, now: Date): ScoreComponent {
  const max = WEIGHTS.historicalBehaviour;
  const activity = recencyWeightedActivityScore(interactionDates, now); // 0-1
  const repeatBonus = distinctProjectsCount >= 3 ? 0.25 : distinctProjectsCount === 2 ? 0.1 : 0;
  return { score: Math.round(max * Math.min(1, activity + repeatBonus)), max };
}

function scoreObjectionResolution(
  objections: string[],
  project: MatchProjectInput,
  customerMax: number | null
): ScoreComponent {
  const max = WEIGHTS.objectionResolution;
  if (objections.length === 0) return { score: 0, max };
  const text = objections.join(" ").toLowerCase();
  let resolved = 0;

  if (/\b(expensive|price|too high|budget)\b/.test(text) && project.startingPrice && customerMax) {
    if (project.startingPrice <= customerMax * 1.05) resolved += 1;
  }
  if (/\b(payment plan|upfront|down ?payment)\b/.test(text)) {
    const flexible =
      (project.downPaymentPercent !== null && project.downPaymentPercent <= 20) ||
      /\b(post.?handover|flexible)\b/i.test(project.paymentPlanSummary);
    if (flexible) resolved += 1;
  }
  if (/\b(location|far|distance)\b/.test(text)) resolved += 0.5;

  if (resolved <= 0) return { score: 0, max };
  return { score: Math.min(max, Math.round(resolved * max)), max };
}

function applyNegativeSignals(
  customer: MatchCustomerInput,
  effBedroomLabels: string[],
  effPropertyTypes: string[],
  effMax: number | null,
  project: MatchProjectInput
): { multiplier: number; concerns: string[] } {
  let multiplier = 1;
  const concerns: string[] = [];

  const readyPref = customer.readyOrOffplanPreference;
  if (readyPref === "ready" && project.constructionStatus === "off_plan") {
    multiplier *= 0.35;
    concerns.push("Customer previously wanted ready property only; this project is off-plan.");
  } else if (readyPref === "off_plan" && project.constructionStatus === "ready") {
    multiplier *= 0.35;
    concerns.push("Customer previously wanted off-plan only; this project is ready.");
  }

  if (effMax && project.startingPrice && effMax < project.startingPrice * 0.6) {
    multiplier *= 0.3;
    concerns.push("Customer's budget appears well below this project's starting price.");
  }

  const cCounts = parseBedroomCounts(effBedroomLabels);
  const pCounts = parseBedroomCounts(project.bedroomTypes);
  if (cCounts.length > 0 && pCounts.length > 0 && !bedroomsExactOverlap(cCounts, pCounts) && !bedroomsAdjacent(cCounts, pCounts)) {
    multiplier *= 0.55;
    concerns.push("No overlap between the customer's preferred bedroom count and units available here.");
  }

  if (
    effPropertyTypes.length > 0 &&
    project.propertyTypes.length > 0 &&
    !effPropertyTypes.some((t) => project.propertyTypes.some((pt) => pt.toLowerCase() === t.toLowerCase()))
  ) {
    multiplier *= 0.5;
    concerns.push("Customer's preferred property type doesn't match what this project offers.");
  }

  return { multiplier, concerns };
}

function buildPositives(
  breakdown: Record<string, ScoreComponent>,
  developerBonus: number,
  project: MatchProjectInput
): string[] {
  const out: string[] = [];
  if (breakdown.budget.score / breakdown.budget.max >= 0.75) out.push("Budget lines up well with this project's pricing.");
  if (breakdown.location.score / breakdown.location.max >= 0.75) out.push(`Strong location fit with ${project.location}.`);
  else if (breakdown.location.score / breakdown.location.max >= 0.6) out.push(`Previously interested in a comparable community to ${project.location}.`);
  if (breakdown.bedrooms.score / breakdown.bedrooms.max >= 0.9) out.push("Preferred unit size is available in this project.");
  if (breakdown.purpose.score / breakdown.purpose.max >= 0.9) out.push("Investment/end-use intent matches this project's positioning.");
  if (breakdown.paymentPlan.score / breakdown.paymentPlan.max >= 0.9) out.push("Payment plan matches their stated preference.");
  if (breakdown.timeline.score / breakdown.timeline.max >= 0.8) out.push("Purchase timeline looks current and active.");
  if (breakdown.historicalBehaviour.score / breakdown.historicalBehaviour.max >= 0.7) out.push("Consistent history of similar enquiries over time.");
  if (breakdown.objectionResolution.score > 0) out.push("This project resolves a previous objection they raised.");
  if (developerBonus > 0) out.push(`Has previously shown interest in ${project.developer}.`);
  return out;
}

function buildRecencyConcerns(lastContactedAt: Date | null, now: Date): string[] {
  const months = monthsSince(lastContactedAt, now);
  if (months === Infinity) return ["No recorded contact date on file."];
  if (months > 12) return [`Last contact was over ${Math.floor(months)} months ago — timeline should be reconfirmed.`];
  return [];
}
