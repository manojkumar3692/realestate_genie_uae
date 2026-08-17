import { eq, and, inArray, desc, sql as rawSql, ne } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { newId } from "@/lib/id";
import { scoreMatch, type MatchCustomerInput, type MatchProjectInput } from "@/lib/matching/score";
import { generateMatchExplanations, type MatchExplanationInput } from "@/lib/ai/generateMatchExplanation";
import { generateOutreachMessages, templateOutreach, type OutreachInput } from "@/lib/ai/generateOutreach";
import { extractBuyerProfiles, type BuyerProfileInput } from "@/lib/ai/extractBuyerProfile";
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
  const eligible = customers.filter((c) => !c.doNotContact && c.status !== "invalid" && c.status !== "do_not_contact");
  const customerIds = eligible.map((c) => c.id);

  const [allPrefs, allInferences, allInteractions] = await Promise.all([
    db.query.customerPreferences.findMany({ where: inArray(schema.customerPreferences.customerId, customerIds) }),
    db.query.customerInferences.findMany({ where: inArray(schema.customerInferences.customerId, customerIds) }),
    db.query.customerInteractions.findMany({ where: inArray(schema.customerInteractions.customerId, customerIds) }),
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

  const now = new Date();
  const results: Array<{ customer: (typeof eligible)[number]; result: ReturnType<typeof scoreMatch> }> = [];

  for (const c of eligible) {
    const prefs = prefsByCustomer.get(c.id);
    const inference = inferByCustomer.get(c.id);
    const input: MatchCustomerInput = {
      id: c.id,
      doNotContact: c.doNotContact,
      status: c.status,
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
      interactionDates: interactionsByCustomer.get(c.id) ?? [],
      distinctProjectsCount: distinctProjectsByCustomer.get(c.id)?.size ?? 0,
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
    };
    const result = scoreMatch(input, projectInput, now);
    if (!result.excluded && result.bucket !== "none") {
      results.push({ customer: c, result });
    }
  }

  results.sort((a, b) => b.result.totalScore - a.result.totalScore);

  // AI explanation pass on the strongest candidates only — keeps AI cost bounded.
  const topForAi = results.slice(0, AI_EXPLANATION_TOP_N);
  const explanationInputs: MatchExplanationInput[] = topForAi.map(({ customer, result }) => ({
    customerId: customer.id,
    customerSummary: buildCustomerSummary(customer, prefsByCustomer.get(customer.id), inferByCustomer.get(customer.id)),
    projectSummary: buildProjectSummary(project, unitTypes.map((u) => u.typeLabel)),
    deterministicScore: result.totalScore,
  }));
  const aiExplanations = await generateMatchExplanations(explanationInputs);

  // Persist: clear old matches for this project, insert fresh.
  await db.delete(schema.projectMatches).where(eq(schema.projectMatches.projectId, projectId));

  let hot = 0,
    warm = 0,
    possible = 0,
    potentialBuyerValue = 0;

  for (const { customer, result } of results) {
    const ai = aiExplanations.get(customer.id);
    const adjustedScore = ai ? Math.max(0, Math.min(100, result.totalScore + ai.scoreAdjustment)) : result.totalScore;
    const bucket = bucketForScore(adjustedScore);
    if (bucket === "none") continue;

    const matchId = newId("match");
    await db.insert(schema.projectMatches).values({
      id: matchId,
      projectId,
      customerId: customer.id,
      totalScore: adjustedScore,
      bucket,
      scoreBreakdownJson: result.breakdown,
      concernsJson: ai?.concerns?.length ? ai.concerns : result.concerns,
      explanationSource: ai ? "ai" : "template",
    });

    const reasonRows = [
      ...(ai?.positives ?? result.positives).map((text, i) => ({
        id: newId("reason"),
        matchId,
        type: "positive" as const,
        text,
        weight: 1,
        sortOrder: i,
      })),
      ...(ai?.concerns ?? result.concerns).map((text, i) => ({
        id: newId("reason"),
        matchId,
        type: "concern" as const,
        text,
        weight: 1,
        sortOrder: i,
      })),
    ];
    if (reasonRows.length) await db.insert(schema.matchReasons).values(reasonRows);

    if (bucket === "hot") hot++;
    else if (bucket === "warm") warm++;
    else possible++;
    if (bucket === "hot" || bucket === "warm") {
      const prefs = prefsByCustomer.get(customer.id);
      const inference = inferByCustomer.get(customer.id);
      potentialBuyerValue += inference?.inferredBudgetMax ?? prefs?.budgetMax ?? project.startingPrice ?? 0;
    }
  }

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
  const [customers, prefs, reasons] = await Promise.all([
    db.query.customers.findMany({ where: inArray(schema.customers.id, customerIds) }),
    db.query.customerPreferences.findMany({ where: inArray(schema.customerPreferences.customerId, customerIds) }),
    db.query.matchReasons.findMany({ where: inArray(schema.matchReasons.matchId, matches.map((m) => m.id)) }),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const prefsById = new Map(prefs.map((p) => [p.customerId, p]));
  const reasonsByMatch = new Map<string, { positives: string[]; concerns: string[] }>();
  for (const r of reasons) {
    if (!reasonsByMatch.has(r.matchId)) reasonsByMatch.set(r.matchId, { positives: [], concerns: [] });
    reasonsByMatch.get(r.matchId)![r.type === "positive" ? "positives" : "concerns"].push(r.text);
  }

  let rows: MatchResultRow[] = matches.map((m) => {
    const c = customerById.get(m.customerId)!;
    const p = prefsById.get(m.customerId);
    const r = reasonsByMatch.get(m.id) ?? { positives: [], concerns: [] };
    return {
      matchId: m.id,
      customerId: c.id,
      customerName: c.name || "Unnamed lead",
      customerPhone: c.phone,
      totalScore: m.totalScore,
      bucket: m.bucket,
      budgetMin: p?.budgetMin ?? null,
      budgetMax: p?.budgetMax ?? null,
      budgetCurrency: p?.budgetCurrency ?? "AED",
      preferredLocations: p?.preferredLocations ?? [],
      bedrooms: p?.bedrooms ?? [],
      purpose: p?.purpose ?? "unclear",
      lostReason: p?.lostReason ?? "",
      lastContactedAt: p?.lastContactedAt ?? null,
      latestSeenAt: c.latestSeenAt,
      outcomeStatus: m.outcomeStatus,
      scoreBreakdown: m.scoreBreakdownJson,
      positives: r.positives,
      concerns: m.concernsJson.length ? m.concernsJson : r.concerns,
    };
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((r) => r.customerName.toLowerCase().includes(q) || r.customerPhone.includes(q));
  }

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

export async function updateMatchOutcome(matchId: string, orgId: string, outcomeStatus: string) {
  const match = await db.query.projectMatches.findFirst({ where: eq(schema.projectMatches.id, matchId) });
  if (!match) return;
  const project = await db.query.projects.findFirst({ where: and(eq(schema.projects.id, match.projectId), eq(schema.projects.orgId, orgId)) });
  if (!project) return;
  await db
    .update(schema.projectMatches)
    .set({ outcomeStatus: outcomeStatus as (typeof schema.projectMatches.$inferInsert)["outcomeStatus"], outcomeUpdatedAt: new Date() })
    .where(eq(schema.projectMatches.id, matchId));
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

  const profiles = await extractBuyerProfiles(inputs);
  let enriched = 0;
  for (const [customerId, profile] of profiles) {
    const existing = await db.query.customerInferences.findFirst({ where: eq(schema.customerInferences.customerId, customerId) });
    const values = {
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
    };
    if (existing) {
      await db.update(schema.customerInferences).set(values).where(eq(schema.customerInferences.customerId, customerId));
    } else {
      await db.insert(schema.customerInferences).values({ id: newId("infer"), customerId, ...values });
    }
    enriched++;
  }
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
