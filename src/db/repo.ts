import { and, desc, eq, inArray, sql as rawSql } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { newId } from "@/lib/id";
import { normalizeSource } from "@/lib/normalize/source";
import { normalizeWhitespace, normalizeKey } from "@/lib/normalize/text";
import { findDuplicateCandidates, type IdentityCandidate } from "@/lib/import/dedupe";
import { normalizeRow, type NormalizedRow } from "@/lib/import/normalizeRow";
import type { ColumnDetection } from "@/lib/import/detectColumns";
import { logAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Sources & campaigns
// ---------------------------------------------------------------------------

export async function getOrCreateSource(orgId: string, rawSource: string) {
  const normalized = normalizeSource(rawSource);
  const key = normalizeKey(normalized.displayName || "unknown");
  const existing = await db.query.sources.findFirst({
    where: and(eq(schema.sources.orgId, orgId), eq(schema.sources.normalizedName, key)),
  });
  if (existing) return existing;
  const row = {
    id: newId("src"),
    orgId,
    name: normalized.displayName,
    normalizedName: key,
    platform: normalized.platform,
  };
  await db.insert(schema.sources).values(row).onConflictDoNothing();
  return (
    (await db.query.sources.findFirst({
      where: and(eq(schema.sources.orgId, orgId), eq(schema.sources.normalizedName, key)),
    })) ?? row
  );
}

export async function getOrCreateCampaign(orgId: string, sourceId: string | null, rawCampaign: string) {
  const name = normalizeWhitespace(rawCampaign);
  if (!name) return null;
  const key = normalizeKey(name);
  const existing = await db.query.campaigns.findFirst({
    where: and(eq(schema.campaigns.orgId, orgId), eq(schema.campaigns.normalizedName, key)),
  });
  if (existing) return existing;
  const row = { id: newId("cmp"), orgId, sourceId, name, normalizedName: key };
  await db.insert(schema.campaigns).values(row).onConflictDoNothing();
  return row;
}

// ---------------------------------------------------------------------------
// Import jobs
// ---------------------------------------------------------------------------

export async function createImportJob(input: {
  orgId: string;
  createdBy: string;
  fileName: string;
  fileType: "csv" | "xlsx";
  sheetName: string;
  headerRowIndex: number;
  rowCount: number;
}) {
  const id = newId("import");
  await db.insert(schema.importJobs).values({
    id,
    orgId: input.orgId,
    createdBy: input.createdBy,
    fileName: input.fileName,
    fileType: input.fileType,
    sheetName: input.sheetName,
    headerRowIndex: input.headerRowIndex,
    rowCount: input.rowCount,
    status: "parsing",
    progressJson: { stage: "parsing", processed: 0, total: input.rowCount },
  });
  return id;
}

export async function saveColumnMappings(importJobId: string, detections: ColumnDetection[]) {
  await db.delete(schema.columnMappings).where(eq(schema.columnMappings.importJobId, importJobId));
  if (detections.length === 0) return;
  await db.insert(schema.columnMappings).values(
    detections.map((d, i) => ({
      id: newId("colmap"),
      importJobId,
      sourceColumn: d.sourceColumn,
      sampleValuesJson: d.sampleValues,
      detectedField: d.detectedField,
      confidence: d.confidence,
      method: d.method,
      accepted: d.detectedField !== "unmapped",
      ignored: d.detectedField === "unmapped",
      sortOrder: i,
    }))
  );
  await db
    .update(schema.importJobs)
    .set({ status: "mapping_review" })
    .where(eq(schema.importJobs.id, importJobId));
}

export async function getImportJob(importJobId: string, orgId: string) {
  return db.query.importJobs.findFirst({
    where: and(eq(schema.importJobs.id, importJobId), eq(schema.importJobs.orgId, orgId)),
  });
}

export async function listImportJobs(orgId: string) {
  return db.query.importJobs.findMany({
    where: eq(schema.importJobs.orgId, orgId),
    orderBy: desc(schema.importJobs.createdAt),
  });
}

export async function getColumnMappings(importJobId: string) {
  return db.query.columnMappings.findMany({
    where: eq(schema.columnMappings.importJobId, importJobId),
    orderBy: schema.columnMappings.sortOrder,
  });
}

export async function updateColumnMapping(
  id: string,
  patch: Partial<{ detectedField: string; accepted: boolean; ignored: boolean }>
) {
  await db.update(schema.columnMappings).set(patch).where(eq(schema.columnMappings.id, id));
}

export async function updateImportJobProgress(
  importJobId: string,
  patch: Partial<{
    status: (typeof schema.importJobs.$inferInsert)["status"];
    progressJson: { stage: string; processed: number; total: number };
    statsJson: Record<string, number>;
    errorMessage: string | null;
    completedAt: Date;
  }>
) {
  await db.update(schema.importJobs).set(patch).where(eq(schema.importJobs.id, importJobId));
}

export async function deleteImportJob(importJobId: string, orgId: string) {
  await db
    .delete(schema.importJobs)
    .where(and(eq(schema.importJobs.id, importJobId), eq(schema.importJobs.orgId, orgId)));
}

// ---------------------------------------------------------------------------
// Import row processing — raw storage, normalization, identity resolution
// ---------------------------------------------------------------------------

export interface ImportRunResult {
  totalRows: number;
  uniqueCustomers: number;
  newCustomers: number;
  updatedCustomers: number;
  confirmedDuplicatesMerged: number;
  possibleDuplicateGroups: number;
  withPhone: number;
  withUsableIntent: number;
  withBudget: number;
  withLocation: number;
  withNotes: number;
  insufficientData: number;
}

/**
 * Runs the full import pipeline for one sheet: stores raw rows (never
 * mutated afterward), normalizes them deterministically, resolves customer
 * identity against both the batch itself and the org's existing customers,
 * and writes the normalized + timeline layers. AI note extraction is a
 * separate follow-up step (runAiEnrichmentForImport) so this stays fast and
 * fully functional with no AI key configured.
 */
/** Step 1, run at upload time (before the user reviews column mapping) — raw values are never touched again after this. */
export async function storeRawImportRows(importJobId: string, rows: Record<string, string>[]): Promise<string[]> {
  const rawRowIds = rows.map(() => newId("row"));
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((r, j) => ({
      id: rawRowIds[i + j],
      importJobId,
      rowIndex: i + j,
      rawJson: r,
      status: "pending" as const,
    }));
    await db.insert(schema.importedRows).values(chunk);
  }
  return rawRowIds;
}

export async function getRawImportRows(importJobId: string) {
  return db.query.importedRows.findMany({
    where: eq(schema.importedRows.importJobId, importJobId),
    orderBy: schema.importedRows.rowIndex,
  });
}

/**
 * Step 2 onward, run once the user confirms the column mapping. Reads the
 * raw rows already stored by storeRawImportRows (never re-parses the
 * original file), so nothing here can ever mutate a raw value.
 */
export async function runImportPipeline(
  orgId: string,
  importJobId: string,
  mappings: ColumnDetection[]
): Promise<ImportRunResult> {
  const acceptedMappings = mappings.filter((m) => m.detectedField !== "unmapped");

  const rawRows = await getRawImportRows(importJobId);
  const rows = rawRows.map((r) => r.rawJson);
  const rawRowIds = rawRows.map((r) => r.id);

  await updateImportJobProgress(importJobId, {
    status: "normalizing",
    progressJson: { stage: "normalizing", processed: 0, total: rows.length },
  });

  // 2. Deterministic normalization.
  const normalized: NormalizedRow[] = rows.map((r) => normalizeRow(r, acceptedMappings));

  // 3. Resolve source/campaign dictionary entries (small cardinality — sequential is fine).
  const sourceCache = new Map<string, Awaited<ReturnType<typeof getOrCreateSource>>>();
  const campaignCache = new Map<string, Awaited<ReturnType<typeof getOrCreateCampaign>>>();
  for (const n of normalized) {
    const skey = n.source.displayName || "unknown";
    if (!sourceCache.has(skey)) sourceCache.set(skey, await getOrCreateSource(orgId, n.source.original));
    if (n.campaignRaw) {
      const ckey = n.campaignRaw;
      if (!campaignCache.has(ckey)) {
        const source = sourceCache.get(skey)!;
        campaignCache.set(ckey, await getOrCreateCampaign(orgId, source.id, n.campaignRaw));
      }
    }
  }

  // 4. Identity resolution against existing org customers + within this batch.
  await updateImportJobProgress(importJobId, {
    status: "deduplicating",
    progressJson: { stage: "deduplicating", processed: 0, total: rows.length },
  });

  const existingCustomers = await db.query.customers.findMany({
    where: eq(schema.customers.orgId, orgId),
    columns: { id: true, name: true, normalizedPhone: true, normalizedEmail: true },
  });

  const candidates: IdentityCandidate[] = [
    ...existingCustomers.map((c) => ({
      id: `existing:${c.id}`,
      name: c.name,
      normalizedPhone: c.normalizedPhone,
      normalizedEmail: c.normalizedEmail,
    })),
    ...normalized.map((n, i) => ({
      id: `new:${i}`,
      name: n.name,
      normalizedPhone: n.normalizedPhone,
      normalizedEmail: n.normalizedEmail,
    })),
  ];

  const pairs = findDuplicateCandidates(candidates);
  const confirmed = pairs.filter((p) => p.confidenceLevel === "confirmed");
  const reviewable = pairs.filter((p) => p.confidenceLevel !== "confirmed");

  // Union confirmed pairs into merge groups.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const p of confirmed) union(p.aId, p.bId);

  const groups = new Map<string, string[]>();
  for (const c of candidates) {
    const root = find(c.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(c.id);
  }

  // Map each row index -> target customer id (existing or freshly created).
  const rowIndexToCustomerId = new Map<number, string>();
  const newCustomerIds: string[] = [];
  let confirmedDuplicatesMerged = 0;

  for (const members of groups.values()) {
    const existingIds = members.filter((m) => m.startsWith("existing:")).map((m) => m.slice("existing:".length));
    const newIndexes = members
      .filter((m) => m.startsWith("new:"))
      .map((m) => parseInt(m.slice("new:".length), 10));

    let targetId: string;
    if (existingIds.length > 0) {
      targetId = existingIds[0];
      confirmedDuplicatesMerged += newIndexes.length + Math.max(0, existingIds.length - 1);
    } else {
      targetId = newId("cust");
      newCustomerIds.push(targetId);
      confirmedDuplicatesMerged += Math.max(0, newIndexes.length - 1);
    }
    for (const idx of newIndexes) rowIndexToCustomerId.set(idx, targetId);
  }

  // 5. Write customers, identities, source records, interactions, preferences.
  await updateImportJobProgress(importJobId, {
    status: "normalizing",
    progressJson: { stage: "writing customer records", processed: 0, total: rows.length },
  });

  const newCustomerIdSet = new Set(newCustomerIds);
  let updatedExistingCount = 0;
  let processed = 0;

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    const customerId = rowIndexToCustomerId.get(i)!;
    const isNew = newCustomerIdSet.has(customerId);
    const leadDate = n.leadCreatedDate ?? new Date();

    if (isNew) {
      await db
        .insert(schema.customers)
        .values({
          id: customerId,
          orgId,
          name: n.name,
          phone: n.rawPhone,
          normalizedPhone: n.normalizedPhone,
          email: n.email,
          normalizedEmail: n.normalizedEmail,
          nationality: n.nationality,
          status: inferCustomerStatus(n),
          doNotContact: /do not contact|opted out|dnc/i.test(n.previousStatus + " " + n.agentNotes),
          firstSeenAt: leadDate,
          latestSeenAt: leadDate,
        })
        .onConflictDoNothing();
      newCustomerIdSet.delete(customerId); // subsequent rows in the same group are treated as updates
    } else {
      updatedExistingCount++;
      await db
        .update(schema.customers)
        .set({
          name: rawSql`CASE WHEN ${schema.customers.name} = '' THEN ${n.name} ELSE ${schema.customers.name} END`,
          phone: n.rawPhone ? n.rawPhone : rawSql`${schema.customers.phone}`,
          normalizedPhone: n.normalizedPhone ? n.normalizedPhone : rawSql`${schema.customers.normalizedPhone}`,
          email: n.email ? n.email : rawSql`${schema.customers.email}`,
          normalizedEmail: n.normalizedEmail ? n.normalizedEmail : rawSql`${schema.customers.normalizedEmail}`,
          latestSeenAt: leadDate,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, customerId));
    }

    // Identities (dedup within customer).
    if (n.normalizedPhone) {
      await upsertIdentity(customerId, "phone", n.rawPhone, n.normalizedPhone);
    }
    if (n.normalizedEmail) {
      await upsertIdentity(customerId, "email", n.email, n.normalizedEmail);
    }

    // Source record.
    const source = sourceCache.get(n.source.displayName || "unknown");
    const campaign = n.campaignRaw ? campaignCache.get(n.campaignRaw) : null;
    await db.insert(schema.customerSourceRecords).values({
      id: newId("srcrec"),
      customerId,
      importJobId,
      importedRowId: rawRowIds[i],
      sourceId: source?.id ?? null,
      campaignId: campaign?.id ?? null,
      rawSourceText: n.source.original,
      rawCampaignText: n.campaignRaw,
      leadDate,
    });

    // Timeline entry.
    await db.insert(schema.customerInteractions).values({
      id: newId("interaction"),
      customerId,
      occurredAt: leadDate,
      channel: "import",
      summary: buildInteractionSummary(n),
      rawNote: n.agentNotes,
      projectMentioned: n.interestedProjects[0] ?? "",
    });

    // Normalized preferences layer — last-write-wins on scalars, union on arrays.
    await upsertPreferences(customerId, n);

    // Link the raw row back to its resolved customer.
    await db
      .update(schema.importedRows)
      .set({ status: "normalized", customerId })
      .where(eq(schema.importedRows.id, rawRowIds[i]));

    processed++;
    if (processed % 200 === 0) {
      await updateImportJobProgress(importJobId, {
        progressJson: { stage: "writing customer records", processed, total: rows.length },
      });
    }
  }

  // 6. Store reviewable (probable/possible) duplicate candidates.
  let possibleDuplicateGroups = 0;
  for (const p of reviewable) {
    const aCustomerId = resolveCandidateId(p.aId, rowIndexToCustomerId);
    const bCustomerId = resolveCandidateId(p.bId, rowIndexToCustomerId);
    if (!aCustomerId || !bCustomerId || aCustomerId === bCustomerId) continue;
    await db.insert(schema.duplicateCandidates).values({
      id: newId("dupe"),
      orgId,
      customerAId: aCustomerId,
      customerBId: bCustomerId,
      matchType: p.matchType,
      confidenceLevel: p.confidenceLevel,
      score: p.score,
    });
    possibleDuplicateGroups++;
  }

  // 7. Stats.
  const stats: ImportRunResult = {
    totalRows: rows.length,
    uniqueCustomers: new Set(rowIndexToCustomerId.values()).size,
    newCustomers: newCustomerIds.length,
    updatedCustomers: updatedExistingCount,
    confirmedDuplicatesMerged,
    possibleDuplicateGroups,
    withPhone: normalized.filter((n) => n.normalizedPhone).length,
    withUsableIntent: normalized.filter(
      (n) => n.budget.min || n.budget.max || n.preferredLocations.length || n.bedrooms.length
    ).length,
    withBudget: normalized.filter((n) => n.budget.min !== null || n.budget.max !== null).length,
    withLocation: normalized.filter((n) => n.preferredLocations.length > 0).length,
    withNotes: normalized.filter((n) => n.agentNotes.trim().length > 10).length,
    insufficientData: normalized.filter(
      (n) => !n.normalizedPhone && !n.email && !n.budget.min && !n.budget.max && n.preferredLocations.length === 0
    ).length,
  };

  await updateImportJobProgress(importJobId, {
    status: "completed",
    statsJson: stats as unknown as Record<string, number>,
    progressJson: { stage: "completed", processed: rows.length, total: rows.length },
    completedAt: new Date(),
  });

  return stats;
}

function resolveCandidateId(id: string, rowIndexToCustomerId: Map<number, string>): string | null {
  if (id.startsWith("existing:")) return id.slice("existing:".length);
  if (id.startsWith("new:")) return rowIndexToCustomerId.get(parseInt(id.slice("new:".length), 10)) ?? null;
  return null;
}

function inferCustomerStatus(n: NormalizedRow): (typeof schema.customers.$inferInsert)["status"] {
  const text = (n.previousStatus + " " + n.agentNotes).toLowerCase();
  if (/invalid|spam|wrong number/.test(text)) return "invalid";
  if (/do not contact|opted out|dnc/.test(text)) return "do_not_contact";
  if (/\bwon\b|purchased|booked/.test(text)) return "won";
  if (/lost/.test(text)) return "lost";
  if (n.lastContactedDate || n.agentNotes) return "contacted";
  return "new";
}

function buildInteractionSummary(n: NormalizedRow): string {
  const parts: string[] = [];
  if (n.source.displayName) parts.push(`${n.source.displayName} lead`);
  if (n.interestedProjects[0]) parts.push(`interested in ${n.interestedProjects[0]}`);
  if (n.budget.min || n.budget.max) {
    parts.push(`budget ${n.budget.currency ?? "AED"} ${(n.budget.max ?? n.budget.min)?.toLocaleString()}`);
  }
  return parts.join(", ") || "Imported record";
}

async function upsertIdentity(customerId: string, type: "phone" | "email", value: string, normalizedValue: string) {
  if (!normalizedValue) return;
  const existing = await db.query.customerIdentities.findFirst({
    where: and(
      eq(schema.customerIdentities.customerId, customerId),
      eq(schema.customerIdentities.type, type),
      eq(schema.customerIdentities.normalizedValue, normalizedValue)
    ),
  });
  if (existing) return;
  const isFirst = !(await db.query.customerIdentities.findFirst({
    where: and(eq(schema.customerIdentities.customerId, customerId), eq(schema.customerIdentities.type, type)),
  }));
  await db.insert(schema.customerIdentities).values({
    id: newId("ident"),
    customerId,
    type,
    value,
    normalizedValue,
    isPrimary: isFirst,
  });
}

async function upsertPreferences(customerId: string, n: NormalizedRow) {
  const existing = await db.query.customerPreferences.findFirst({
    where: eq(schema.customerPreferences.customerId, customerId),
  });

  const merged = {
    budgetMin: n.budget.min ?? existing?.budgetMin ?? null,
    budgetMax: n.budget.max ?? existing?.budgetMax ?? null,
    budgetCurrency: n.budget.currency ?? existing?.budgetCurrency ?? "AED",
    preferredLocations: mergeArrays(existing?.preferredLocations, n.preferredLocations),
    interestedProjects: mergeArrays(existing?.interestedProjects, n.interestedProjects),
    preferredDevelopers: mergeArrays(existing?.preferredDevelopers, n.preferredDevelopers),
    bedrooms: mergeArrays(existing?.bedrooms, n.bedrooms),
    propertyTypes: mergeArrays(existing?.propertyTypes, n.propertyTypes),
    purpose: n.purpose !== "unclear" ? n.purpose : existing?.purpose ?? "unclear",
    purchaseTimeline: n.purchaseTimeline || existing?.purchaseTimeline || "",
    paymentPlanPreference: n.paymentPlanPreference || existing?.paymentPlanPreference || "",
    readyOrOffplanPreference:
      n.readyOrOffplanPreference !== "either" ? n.readyOrOffplanPreference : existing?.readyOrOffplanPreference ?? "either",
    purchaseReadiness: n.purchaseReadiness !== "unknown" ? n.purchaseReadiness : existing?.purchaseReadiness ?? "unknown",
    previousStatus: n.previousStatus || existing?.previousStatus || "",
    lostReason: n.lostReason || existing?.lostReason || "",
    lastContactedAt: n.lastContactedDate ?? existing?.lastContactedAt ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(schema.customerPreferences).set(merged).where(eq(schema.customerPreferences.customerId, customerId));
  } else {
    await db.insert(schema.customerPreferences).values({ id: newId("pref"), customerId, ...merged });
  }
}

function mergeArrays(existing: string[] | undefined, fresh: string[]): string[] {
  return Array.from(new Set([...(existing ?? []), ...fresh].filter(Boolean)));
}

// ---------------------------------------------------------------------------
// Customers — read APIs
// ---------------------------------------------------------------------------

export async function getCustomerDetail(customerId: string, orgId: string) {
  const customer = await db.query.customers.findFirst({
    where: and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId)),
  });
  if (!customer) return null;

  const [preferences, inferences, interactions, sourceRecords] = await Promise.all([
    db.query.customerPreferences.findFirst({ where: eq(schema.customerPreferences.customerId, customerId) }),
    db.query.customerInferences.findFirst({ where: eq(schema.customerInferences.customerId, customerId) }),
    db.query.customerInteractions.findMany({
      where: eq(schema.customerInteractions.customerId, customerId),
      orderBy: desc(schema.customerInteractions.occurredAt),
    }),
    db.query.customerSourceRecords.findMany({ where: eq(schema.customerSourceRecords.customerId, customerId) }),
  ]);

  return { customer, preferences, inferences, interactions, sourceRecords };
}

export async function listCustomers(
  orgId: string,
  opts: { search?: string; limit?: number; offset?: number } = {}
) {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const whereClauses = [eq(schema.customers.orgId, orgId)];
  const rows = await db.query.customers.findMany({
    where: and(...whereClauses),
    orderBy: desc(schema.customers.latestSeenAt),
    limit,
    offset,
  });
  if (!opts.search) return rows;
  const q = opts.search.toLowerCase();
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.normalizedPhone.includes(q)
  );
}

export async function countCustomers(orgId: string) {
  const [row] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(schema.customers)
    .where(eq(schema.customers.orgId, orgId));
  return row?.count ?? 0;
}

export async function getPendingDuplicateCandidates(orgId: string) {
  return db.query.duplicateCandidates.findMany({
    where: and(eq(schema.duplicateCandidates.orgId, orgId), eq(schema.duplicateCandidates.status, "pending")),
    orderBy: desc(schema.duplicateCandidates.score),
  });
}

export async function resolveDuplicateCandidate(id: string, orgId: string, action: "merge" | "reject") {
  const candidate = await db.query.duplicateCandidates.findFirst({
    where: and(eq(schema.duplicateCandidates.id, id), eq(schema.duplicateCandidates.orgId, orgId)),
  });
  if (!candidate) return;

  if (action === "merge") {
    await mergeCustomers(candidate.customerAId, candidate.customerBId, orgId);
  }
  await db
    .update(schema.duplicateCandidates)
    .set({ status: action === "merge" ? "merged" : "rejected", resolvedAt: new Date() })
    .where(eq(schema.duplicateCandidates.id, id));
}

/** Merges customer B into customer A, preserving B's full history under A. */
export async function mergeCustomers(keepId: string, mergeId: string, orgId: string) {
  if (keepId === mergeId) return;
  await db
    .update(schema.customerIdentities)
    .set({ customerId: keepId, isPrimary: false })
    .where(eq(schema.customerIdentities.customerId, mergeId));
  await db
    .update(schema.customerSourceRecords)
    .set({ customerId: keepId })
    .where(eq(schema.customerSourceRecords.customerId, mergeId));
  await db
    .update(schema.customerInteractions)
    .set({ customerId: keepId })
    .where(eq(schema.customerInteractions.customerId, mergeId));

  const [prefA, prefB, mergeCustomer] = await Promise.all([
    db.query.customerPreferences.findFirst({ where: eq(schema.customerPreferences.customerId, keepId) }),
    db.query.customerPreferences.findFirst({ where: eq(schema.customerPreferences.customerId, mergeId) }),
    db.query.customers.findFirst({ where: eq(schema.customers.id, mergeId) }),
  ]);
  if (prefB) {
    if (prefA) {
      await db
        .update(schema.customerPreferences)
        .set({
          budgetMin: prefA.budgetMin ?? prefB.budgetMin,
          budgetMax: prefA.budgetMax ?? prefB.budgetMax,
          preferredLocations: mergeArrays(prefA.preferredLocations, prefB.preferredLocations),
          interestedProjects: mergeArrays(prefA.interestedProjects, prefB.interestedProjects),
          preferredDevelopers: mergeArrays(prefA.preferredDevelopers, prefB.preferredDevelopers),
          bedrooms: mergeArrays(prefA.bedrooms, prefB.bedrooms),
          propertyTypes: mergeArrays(prefA.propertyTypes, prefB.propertyTypes),
        })
        .where(eq(schema.customerPreferences.customerId, keepId));
    } else {
      await db.insert(schema.customerPreferences).values({ ...prefB, id: newId("pref"), customerId: keepId });
    }
    await db.delete(schema.customerPreferences).where(eq(schema.customerPreferences.customerId, mergeId));
  }

  if (mergeCustomer) {
    await db
      .update(schema.customers)
      .set({
        latestSeenAt: mergeCustomer.latestSeenAt,
      })
      .where(eq(schema.customers.id, keepId));
  }

  await db.delete(schema.customerInferences).where(eq(schema.customerInferences.customerId, mergeId));
  await db.delete(schema.customers).where(and(eq(schema.customers.id, mergeId), eq(schema.customers.orgId, orgId)));
  await logAudit({ orgId, action: "customer.merged", entityType: "customer", entityId: keepId, metadata: { mergedId: mergeId } });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function listProjects(orgId: string) {
  return db.query.projects.findMany({
    where: eq(schema.projects.orgId, orgId),
    orderBy: desc(schema.projects.createdAt),
  });
}

export async function getProjectDetail(projectId: string, orgId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)),
  });
  if (!project) return null;
  const [unitTypes, features, profile] = await Promise.all([
    db.query.projectUnitTypes.findMany({ where: eq(schema.projectUnitTypes.projectId, projectId) }),
    db.query.projectFeatures.findMany({ where: eq(schema.projectFeatures.projectId, projectId) }),
    db.query.projectProfiles.findFirst({ where: eq(schema.projectProfiles.projectId, projectId) }),
  ]);
  return { project, unitTypes, features, profile };
}

export async function countCustomersForOrg(orgId: string) {
  return countCustomers(orgId);
}

// ---------------------------------------------------------------------------
// Dashboard aggregate stats (spec section 1)
// ---------------------------------------------------------------------------

export async function getDashboardStats(orgId: string) {
  const [totalLeadsRow] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(schema.importedRows)
    .innerJoin(schema.importJobs, eq(schema.importJobs.id, schema.importedRows.importJobId))
    .where(eq(schema.importJobs.orgId, orgId));

  const [uniqueCustomersRow] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(schema.customers)
    .where(eq(schema.customers.orgId, orgId));

  const [duplicatesMergedRow] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(schema.duplicateCandidates)
    .where(and(eq(schema.duplicateCandidates.orgId, orgId), eq(schema.duplicateCandidates.status, "merged")));

  const [usableIntentRow] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(schema.customerPreferences)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.customerPreferences.customerId))
    .where(
      and(
        eq(schema.customers.orgId, orgId),
        rawSql`(${schema.customerPreferences.budgetMin} is not null or ${schema.customerPreferences.budgetMax} is not null or jsonb_array_length(${schema.customerPreferences.preferredLocations}) > 0)`
      )
    );

  const [projectsRow] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(schema.projects)
    .where(eq(schema.projects.orgId, orgId));

  const [highMatchRow] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(schema.projectMatches)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.projectMatches.projectId))
    .where(and(eq(schema.projects.orgId, orgId), inArray(schema.projectMatches.bucket, ["hot", "warm"])));

  const recentProjects = await db.query.projects.findMany({
    where: eq(schema.projects.orgId, orgId),
    orderBy: desc(schema.projects.updatedAt),
    limit: 5,
  });

  return {
    totalLeadsImported: totalLeadsRow?.count ?? 0,
    uniqueCustomers: uniqueCustomersRow?.count ?? 0,
    duplicatesMerged: duplicatesMergedRow?.count ?? 0,
    usableBuyerIntent: usableIntentRow?.count ?? 0,
    projectsAnalyzed: projectsRow?.count ?? 0,
    highMatchOpportunities: highMatchRow?.count ?? 0,
    recentProjects,
  };
}
