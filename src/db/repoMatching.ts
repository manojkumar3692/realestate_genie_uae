import { eq, and, inArray, desc, sql as rawSql, ne } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { newId } from "@/lib/id";
import { scoreMatch, type MatchCustomerInput, type MatchProjectInput } from "@/lib/matching/score";
import { generateMatchExplanations, type MatchExplanationInput } from "@/lib/ai/generateMatchExplanation";
import { generateOutreachMessages, templateOutreach, type OutreachInput } from "@/lib/ai/generateOutreach";
import { extractBuyerProfiles, type BuyerProfileInput } from "@/lib/ai/extractBuyerProfile";
import { interpretOutcomeFollowup, type FollowupOutcome } from "@/lib/ai/interpretOutcomeFollowup";
import { formatMoney } from "@/lib/normalize/budget";
import { logAudit } from "@/lib/audit";

const AI_EXPLANATION_TOP_N = 120;

// ---------------------------------------------------------------------------
// Running the matching engine for a project
// ---------------------------------------------------------------------------

export interface RunMatchingSummary {
  analyzed: number;
  hot: number;
  warm: number;
  possible: number;
  potentialBuyerValue: number;
  currency: string;
}

export async function runMatchingForProject(projectId: string, orgId: string, actorUserId?: string): Promise<RunMatchingSummary> {
  const project = await db.query.projects.findFirst({ where: and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)) });
  if (!project) throw new Error("Project not found");
  const unitTypes = await db.query.projectUnitTypes.findMany({ where: eq(schema.projectUnitTypes.projectId, projectId) });

  const projectInput: MatchProjectInput = {
    id: project.id,
    developer: project.developer,
    location: project.location,
    nearbyAreas: project.nearbyAreas,
    bedroomTypes: unitTypes.length ? unitTypes.map((u) => u.typeLabel) : project.bedroomTypes,
    propertyTypes: project.propertyTypes,
    startingPrice: project.startingPrice,
    maxPrice: project.maxPrice,
    currency: project.currency,
    constructionStatus: project.constructionStatus,
    targetBuyerType: project.targetBuyerType,
    paymentPlanSummary: project.paymentPlanSummary,
    downPaymentPercent: project.downPaymentPercent,
  };

  const customers = await db.query.customers.findMany({
    where: and(eq(schema.customers.orgId, orgId), ne(schema.customers.status, "won")),
  });
  const eligible = customers.filter((c) => !c.doNotContact && c.status !== "invalid" && c.status !== "do_not_contact" && c.status !== "lost_elsewhere");
  const customerIds = eligible.map((c) => c.id);

  const [allPrefs, allInferences, allInteractions, allLiveSignals] = await Promise.all([
    db.query.customerPreferences.findMany({ where: inArray(schema.customerPreferences.customerId, customerIds) }),
    db.query.customerInferences.findMany({ where: inArray(schema.customerInferences.customerId, customerIds) }),
    db.query.customerInteractions.findMany({ where: inArray(schema.customerInteractions.customerId, customerIds) }),
    db.query.customerLiveSignals.findMany({ where: inArray(schema.customerLiveSignals.customerId, customerIds) }),
  ]);
  const prefsByCustomer = new Map(allPrefs.map((p) => [p.customerId, p]));
  const inferByCustomer = new Map(allInferences.map((p) => [p.customerId, p]));
  const interactionsByCustomer = new Map<string, Date[]>();
  const distinctProjectsByCustomer = new Map<string, Set<string>>();
  for (const i of allInteractions) {
    if (!interactionsByCustomer.has(i.customerId)) interactionsByCustomer.set(i.customerId, []);
    interactionsByCustomer.get(i.customerId)!.push(i.occurredAt);
    if (i.projectMentioned) {
      if (!distinctProjectsByCustomer.has(i.customerId)) distinctProjectsByCustomer.set(i.customerId, new Set());
      distinctProjectsByCustomer.get(i.customerId)!.add(i.projectMentioned.toLowerCase());
    }
  }
  const liveSignalsByCustomer = new Map<string, (typeof schema.customerLiveSignals.$inferSelect)[]>();
  for (const s of allLiveSignals) {
    if (!liveSignalsByCustomer.has(s.customerId)) liveSignalsByCustomer.set(s.customerId, []);
    liveSignalsByCustomer.get(s.customerId)!.push(s);
  }

  const now = new Date();
  const results: Array<{ customer: (typeof eligible)[number]; result: ReturnType<typeof scoreMatch> }> = [];

  for (const c of eligible) {
    const input = buildMatchCustomerInput(
      c,
      prefsByCustomer.get(c.id),
      inferByCustomer.get(c.id),
      interactionsByCustomer.get(c.id) ?? [],
      distinctProjectsByCustomer.get(c.id)?.size ?? 0,
      liveSignalsByCustomer.get(c.id) ?? []
    );
    const result = scoreMatch(input, projectInput, now);
    if (!result.excluded && result.bucket !== "none") {
      results.push({ customer: c, result });
    }
  }

  results.sort((a, b) => b.result.totalScore - a.result.totalScore);
  console.log(`  [match] "${project.name}": ${results.length} deterministic matches from ${eligible.length} eligible customers`);

  // AI explanation pass on the strongest candidates only — keeps AI cost bounded.
  const topForAi = results.slice(0, AI_EXPLANATION_TOP_N);
  const explanationInputs: MatchExplanationInput[] = topForAi.map(({ customer, result }) => ({
    customerId: customer.id,
    customerSummary: buildCustomerSummary(customer, prefsByCustomer.get(customer.id), inferByCustomer.get(customer.id)),
    projectSummary: buildProjectSummary(project, unitTypes.map((u) => u.typeLabel)),
    deterministicScore: result.totalScore,
  }));
  const aiExplanations = await generateMatchExplanations(explanationInputs);

  // Build every row to write in memory first — no DB round trips in this loop. Writing one match
  // plus its reasons at a time (two awaited inserts each, sequentially, for every customer) was
  // the actual cause of "the analyze button just hangs": for ~370 matches that's 700+ round trips
  // to a database on the other side of the world, one after another, with nothing printed to
  // explain the wait. Two batched multi-row inserts at the end does the same work in 2 round trips.
  let hot = 0,
    warm = 0,
    possible = 0,
    potentialBuyerValue = 0;
  const matchRows: (typeof schema.projectMatches.$inferInsert)[] = [];
  const reasonRows: (typeof schema.matchReasons.$inferInsert)[] = [];

  for (const { customer, result } of results) {
    const ai = aiExplanations.get(customer.id);
    const adjustedScore = ai ? Math.max(0, Math.min(100, result.totalScore + ai.scoreAdjustment)) : result.totalScore;
    const bucket = bucketForScore(adjustedScore);
    if (bucket === "none") continue;

    const matchId = newId("match");
    const positivesList = cleanReasonList(ai?.positives?.length ? ai.positives : result.positives);
    const concernsList = cleanReasonList(ai?.concerns?.length ? ai.concerns : result.concerns);
    matchRows.push({
      id: matchId,
      projectId,
      customerId: customer.id,
      totalScore: adjustedScore,
      bucket,
      scoreBreakdownJson: result.breakdown,
      concernsJson: concernsList,
      explanationSource: ai ? "ai" : "template",
    });

    reasonRows.push(
      ...positivesList.map((text, i) => ({
        id: newId("reason"),
        matchId,
        type: "positive" as const,
        text,
        weight: 1,
        sortOrder: i,
      })),
      ...concernsList.map((text, i) => ({
        id: newId("reason"),
        matchId,
        type: "concern" as const,
        text,
        weight: 1,
        sortOrder: i,
      }))
    );

    if (bucket === "hot") hot++;
    else if (bucket === "warm") warm++;
    else possible++;
    if (bucket === "hot" || bucket === "warm") {
      const prefs = prefsByCustomer.get(customer.id);
      const inference = inferByCustomer.get(customer.id);
      potentialBuyerValue += inference?.inferredBudgetMax ?? prefs?.budgetMax ?? project.startingPrice ?? 0;
    }
  }

  console.log(`  [match] writing ${matchRows.length} matches + ${reasonRows.length} reasons…`);
  // Persist: clear old matches for this project, then insert fresh in batches (a single INSERT
  // with thousands of rows can itself be slow/hit payload limits — 200 rows per statement keeps
  // each round trip small while still cutting a 370-row write from ~370 round trips to ~2).
  await db.delete(schema.projectMatches).where(eq(schema.projectMatches.projectId, projectId));
  const CHUNK = 200;
  for (let i = 0; i < matchRows.length; i += CHUNK) {
    await db.insert(schema.projectMatches).values(matchRows.slice(i, i + CHUNK));
  }
  for (let i = 0; i < reasonRows.length; i += CHUNK) {
    await db.insert(schema.matchReasons).values(reasonRows.slice(i, i + CHUNK));
  }
  console.log(`  [match] done writing`);

  await logAudit({
    orgId,
    userId: actorUserId ?? null,
    action: "project.matched",
    entityType: "project",
    entityId: projectId,
    metadata: { analyzed: eligible.length, hot, warm, possible },
  });

  return { analyzed: eligible.length, hot, warm, possible, potentialBuyerValue, currency: project.currency };
}

// ---------------------------------------------------------------------------
// Shared customer -> MatchCustomerInput builder — used both by the full per-project batch
// run above and by the single-customer outcome-loop rescore below, so the two code paths can
// never drift on how the stated/inferred/live layers get merged into what scoreMatch() sees.
// ---------------------------------------------------------------------------

/** Reduces a customer's live-signal history down to the values scoreMatch() actually wants:
 *  latest wins for budget and readiness (a point-in-time state), but every location an agent has
 *  ever reported is kept — an extra candidate location only broadens recall, it never hurts. */
function reduceLiveSignals(signals: (typeof schema.customerLiveSignals.$inferSelect)[]): {
  liveBudgetMin: number | null | undefined;
  liveBudgetMax: number | null | undefined;
  liveLocations: string[];
  livePurchaseReadiness: MatchCustomerInput["purchaseReadiness"] | undefined;
} {
  const sorted = [...signals].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let liveBudgetMin: number | null | undefined;
  let liveBudgetMax: number | null | undefined;
  let livePurchaseReadiness: MatchCustomerInput["purchaseReadiness"] | undefined;
  const liveLocations: string[] = [];

  for (const s of sorted) {
    const v = s.structuredValueJson as Record<string, unknown>;
    if (s.field === "budget") {
      if (typeof v.min === "number" || v.min === null) liveBudgetMin = v.min as number | null;
      if (typeof v.max === "number" || v.max === null) liveBudgetMax = v.max as number | null;
    } else if (s.field === "location" && Array.isArray(v.locations)) {
      for (const loc of v.locations) if (typeof loc === "string" && loc && !liveLocations.includes(loc)) liveLocations.push(loc);
    } else if (s.field === "readiness" && typeof v.readiness === "string") {
      livePurchaseReadiness = v.readiness as MatchCustomerInput["purchaseReadiness"];
    }
  }

  return { liveBudgetMin, liveBudgetMax, liveLocations, livePurchaseReadiness };
}

function buildMatchCustomerInput(
  customer: typeof schema.customers.$inferSelect,
  prefs: typeof schema.customerPreferences.$inferSelect | undefined,
  inference: typeof schema.customerInferences.$inferSelect | undefined,
  interactionDates: Date[],
  distinctProjectsCount: number,
  liveSignals: (typeof schema.customerLiveSignals.$inferSelect)[]
): MatchCustomerInput {
  const live = reduceLiveSignals(liveSignals);
  return {
    id: customer.id,
    doNotContact: customer.doNotContact,
    status: customer.status,
    budgetMin: prefs?.budgetMin ?? null,
    budgetMax: prefs?.budgetMax ?? null,
    budgetCurrency: prefs?.budgetCurrency ?? "AED",
    preferredLocations: prefs?.preferredLocations ?? [],
    preferredDevelopers: prefs?.preferredDevelopers ?? [],
    bedrooms: prefs?.bedrooms ?? [],
    propertyTypes: prefs?.propertyTypes ?? [],
    purpose: (prefs?.purpose as MatchCustomerInput["purpose"]) ?? "unclear",
    paymentPlanPreference: prefs?.paymentPlanPreference ?? "",
    readyOrOffplanPreference: (prefs?.readyOrOffplanPreference as MatchCustomerInput["readyOrOffplanPreference"]) ?? "either",
    purchaseReadiness: (prefs?.purchaseReadiness as MatchCustomerInput["purchaseReadiness"]) ?? "unknown",
    lostReason: prefs?.lostReason ?? "",
    lastContactedAt: prefs?.lastContactedAt ?? null,
    interactionDates,
    distinctProjectsCount,
    inferredBudgetMin: inference?.inferredBudgetMin ?? undefined,
    inferredBudgetMax: inference?.inferredBudgetMax ?? undefined,
    inferredLocations: inference?.inferredLocations ?? undefined,
    inferredBedrooms: inference?.inferredBedrooms ?? undefined,
    inferredPropertyTypes: inference?.inferredPropertyTypes ?? undefined,
    inferredPurpose: (inference?.inferredPurpose as MatchCustomerInput["purpose"]) ?? undefined,
    inferredPaymentPreferences: inference?.inferredPaymentPreferences ?? undefined,
    inferredObjections: inference?.inferredObjections ?? undefined,
    inferredDeveloperPreferences: inference?.inferredDeveloperPreferences ?? undefined,
    inferredPurchaseReadiness: (inference?.inferredPurchaseReadiness as MatchCustomerInput["purchaseReadiness"]) ?? undefined,
    liveBudgetMin: live.liveBudgetMin,
    liveBudgetMax: live.liveBudgetMax,
    liveLocations: live.liveLocations,
    livePurchaseReadiness: live.livePurchaseReadiness,
  };
}

/** Same MatchProjectInput shape runMatchingForProject and rescoreCustomerAcrossActiveProjects
 *  each built inline — extracted so the new single-project lookup in ensureMatchRow (below)
 *  doesn't become a third copy that can drift from the other two. */
function buildMatchProjectInput(project: typeof schema.projects.$inferSelect, unitTypeLabels: string[]): MatchProjectInput {
  return {
    id: project.id,
    developer: project.developer,
    location: project.location,
    nearbyAreas: project.nearbyAreas,
    bedroomTypes: unitTypeLabels.length ? unitTypeLabels : project.bedroomTypes,
    propertyTypes: project.propertyTypes,
    startingPrice: project.startingPrice,
    maxPrice: project.maxPrice,
    currency: project.currency,
    constructionStatus: project.constructionStatus,
    targetBuyerType: project.targetBuyerType,
    paymentPlanSummary: project.paymentPlanSummary,
    downPaymentPercent: project.downPaymentPercent,
  };
}

function bucketForScore(score: number): "hot" | "warm" | "possible" | "none" {
  if (score >= 80) return "hot";
  if (score >= 55) return "warm";
  if (score >= 35) return "possible";
  return "none";
}

function buildCustomerSummary(
  customer: typeof schema.customers.$inferSelect,
  prefs: typeof schema.customerPreferences.$inferSelect | undefined,
  inference: typeof schema.customerInferences.$inferSelect | undefined
): string {
  const budgetMin = inference?.inferredBudgetMin ?? prefs?.budgetMin;
  const budgetMax = inference?.inferredBudgetMax ?? prefs?.budgetMax;
  const locations = inference?.inferredLocations?.length ? inference.inferredLocations : prefs?.preferredLocations ?? [];
  const bedrooms = inference?.inferredBedrooms?.length ? inference.inferredBedrooms : prefs?.bedrooms ?? [];
  const purpose = inference?.inferredPurpose ?? prefs?.purpose ?? "unclear";
  const objection = prefs?.lostReason || inference?.inferredObjections?.[0] || "";
  const timeline = inference?.inferredTimeline || prefs?.purchaseTimeline || "";
  return `${customer.name || "Unnamed lead"}: budget ${formatMoney(budgetMin, prefs?.budgetCurrency)}-${formatMoney(
    budgetMax,
    prefs?.budgetCurrency
  )}, locations [${locations.join(", ")}], bedrooms [${bedrooms.join(", ")}], purpose ${purpose}, timeline "${timeline}", previous objection "${objection}", last contacted ${
    prefs?.lastContactedAt?.toISOString().slice(0, 10) ?? "unknown"
  }.`;
}

function buildProjectSummary(project: typeof schema.projects.$inferSelect, bedroomLabels: string[]): string {
  return `${project.name} by ${project.developer} in ${project.location}, ${project.propertyTypes.join("/")} (${bedroomLabels.join(
    ", "
  )}), starting ${formatMoney(project.startingPrice, project.currency)}, payment plan "${project.paymentPlanSummary}", ${
    project.constructionStatus
  }, target buyer ${project.targetBuyerType}.`;
}

// ---------------------------------------------------------------------------
// Reading match results
// ---------------------------------------------------------------------------

export interface MatchResultRow {
  matchId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalScore: number;
  bucket: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  /** True when the budget shown is the AI-inferred value (from notes), not the stated/imported one —
   *  the scoring engine prefers the inferred budget when available (see scoreMatch in score.ts), so
   *  the card must say so explicitly. Otherwise a customer whose imported budget field is stale or
   *  wrong (e.g. a bad CRM value) shows a high budget-fit score next to a number that looks like it
   *  contradicts it, which reads as a bug in a demo even though the score itself is correct. */
  budgetIsInferred: boolean;
  preferredLocations: string[];
  bedrooms: string[];
  purpose: string;
  lostReason: string;
  lastContactedAt: Date | null;
  latestSeenAt: Date;
  outcomeStatus: string;
  scoreBreakdown: Record<string, { score: number; max: number }>;
  positives: string[];
  concerns: string[];
  /** How many of the 5 core signals (budget, location, bedrooms, purpose, purchase readiness) are
   *  actually known — stated or AI-inferred, doesn't matter which. This is deliberately separate
   *  from the fit score: a mostly-blank profile and a genuinely-modest-fit profile can land on the
   *  same score (both hit the "missing data" neutral defaults), but they mean very different things
   *  to an agent deciding who to call first. */
  knownSignalCount: number;
  /** True when knownSignalCount is 0 or 1 — i.e. this score is close to a pure neutral-default
   *  guess rather than a real evaluation. Surfaced in the UI so a thin profile is never confused
   *  for a confirmed, evidence-based match. */
  hasLimitedData: boolean;
}

/** Drops blank/whitespace-only entries. An AI-generated positives/concerns array can occasionally
 *  contain an empty string for a bullet it decided not to fill in — that must never reach the
 *  database or the UI as a reason with nothing after the checkmark. */
function cleanReasonList(list: string[] | undefined | null): string[] {
  return (list ?? []).map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
}

/** Counts how many of the 5 core matching signals we actually have data for (stated or inferred),
 *  independent of whether that data happens to fit the project. Used purely to flag "we barely know
 *  anything about this person" — never fed into the score itself. */
function countKnownSignals(
  budgetMin: number | null,
  budgetMax: number | null,
  preferredLocations: string[],
  bedrooms: string[],
  prefs: typeof schema.customerPreferences.$inferSelect | undefined,
  inference: typeof schema.customerInferences.$inferSelect | undefined
): number {
  const purposeKnown = (prefs?.purpose && prefs.purpose !== "unclear") || (inference?.inferredPurpose && inference.inferredPurpose !== "unclear");
  const readinessKnown =
    (prefs?.purchaseReadiness && prefs.purchaseReadiness !== "unknown") ||
    (inference?.inferredPurchaseReadiness && inference.inferredPurchaseReadiness !== "unknown");
  return [budgetMin != null || budgetMax != null, preferredLocations.length > 0, bedrooms.length > 0, Boolean(purposeKnown), Boolean(readinessKnown)].filter(
    Boolean
  ).length;
}

export async function getMatchResults(
  projectId: string,
  orgId: string,
  filters: { bucket?: string; search?: string } = {}
): Promise<MatchResultRow[]> {
  const project = await db.query.projects.findFirst({ where: and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)) });
  if (!project) return [];

  const matches = await db.query.projectMatches.findMany({
    where: filters.bucket
      ? and(eq(schema.projectMatches.projectId, projectId), eq(schema.projectMatches.bucket, filters.bucket as "hot" | "warm" | "possible"))
      : eq(schema.projectMatches.projectId, projectId),
    orderBy: desc(schema.projectMatches.totalScore),
  });
  if (matches.length === 0) return [];

  const customerIds = matches.map((m) => m.customerId);
  const [customers, prefs, inferences, reasons] = await Promise.all([
    db.query.customers.findMany({ where: inArray(schema.customers.id, customerIds) }),
    db.query.customerPreferences.findMany({ where: inArray(schema.customerPreferences.customerId, customerIds) }),
    db.query.customerInferences.findMany({ where: inArray(schema.customerInferences.customerId, customerIds) }),
    db.query.matchReasons.findMany({ where: inArray(schema.matchReasons.matchId, matches.map((m) => m.id)) }),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const prefsById = new Map(prefs.map((p) => [p.customerId, p]));
  const inferById = new Map(inferences.map((i) => [i.customerId, i]));
  const reasonsByMatch = new Map<string, { positives: string[]; concerns: string[] }>();
  for (const r of reasons) {
    if (!reasonsByMatch.has(r.matchId)) reasonsByMatch.set(r.matchId, { positives: [], concerns: [] });
    reasonsByMatch.get(r.matchId)![r.type === "positive" ? "positives" : "concerns"].push(r.text);
  }

  let rows: MatchResultRow[] = matches.map((m) => {
    const c = customerById.get(m.customerId)!;
    const p = prefsById.get(m.customerId);
    const inf = inferById.get(m.customerId);
    const r = reasonsByMatch.get(m.id) ?? { positives: [], concerns: [] };

    // Mirror scoreMatch's own precedence (score.ts: inferredBudget ?? stated budget) so the card
    // never shows a number that contradicts the score/explanation sitting right next to it.
    const budgetIsInferred = inf?.inferredBudgetMin != null || inf?.inferredBudgetMax != null;
    const budgetMin = inf?.inferredBudgetMin ?? p?.budgetMin ?? null;
    const budgetMax = inf?.inferredBudgetMax ?? p?.budgetMax ?? null;
    const preferredLocations = inf?.inferredLocations?.length ? inf.inferredLocations : p?.preferredLocations ?? [];
    const bedrooms = inf?.inferredBedrooms?.length ? inf.inferredBedrooms : p?.bedrooms ?? [];
    const knownSignalCount = countKnownSignals(budgetMin, budgetMax, preferredLocations, bedrooms, p, inf);

    return {
      matchId: m.id,
      customerId: c.id,
      customerName: c.name || "Unnamed lead",
      customerPhone: c.phone,
      totalScore: m.totalScore,
      bucket: m.bucket,
      budgetMin,
      budgetMax,
      budgetCurrency: p?.budgetCurrency ?? "AED",
      budgetIsInferred,
      preferredLocations,
      bedrooms,
      purpose: p?.purpose ?? "unclear",
      lostReason: p?.lostReason ?? "",
      lastContactedAt: p?.lastContactedAt ?? null,
      latestSeenAt: c.latestSeenAt,
      outcomeStatus: m.outcomeStatus,
      scoreBreakdown: m.scoreBreakdownJson,
      positives: cleanReasonList(r.positives),
      concerns: cleanReasonList(m.concernsJson.length ? m.concernsJson : r.concerns),
      knownSignalCount,
      hasLimitedData: knownSignalCount <= 1,
    };
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((r) => r.customerName.toLowerCase().includes(q) || r.customerPhone.includes(q));
  }

  // Within the same score, put leads we actually have some real signal on ahead of leads that are
  // essentially a blank profile — both can land on an identical score (the "missing data" neutral
  // defaults sum to a consistent number), but an agent working down the list should hit the ones
  // with real evidence first, before the ones that are a pure "worth a discovery call" toss-up.
  rows.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return Number(a.hasLimitedData) - Number(b.hasLimitedData);
  });

  return rows;
}

export async function getMatchCounts(projectId: string) {
  const rows = await db
    .select({ bucket: schema.projectMatches.bucket, count: rawSql<number>`count(*)::int` })
    .from(schema.projectMatches)
    .where(eq(schema.projectMatches.projectId, projectId))
    .groupBy(schema.projectMatches.bucket);
  const counts = { hot: 0, warm: 0, possible: 0 };
  for (const r of rows) {
    if (r.bucket === "hot") counts.hot = r.count;
    if (r.bucket === "warm") counts.warm = r.count;
    if (r.bucket === "possible") counts.possible = r.count;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// The outcome loop (product spec §6/§7) — 7 buttons, not a CRM pipeline. Three
// (Interested/Not Interested/No Response) just record what happened. Four
// (Not Now/Budget Changed/Different Location/Bought Elsewhere) change what we actually know
// about the buyer, so they also feed the "Living Buyer Profile" and trigger an immediate,
// narrowly-scoped rescore — this customer against this org's active projects, nothing wider.
// ---------------------------------------------------------------------------

const INTELLIGENCE_CHANGING_OUTCOMES = new Set(["not_now", "budget_changed", "different_location", "bought_elsewhere"]);
const FOLLOWUP_OUTCOMES = new Set<FollowupOutcome>(["not_now", "budget_changed", "different_location"]);

export interface RecordOutcomeResult {
  outcomeStatus: string;
  rescored: boolean;
}

export async function recordMatchOutcome(
  matchId: string,
  orgId: string,
  outcomeStatus: string,
  rawAnswer?: string
): Promise<RecordOutcomeResult> {
  const match = await db.query.projectMatches.findFirst({ where: eq(schema.projectMatches.id, matchId) });
  if (!match) return { outcomeStatus, rescored: false };
  const [project, customer] = await Promise.all([
    db.query.projects.findFirst({ where: and(eq(schema.projects.id, match.projectId), eq(schema.projects.orgId, orgId)) }),
    db.query.customers.findFirst({ where: and(eq(schema.customers.id, match.customerId), eq(schema.customers.orgId, orgId)) }),
  ]);
  if (!project || !customer) return { outcomeStatus, rescored: false };

  await db
    .update(schema.projectMatches)
    .set({ outcomeStatus: outcomeStatus as (typeof schema.projectMatches.$inferInsert)["outcomeStatus"], outcomeUpdatedAt: new Date() })
    .where(eq(schema.projectMatches.id, matchId));

  // Always log a timeline entry — feeds recency scoring and keeps a human-readable record of
  // every contact, even for the three outcomes with no follow-up question.
  await db.insert(schema.customerInteractions).values({
    id: newId("interaction"),
    customerId: customer.id,
    channel: "status_change",
    summary: `Outcome logged: ${outcomeStatus.replace(/_/g, " ")}${rawAnswer?.trim() ? ` — "${rawAnswer.trim()}"` : ""}`,
    rawNote: rawAnswer?.trim() ?? "",
    projectMentioned: project.name,
  });

  // Bought Elsewhere: hard-exclude this customer from every project org-wide, immediately —
  // not just this one match. score.ts already treats "lost_elsewhere" the same as won/invalid.
  if (outcomeStatus === "bought_elsewhere") {
    await db.update(schema.customers).set({ status: "lost_elsewhere", updatedAt: new Date() }).where(eq(schema.customers.id, customer.id));
  }

  // The three follow-up outcomes: interpret the agent's own-words answer (AI first, deterministic
  // parser fallback — see interpretOutcomeFollowup) and record it as a live signal so it outranks
  // stale stated/AI-inferred data in every future score. If nothing structured comes out of it,
  // the raw answer is still safely preserved in the interaction logged above — never lost either way.
  if (FOLLOWUP_OUTCOMES.has(outcomeStatus as FollowupOutcome) && rawAnswer?.trim()) {
    const prefs = await db.query.customerPreferences.findFirst({ where: eq(schema.customerPreferences.customerId, customer.id) });
    const interpreted = await interpretOutcomeFollowup({
      outcomeStatus: outcomeStatus as FollowupOutcome,
      rawAnswer: rawAnswer.trim(),
      currentBudgetMin: prefs?.budgetMin ?? null,
      currentBudgetMax: prefs?.budgetMax ?? null,
      currentCurrency: prefs?.budgetCurrency ?? "AED",
    });
    if (Object.keys(interpreted.structuredValue).length > 0) {
      await db.insert(schema.customerLiveSignals).values({
        id: newId("live"),
        customerId: customer.id,
        matchId,
        outcomeStatus,
        field: interpreted.field,
        rawAnswer: rawAnswer.trim(),
        structuredValueJson: interpreted.structuredValue,
        interpretedBy: interpreted.interpretedBy,
        confidence: interpreted.confidence,
      });
    }
  }

  let rescored = false;
  if (INTELLIGENCE_CHANGING_OUTCOMES.has(outcomeStatus)) {
    await rescoreCustomerAcrossActiveProjects(customer.id, orgId);
    rescored = true;
  }

  return { outcomeStatus, rescored };
}

interface CustomerProjectScore {
  project: typeof schema.projects.$inferSelect;
  result: ReturnType<typeof scoreMatch>;
  existingMatchId: string | undefined;
  existingOutcomeStatus: string | undefined;
}

/** Read-only core shared by the outcome-loop rescore below and the buyer-facing "Buyer -> Find
 *  Projects" reverse-match view (product spec §10 — the matching engine already worked in one
 *  direction, project -> buyers; this is the same scoreMatch() call run the other way, one
 *  customer against every ACTIVE project in the org). No AI call, no writes — safe to call from
 *  a page render. Returns every active project scored, unfiltered (including excluded/"none"
 *  ones), so each caller decides what to do with that: the rescorer needs to know about a
 *  newly-"none" project so it can delete a stale row; the buyer-page view just filters those out. */
async function computeCustomerProjectScores(customerId: string, orgId: string): Promise<CustomerProjectScore[]> {
  const customer = await db.query.customers.findFirst({ where: and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId)) });
  if (!customer) return [];

  const activeProjects = await db.query.projects.findMany({ where: and(eq(schema.projects.orgId, orgId), eq(schema.projects.status, "active")) });
  if (activeProjects.length === 0) return [];

  const projectIds = activeProjects.map((p) => p.id);
  const [prefs, inference, interactions, liveSignals, unitTypesAll, existingMatches] = await Promise.all([
    db.query.customerPreferences.findFirst({ where: eq(schema.customerPreferences.customerId, customerId) }),
    db.query.customerInferences.findFirst({ where: eq(schema.customerInferences.customerId, customerId) }),
    db.query.customerInteractions.findMany({ where: eq(schema.customerInteractions.customerId, customerId) }),
    db.query.customerLiveSignals.findMany({ where: eq(schema.customerLiveSignals.customerId, customerId) }),
    db.query.projectUnitTypes.findMany({ where: inArray(schema.projectUnitTypes.projectId, projectIds) }),
    db.query.projectMatches.findMany({ where: and(eq(schema.projectMatches.customerId, customerId), inArray(schema.projectMatches.projectId, projectIds)) }),
  ]);

  const interactionDates = interactions.map((i) => i.occurredAt);
  const distinctProjectsCount = new Set(interactions.map((i) => i.projectMentioned?.toLowerCase()).filter(Boolean)).size;
  const customerInput = buildMatchCustomerInput(customer, prefs ?? undefined, inference ?? undefined, interactionDates, distinctProjectsCount, liveSignals);

  const unitTypesByProject = new Map<string, string[]>();
  for (const u of unitTypesAll) {
    if (!unitTypesByProject.has(u.projectId)) unitTypesByProject.set(u.projectId, []);
    unitTypesByProject.get(u.projectId)!.push(u.typeLabel);
  }
  const existingByProject = new Map(existingMatches.map((m) => [m.projectId, m]));

  const now = new Date();
  return activeProjects.map((project) => {
    const projectInput = buildMatchProjectInput(project, unitTypesByProject.get(project.id) ?? []);
    const result = scoreMatch(customerInput, projectInput, now);
    const existing = existingByProject.get(project.id);
    return { project, result, existingMatchId: existing?.id, existingOutcomeStatus: existing?.outcomeStatus };
  });
}

/** Re-runs the deterministic matching engine for ONE customer against every ACTIVE project in
 *  the org — not the whole project's customer base, and no AI call. Cheap enough to run inline
 *  right after an outcome is logged, so "Contact Today" and every project's match list reflect
 *  what was just learned immediately, without waiting for the next full project re-analyze. */
export async function rescoreCustomerAcrossActiveProjects(customerId: string, orgId: string): Promise<void> {
  const scores = await computeCustomerProjectScores(customerId, orgId);
  const now = new Date();

  for (const { project, result, existingMatchId } of scores) {
    if (result.excluded || result.bucket === "none") {
      // No longer a viable match — remove any existing row (cascades to its reasons/evidence) so
      // it stops showing up as a stale hot/warm match anywhere. Rows are only ever persisted for
      // hot/warm/possible buckets, matching the invariant the full per-project batch run uses.
      if (existingMatchId) await db.delete(schema.projectMatches).where(eq(schema.projectMatches.id, existingMatchId));
      continue;
    }

    const matchId = existingMatchId ?? newId("match");
    if (existingMatchId) {
      await db
        .update(schema.projectMatches)
        .set({ totalScore: result.totalScore, bucket: result.bucket, scoreBreakdownJson: result.breakdown, concernsJson: result.concerns, computedAt: now })
        .where(eq(schema.projectMatches.id, matchId));
    } else {
      await db.insert(schema.projectMatches).values({
        id: matchId,
        projectId: project.id,
        customerId,
        totalScore: result.totalScore,
        bucket: result.bucket,
        scoreBreakdownJson: result.breakdown,
        concernsJson: result.concerns,
        explanationSource: "template",
      });
    }

    // Refresh template reasons — deterministic and instant, so this stays cheap enough to run
    // synchronously right after an outcome tap. A polished AI explanation pass still happens
    // whenever the project is next fully re-analyzed via "Find Potential Buyers".
    await db.delete(schema.matchReasons).where(eq(schema.matchReasons.matchId, matchId));
    const reasonRows = [
      ...result.positives.map((text, i) => ({ id: newId("reason"), matchId, type: "positive" as const, text, weight: 1, sortOrder: i })),
      ...result.concerns.map((text, i) => ({ id: newId("reason"), matchId, type: "concern" as const, text, weight: 1, sortOrder: i })),
    ];
    if (reasonRows.length > 0) await db.insert(schema.matchReasons).values(reasonRows);
  }
}

// ---------------------------------------------------------------------------
// "Buyer -> Find Projects" — the reverse direction (product spec §10). The forward direction
// (Project -> Find Buyers) is runMatchingForProject/getMatchResults above; this is the same
// scoreMatch() engine run the other way for a single buyer's profile page, read-only and
// uncached — realistic org sizes are single-digit-to-dozens of active projects, cheap enough to
// compute fresh on every page view rather than adding another cache-invalidation surface.
// ---------------------------------------------------------------------------

export interface BestProjectMatch {
  /** Opaque id handed to OutcomeButtons/logBuyerProjectOutcomeAction — NOT always a real
   *  projectMatches.id. If this buyer has never been scored against this project before (no
   *  persisted row), it's a "customerId::projectId" composite key instead; the action resolves
   *  either form via ensureMatchRow so logging an outcome always has somewhere real to write. */
  matchId: string;
  projectId: string;
  projectName: string;
  projectLocation: string;
  totalScore: number;
  bucket: "hot" | "warm" | "possible";
  breakdown: Record<string, { score: number; max: number }>;
  positives: string[];
  concerns: string[];
  outcomeStatus: string;
}

export async function getBestProjectMatchesForCustomer(customerId: string, orgId: string, limit = 5): Promise<BestProjectMatch[]> {
  const scores = await computeCustomerProjectScores(customerId, orgId);
  return scores
    .filter((s) => !s.result.excluded && s.result.bucket !== "none")
    .sort((a, b) => b.result.totalScore - a.result.totalScore)
    .slice(0, limit)
    .map((s) => ({
      matchId: s.existingMatchId ?? `${customerId}::${s.project.id}`,
      projectId: s.project.id,
      projectName: s.project.name,
      projectLocation: s.project.location,
      totalScore: s.result.totalScore,
      bucket: s.result.bucket as "hot" | "warm" | "possible",
      breakdown: s.result.breakdown,
      positives: s.result.positives,
      concerns: s.result.concerns,
      outcomeStatus: s.existingOutcomeStatus ?? "not_contacted",
    }));
}

/** Finds this (customer, project) pair's persisted match row, or creates one on the spot if the
 *  pair has never been scored/persisted before. Used when an outcome is logged from the buyer
 *  profile's reverse-match view, where a shown project may not have a projectMatches row yet
 *  (getBestProjectMatchesForCustomer computes scores live without persisting them) — the agent
 *  is recording a real interaction, so it needs somewhere durable to attach that outcome to. */
export async function ensureMatchRow(customerId: string, projectId: string, orgId: string): Promise<string | null> {
  const existing = await db.query.projectMatches.findFirst({
    where: and(eq(schema.projectMatches.customerId, customerId), eq(schema.projectMatches.projectId, projectId)),
  });
  if (existing) return existing.id;

  const [customer, project] = await Promise.all([
    db.query.customers.findFirst({ where: and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId)) }),
    db.query.projects.findFirst({ where: and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)) }),
  ]);
  if (!customer || !project) return null;

  const [prefs, inference, interactions, liveSignals, unitTypes] = await Promise.all([
    db.query.customerPreferences.findFirst({ where: eq(schema.customerPreferences.customerId, customerId) }),
    db.query.customerInferences.findFirst({ where: eq(schema.customerInferences.customerId, customerId) }),
    db.query.customerInteractions.findMany({ where: eq(schema.customerInteractions.customerId, customerId) }),
    db.query.customerLiveSignals.findMany({ where: eq(schema.customerLiveSignals.customerId, customerId) }),
    db.query.projectUnitTypes.findMany({ where: eq(schema.projectUnitTypes.projectId, projectId) }),
  ]);
  const interactionDates = interactions.map((i) => i.occurredAt);
  const distinctProjectsCount = new Set(interactions.map((i) => i.projectMentioned?.toLowerCase()).filter(Boolean)).size;
  const customerInput = buildMatchCustomerInput(customer, prefs ?? undefined, inference ?? undefined, interactionDates, distinctProjectsCount, liveSignals);
  const projectInput = buildMatchProjectInput(project, unitTypes.map((u) => u.typeLabel));
  const result = scoreMatch(customerInput, projectInput, new Date());

  const matchId = newId("match");
  await db.insert(schema.projectMatches).values({
    id: matchId,
    projectId,
    customerId,
    totalScore: result.totalScore,
    bucket: result.bucket,
    scoreBreakdownJson: result.breakdown,
    concernsJson: result.concerns,
    explanationSource: "template",
  });
  const reasonRows = [
    ...result.positives.map((text, i) => ({ id: newId("reason"), matchId, type: "positive" as const, text, weight: 1, sortOrder: i })),
    ...result.concerns.map((text, i) => ({ id: newId("reason"), matchId, type: "concern" as const, text, weight: 1, sortOrder: i })),
  ];
  if (reasonRows.length > 0) await db.insert(schema.matchReasons).values(reasonRows);
  return matchId;
}

// ---------------------------------------------------------------------------
// "Who should I contact today?" — cross-project recommendation view
// ---------------------------------------------------------------------------

export async function getTodaysReactivationOpportunities(orgId: string, limit = 20) {
  const projects = await db.query.projects.findMany({ where: and(eq(schema.projects.orgId, orgId), eq(schema.projects.status, "active")) });
  if (projects.length === 0) return [];
  const projectIds = projects.map((p) => p.id);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const matches = await db.query.projectMatches.findMany({
    where: and(inArray(schema.projectMatches.projectId, projectIds), eq(schema.projectMatches.outcomeStatus, "not_contacted")),
    orderBy: desc(schema.projectMatches.totalScore),
    limit: limit * 3, // over-fetch a bit before per-customer de-dup
  });

  const customerIds = Array.from(new Set(matches.map((m) => m.customerId)));
  const [customers, reasons] = await Promise.all([
    db.query.customers.findMany({ where: inArray(schema.customers.id, customerIds) }),
    db.query.matchReasons.findMany({ where: and(inArray(schema.matchReasons.matchId, matches.map((m) => m.id)), eq(schema.matchReasons.type, "positive")) }),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const reasonsByMatch = new Map<string, string[]>();
  for (const r of reasons) {
    if (!reasonsByMatch.has(r.matchId)) reasonsByMatch.set(r.matchId, []);
    reasonsByMatch.get(r.matchId)!.push(r.text);
  }

  const seenCustomers = new Set<string>();
  const out: Array<{
    matchId: string;
    customerId: string;
    customerName: string;
    projectId: string;
    projectName: string;
    score: number;
    reason: string;
  }> = [];
  for (const m of matches) {
    if (seenCustomers.has(m.customerId)) continue; // best single opportunity per customer
    seenCustomers.add(m.customerId);
    const customer = customerById.get(m.customerId);
    const project = projectById.get(m.projectId);
    if (!customer || !project) continue;
    out.push({
      matchId: m.id,
      customerId: customer.id,
      customerName: customer.name || "Unnamed lead",
      projectId: project.id,
      projectName: project.name,
      score: m.totalScore,
      reason: (reasonsByMatch.get(m.id) ?? []).slice(0, 3).join(" · "),
    });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Outreach generation
// ---------------------------------------------------------------------------

export async function generateOutreachForMatch(matchId: string, orgId: string, agentName: string) {
  const match = await db.query.projectMatches.findFirst({ where: eq(schema.projectMatches.id, matchId) });
  if (!match) return null;
  const [project, customer, positiveReasons] = await Promise.all([
    db.query.projects.findFirst({ where: and(eq(schema.projects.id, match.projectId), eq(schema.projects.orgId, orgId)) }),
    db.query.customers.findFirst({ where: and(eq(schema.customers.id, match.customerId), eq(schema.customers.orgId, orgId)) }),
    db.query.matchReasons.findMany({ where: and(eq(schema.matchReasons.matchId, matchId), eq(schema.matchReasons.type, "positive")) }),
  ]);
  if (!project || !customer) return null;

  const matchSummary = positiveReasons.map((r) => r.text).join("; ") || `a ${match.totalScore}% match`;
  const input: OutreachInput = { customerId: customer.id, customerName: customer.name, matchSummary, projectName: project.name, agentName };

  const aiResults = await generateOutreachMessages([input]);
  const result = aiResults.get(customer.id) ?? templateOutreach(input);

  await db.insert(schema.generatedOutreach).values([
    { id: newId("outreach"), matchId, customerId: customer.id, projectId: project.id, channel: "call_opening", content: result.callOpening, source: aiResults.has(customer.id) ? "ai" : "template" },
    { id: newId("outreach"), matchId, customerId: customer.id, projectId: project.id, channel: "whatsapp", content: result.whatsappMessage, source: aiResults.has(customer.id) ? "ai" : "template" },
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// AI enrichment — turns free-text notes into the inferred buyer-profile layer
// ---------------------------------------------------------------------------

export async function runAiEnrichmentForImport(importJobId: string, orgId: string): Promise<{ enriched: number }> {
  const rows = await db.query.importedRows.findMany({ where: eq(schema.importedRows.importJobId, importJobId) });
  const customerIds = Array.from(new Set(rows.map((r) => r.customerId).filter((id): id is string => Boolean(id))));
  if (customerIds.length === 0) return { enriched: 0 };

  const [customers, interactions, prefs] = await Promise.all([
    db.query.customers.findMany({ where: and(inArray(schema.customers.id, customerIds), eq(schema.customers.orgId, orgId)) }),
    db.query.customerInteractions.findMany({ where: inArray(schema.customerInteractions.customerId, customerIds) }),
    db.query.customerPreferences.findMany({ where: inArray(schema.customerPreferences.customerId, customerIds) }),
  ]);
  const interactionsByCustomer = new Map<string, typeof interactions>();
  for (const i of interactions) {
    if (!i.rawNote) continue;
    if (!interactionsByCustomer.has(i.customerId)) interactionsByCustomer.set(i.customerId, []);
    interactionsByCustomer.get(i.customerId)!.push(i);
  }
  const prefsByCustomer = new Map(prefs.map((p) => [p.customerId, p]));

  const inputs: BuyerProfileInput[] = customers
    .filter((c) => interactionsByCustomer.has(c.id))
    .map((c) => ({
      customerId: c.id,
      notes: (interactionsByCustomer.get(c.id) ?? []).map((i) => ({ text: i.rawNote, date: i.occurredAt.toISOString() })),
      structuredContext: {
        budgetMin: prefsByCustomer.get(c.id)?.budgetMin,
        budgetMax: prefsByCustomer.get(c.id)?.budgetMax,
        budgetCurrency: prefsByCustomer.get(c.id)?.budgetCurrency,
        preferredLocations: prefsByCustomer.get(c.id)?.preferredLocations,
        bedrooms: prefsByCustomer.get(c.id)?.bedrooms,
        purpose: prefsByCustomer.get(c.id)?.purpose,
      },
    }));

  console.log(`  [ai:notes] extracting buyer profiles for ${inputs.length} customers with notes…`);
  const profiles = await extractBuyerProfiles(inputs);
  console.log(`  [ai:notes] writing ${profiles.size} extracted profile(s) to the database…`);

  // customerId is unique on this table (one inference row per customer), so a single batched
  // upsert replaces what used to be a per-customer "check if it exists, then insert-or-update" —
  // two sequential round trips each, ~700 total for 350 customers. This was the exact same
  // pattern already fixed in the import writer and the match writer; same fix here.
  const inferenceRows = Array.from(profiles.entries()).map(([customerId, profile]) => ({
    id: newId("infer"),
    customerId,
    inferredBudgetMin: profile.inferredBudgetMin,
    inferredBudgetMax: profile.inferredBudgetMax,
    inferredLocations: profile.inferredLocations,
    inferredPropertyTypes: profile.inferredPropertyTypes,
    inferredBedrooms: profile.inferredBedrooms,
    inferredPurpose: profile.inferredPurpose,
    inferredPaymentPreferences: profile.inferredPaymentPreferences,
    inferredTimeline: profile.inferredTimeline,
    inferredObjections: profile.inferredObjections,
    inferredDeveloperPreferences: profile.inferredDeveloperPreferences,
    inferredPurchaseReadiness: profile.inferredPurchaseReadiness,
    profileConfidence: profile.profileConfidence,
    aiSummary: profile.aiSummary,
    evidenceJson: profile.evidence.map((e) => ({ field: e.field, value: e.value, confidence: e.confidence, sourceExcerpt: e.sourceExcerpt })),
    lastInferredAt: new Date(),
  }));

  const upsertSet = {
    inferredBudgetMin: rawSql`excluded.inferred_budget_min`,
    inferredBudgetMax: rawSql`excluded.inferred_budget_max`,
    inferredLocations: rawSql`excluded.inferred_locations`,
    inferredPropertyTypes: rawSql`excluded.inferred_property_types`,
    inferredBedrooms: rawSql`excluded.inferred_bedrooms`,
    inferredPurpose: rawSql`excluded.inferred_purpose`,
    inferredPaymentPreferences: rawSql`excluded.inferred_payment_preferences`,
    inferredTimeline: rawSql`excluded.inferred_timeline`,
    inferredObjections: rawSql`excluded.inferred_objections`,
    inferredDeveloperPreferences: rawSql`excluded.inferred_developer_preferences`,
    inferredPurchaseReadiness: rawSql`excluded.inferred_purchase_readiness`,
    profileConfidence: rawSql`excluded.profile_confidence`,
    aiSummary: rawSql`excluded.ai_summary`,
    evidenceJson: rawSql`excluded.evidence_json`,
    lastInferredAt: rawSql`excluded.last_inferred_at`,
  };

  let enriched = 0;
  const CHUNK = 200;
  for (let i = 0; i < inferenceRows.length; i += CHUNK) {
    const chunk = inferenceRows.slice(i, i + CHUNK);
    try {
      await db.insert(schema.customerInferences).values(chunk).onConflictDoUpdate({
        target: schema.customerInferences.customerId,
        set: upsertSet,
      });
      enriched += chunk.length;
    } catch (err) {
      // AI enrichment is an enhancement layer, never a dependency — if a whole chunk fails (e.g.
      // one bad customerId among 200), fall back to writing that chunk one row at a time so a
      // single bad row doesn't cost every other row in the batch its profile.
      console.error(`  [ai:notes] chunk upsert failed, retrying its rows individually:`, err instanceof Error ? err.message : err);
      for (const row of chunk) {
        try {
          await db.insert(schema.customerInferences).values(row).onConflictDoUpdate({
            target: schema.customerInferences.customerId,
            set: upsertSet,
          });
          enriched++;
        } catch (rowErr) {
          console.error(`  [ai:notes] failed to write inferred profile for customer ${row.customerId}:`, rowErr instanceof Error ? rowErr.message : rowErr);
        }
      }
    }
  }
  console.log(`  [ai:notes] done writing`);
  return { enriched };
}

// ---------------------------------------------------------------------------
// Source & campaign intelligence
// ---------------------------------------------------------------------------

export async function getSourceBreakdown(orgId: string) {
  const rows = await db
    .select({ platform: schema.sources.platform, name: schema.sources.name, count: rawSql<number>`count(distinct ${schema.customerSourceRecords.customerId})::int` })
    .from(schema.customerSourceRecords)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.customerSourceRecords.customerId))
    .leftJoin(schema.sources, eq(schema.sources.id, schema.customerSourceRecords.sourceId))
    .where(eq(schema.customers.orgId, orgId))
    .groupBy(schema.sources.platform, schema.sources.name)
    .orderBy(desc(rawSql`count(distinct ${schema.customerSourceRecords.customerId})`));
  return rows;
}

export async function getProjectMatchSourceBreakdown(projectId: string, bucket?: string) {
  const matchWhere = bucket
    ? and(eq(schema.projectMatches.projectId, projectId), eq(schema.projectMatches.bucket, bucket as "hot" | "warm" | "possible"))
    : eq(schema.projectMatches.projectId, projectId);
  const rows = await db
    .select({ platform: schema.sources.platform, name: schema.sources.name, count: rawSql<number>`count(distinct ${schema.projectMatches.customerId})::int` })
    .from(schema.projectMatches)
    .innerJoin(schema.customerSourceRecords, eq(schema.customerSourceRecords.customerId, schema.projectMatches.customerId))
    .leftJoin(schema.sources, eq(schema.sources.id, schema.customerSourceRecords.sourceId))
    .where(matchWhere)
    .groupBy(schema.sources.platform, schema.sources.name)
    .orderBy(desc(rawSql`count(distinct ${schema.projectMatches.customerId})`));
  return rows;
}

export async function getCampaignIntelligence(orgId: string) {
  const campaigns = await db.query.campaigns.findMany({ where: eq(schema.campaigns.orgId, orgId) });
  const results = [];
  for (const campaign of campaigns) {
    const [originalLeadsRow] = await db
      .select({ count: rawSql<number>`count(distinct ${schema.customerSourceRecords.customerId})::int` })
      .from(schema.customerSourceRecords)
      .where(eq(schema.customerSourceRecords.campaignId, campaign.id));
    const [reusableRow] = await db
      .select({ count: rawSql<number>`count(distinct ${schema.customers.id})::int` })
      .from(schema.customers)
      .innerJoin(schema.customerSourceRecords, eq(schema.customerSourceRecords.customerId, schema.customers.id))
      .where(and(eq(schema.customerSourceRecords.campaignId, campaign.id), ne(schema.customers.status, "won")));
    const [hotMatchesRow] = await db
      .select({ count: rawSql<number>`count(distinct ${schema.projectMatches.customerId})::int` })
      .from(schema.projectMatches)
      .innerJoin(schema.customerSourceRecords, eq(schema.customerSourceRecords.customerId, schema.projectMatches.customerId))
      .where(and(eq(schema.customerSourceRecords.campaignId, campaign.id), eq(schema.projectMatches.bucket, "hot")));

    results.push({
      campaignId: campaign.id,
      name: campaign.name,
      originalLeads: originalLeadsRow?.count ?? 0,
      currentReusableBuyers: reusableRow?.count ?? 0,
      hotMatchesAcrossProjects: hotMatchesRow?.count ?? 0,
    });
  }
  return results.sort((a, b) => b.originalLeads - a.originalLeads);
}

// ---------------------------------------------------------------------------
// Outcome analytics (spec section 37 — the core success metric)
// ---------------------------------------------------------------------------

export async function getOutcomeAnalytics(orgId: string) {
  const projects = await db.query.projects.findMany({ where: eq(schema.projects.orgId, orgId), columns: { id: true } });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) {
    return { hotMatchesContacted: 0, interested: 0, viewings: 0, bookings: 0, purchased: 0, totalHotMatches: 0, reactivationRatePercent: 0 };
  }
  const rows = await db
    .select({ outcomeStatus: schema.projectMatches.outcomeStatus, bucket: schema.projectMatches.bucket, count: rawSql<number>`count(*)::int` })
    .from(schema.projectMatches)
    .where(inArray(schema.projectMatches.projectId, projectIds))
    .groupBy(schema.projectMatches.outcomeStatus, schema.projectMatches.bucket);

  let totalHotMatches = 0;
  let hotMatchesContacted = 0;
  let interested = 0;
  let viewings = 0;
  let bookings = 0;
  let purchased = 0;
  for (const r of rows) {
    if (r.bucket === "hot") {
      totalHotMatches += r.count;
      if (r.outcomeStatus !== "not_contacted") hotMatchesContacted += r.count;
    }
    if (r.outcomeStatus === "interested") interested += r.count;
    if (r.outcomeStatus === "viewing") viewings += r.count;
    if (r.outcomeStatus === "booked") bookings += r.count;
    if (r.outcomeStatus === "purchased") purchased += r.count;
  }
  const reactivationRatePercent = hotMatchesContacted > 0 ? Math.round(((interested + viewings + bookings + purchased) / hotMatchesContacted) * 1000) / 10 : 0;
  return { hotMatchesContacted, interested, viewings, bookings, purchased, totalHotMatches, reactivationRatePercent };
}
