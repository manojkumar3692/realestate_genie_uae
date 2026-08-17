import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db, sql } from "./client";
import {
  comparableProjects,
  financialAssumptions,
  firmSettings,
  generatedReports,
  paymentMilestones,
  projectDirectory,
  projects,
  unitTypes,
} from "./schema";
import type {
  ComparableProjectInput,
  FinancialAssumptionsInput,
  FirmSettingsInput,
  PaymentMilestoneInput,
  ProjectBundle,
  ProjectDirectoryMatch,
  ProjectInput,
  UnitTypeInput,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Firm settings (singleton)                                                  */
/* -------------------------------------------------------------------------- */

export async function getFirmSettings(): Promise<FirmSettingsInput> {
  const rows = await db.select().from(firmSettings).where(eq(firmSettings.id, 1)).limit(1);
  if (rows[0]) return rows[0] as unknown as FirmSettingsInput;

  await db.insert(firmSettings).values({ id: 1 }).onConflictDoNothing();
  const created = await db.select().from(firmSettings).where(eq(firmSettings.id, 1)).limit(1);
  return created[0] as unknown as FirmSettingsInput;
}

export async function updateFirmSettings(input: Partial<FirmSettingsInput>) {
  await getFirmSettings(); // ensure row exists
  await db
    .update(firmSettings)
    .set({ ...input, updatedAt: new Date().toISOString() } as any)
    .where(eq(firmSettings.id, 1));
  return getFirmSettings();
}

/* -------------------------------------------------------------------------- */
/* Project list (dashboard)                                                   */
/* -------------------------------------------------------------------------- */

export interface ProjectSummary {
  id: string;
  name: string;
  developer: string;
  area: string;
  status: string;
  currency: string;
  updatedAt: string;
  unitTypeCount: number;
  priceFrom: number | null;
  priceTo: number | null;
  reportCount: number;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = await sql<ProjectSummary[]>`
    SELECT
      p.id, p.name, p.developer, p.area, p.status, p.currency, p.updated_at as "updatedAt",
      (SELECT COUNT(*)::int FROM unit_types u WHERE u.project_id = p.id) as "unitTypeCount",
      (SELECT MIN(price_from) FROM unit_types u WHERE u.project_id = p.id AND u.price_from > 0) as "priceFrom",
      (SELECT MAX(price_to) FROM unit_types u WHERE u.project_id = p.id) as "priceTo",
      (SELECT COUNT(*)::int FROM generated_reports r WHERE r.project_id = p.id) as "reportCount"
    FROM projects p
    ORDER BY p.updated_at DESC
  `;
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Create / delete                                                            */
/* -------------------------------------------------------------------------- */

export async function createDraftProject(name: string = "Untitled Project"): Promise<string> {
  await assertProjectNameAvailable(name, "");
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(projects).values({ id, name, createdAt: now, updatedAt: now });
  await db.insert(financialAssumptions).values({ id: randomUUID(), projectId: id });
  return id;
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
}

/* -------------------------------------------------------------------------- */
/* Full bundle read                                                           */
/* -------------------------------------------------------------------------- */

export async function getProjectBundle(id: string): Promise<ProjectBundle | null> {
  const projectRows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  const project = projectRows[0];
  if (!project) return null;

  const [units, milestones, comparables, financialsRows, firm] = await Promise.all([
    db.select().from(unitTypes).where(eq(unitTypes.projectId, id)).orderBy(unitTypes.sortOrder),
    db.select().from(paymentMilestones).where(eq(paymentMilestones.projectId, id)).orderBy(paymentMilestones.sortOrder),
    db.select().from(comparableProjects).where(eq(comparableProjects.projectId, id)).orderBy(comparableProjects.sortOrder),
    db.select().from(financialAssumptions).where(eq(financialAssumptions.projectId, id)).limit(1),
    getFirmSettings(),
  ]);

  let financials = financialsRows[0];
  if (!financials) {
    await db.insert(financialAssumptions).values({ id: randomUUID(), projectId: id });
    const refreshed = await db.select().from(financialAssumptions).where(eq(financialAssumptions.projectId, id)).limit(1);
    financials = refreshed[0];
  }

  return {
    project: {
      ...project,
      amenities: safeParseArray(project.amenities),
    } as unknown as ProjectInput,
    unitTypes: units as unknown as UnitTypeInput[],
    paymentMilestones: milestones as unknown as PaymentMilestoneInput[],
    comparableProjects: comparables.map((c) => ({
      ...c,
      priceHistory: safeParseArray(c.priceHistory),
    })) as unknown as ComparableProjectInput[],
    financials: financials as unknown as FinancialAssumptionsInput,
    firm,
  };
}

/* -------------------------------------------------------------------------- */
/* Full bundle write (atomic replace of child collections)                    */
/* -------------------------------------------------------------------------- */

export interface ProjectBundleWriteInput {
  project: Omit<ProjectInput, "id"> & { id?: string };
  unitTypes: (Omit<UnitTypeInput, "id" | "projectId"> & { id?: string })[];
  paymentMilestones: (Omit<PaymentMilestoneInput, "id" | "projectId"> & { id?: string })[];
  comparableProjects: (Omit<ComparableProjectInput, "id" | "projectId"> & { id?: string })[];
  financials: Omit<FinancialAssumptionsInput, "id" | "projectId">;
}

export async function saveProjectBundle(id: string, input: ProjectBundleWriteInput) {
  await assertProjectNameAvailable(input.project.name, id);
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        name: input.project.name,
        developer: input.project.developer,
        area: input.project.area,
        subLocation: input.project.subLocation,
        description: input.project.description,
        status: input.project.status,
        reraNumber: input.project.reraNumber,
        escrowBank: input.project.escrowBank,
        handoverDate: input.project.handoverDate,
        launchDate: input.project.launchDate,
        totalUnits: input.project.totalUnits,
        amenities: JSON.stringify(input.project.amenities ?? []),
        heroImageDataUrl: input.project.heroImageDataUrl,
        currency: input.project.currency,
        goldenVisaEligible: input.project.goldenVisaEligible,
        updatedAt: now,
      })
      .where(eq(projects.id, id));

    await tx.delete(unitTypes).where(eq(unitTypes.projectId, id));
    if (input.unitTypes.length) {
      await tx.insert(unitTypes).values(
        input.unitTypes.map((u, idx) => ({ ...u, id: randomUUID(), projectId: id, sortOrder: idx }))
      );
    }

    await tx.delete(paymentMilestones).where(eq(paymentMilestones.projectId, id));
    if (input.paymentMilestones.length) {
      await tx.insert(paymentMilestones).values(
        input.paymentMilestones.map((m, idx) => ({ ...m, id: randomUUID(), projectId: id, sortOrder: idx }))
      );
    }

    await tx.delete(comparableProjects).where(eq(comparableProjects.projectId, id));
    if (input.comparableProjects.length) {
      await tx.insert(comparableProjects).values(
        input.comparableProjects.map((c, idx) => ({
          ...c,
          id: randomUUID(),
          projectId: id,
          priceHistory: JSON.stringify(c.priceHistory ?? []),
          sortOrder: idx,
        }))
      );
    }

    const existingFinancials = await tx
      .select()
      .from(financialAssumptions)
      .where(eq(financialAssumptions.projectId, id))
      .limit(1);

    if (existingFinancials[0]) {
      await tx.update(financialAssumptions).set(input.financials).where(eq(financialAssumptions.projectId, id));
    } else {
      await tx.insert(financialAssumptions).values({ ...input.financials, id: randomUUID(), projectId: id });
    }
  });

  const bundle = (await getProjectBundle(id))!;

  // Grow the shared project directory from this save. Never let this block
  // or fail the actual save — it's a nice-to-have, not core to the product.
  upsertProjectDirectoryFromBundle(bundle).catch((err) => {
    console.error("Failed to upsert project directory entry:", err);
  });

  return bundle;
}

/* -------------------------------------------------------------------------- */
/* Project directory (shared, growing library of project facts)               */
/* -------------------------------------------------------------------------- */

function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Thrown when a save/create would leave two projects with the same name.
 * Routes catch this and turn it into a 409 with a user-facing message.
 */
export class DuplicateProjectNameError extends Error {}

const UNTITLED_PROJECT_NORMALIZED = normalizeProjectName("Untitled Project");

/**
 * Enforces one global rule: no two projects share a name (case/whitespace
 * insensitive). There's no agent/user concept in the schema yet (see the
 * "no auth/multi-tenant yet" note on firmSettings above), so this is scoped
 * across every project in the system for now — revisit per-agent scoping
 * once accounts exist.
 *
 * Deliberately skips blank names and the "Untitled Project" placeholder, so
 * agents can still have multiple fresh, not-yet-named drafts in flight —
 * the constraint only kicks in once a project actually has a real name.
 */
async function assertProjectNameAvailable(name: string, excludeProjectId: string) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return;
  const normalized = normalizeProjectName(trimmed);
  if (normalized === UNTITLED_PROJECT_NORMALIZED) return;

  const rows = await db.select({ id: projects.id, name: projects.name }).from(projects);
  const clash = rows.find((r) => r.id !== excludeProjectId && normalizeProjectName(r.name) === normalized);
  if (clash) {
    throw new DuplicateProjectNameError(
      `You already have a project named "${trimmed}". Use the magic wand on the name field to reuse it, or choose a different name.`
    );
  }
}

async function upsertProjectDirectoryFromBundle(bundle: ProjectBundle) {
  const name = bundle.project.name?.trim();
  if (!name) return; // skip untitled/blank projects — nothing useful to store
  const nameNormalized = normalizeProjectName(name);
  const now = new Date().toISOString();

  const unitTypesJson = JSON.stringify(
    bundle.unitTypes.map((u) => ({
      typeLabel: u.typeLabel,
      sizeSqftMin: u.sizeSqftMin,
      sizeSqftMax: u.sizeSqftMax,
      priceFrom: u.priceFrom,
      priceTo: u.priceTo,
      representativePrice: u.representativePrice,
      serviceChargePerSqft: u.serviceChargePerSqft,
    }))
  );
  const comparableProjectsJson = JSON.stringify(
    bundle.comparableProjects.map((c) => ({
      name: c.name,
      area: c.area,
      distanceKm: c.distanceKm,
      priceHistory: c.priceHistory,
      notes: c.notes,
    }))
  );

  const values = {
    name,
    developer: bundle.project.developer,
    area: bundle.project.area,
    subLocation: bundle.project.subLocation,
    description: bundle.project.description,
    status: bundle.project.status,
    reraNumber: bundle.project.reraNumber,
    escrowBank: bundle.project.escrowBank,
    handoverDate: bundle.project.handoverDate,
    launchDate: bundle.project.launchDate,
    totalUnits: bundle.project.totalUnits,
    amenities: JSON.stringify(bundle.project.amenities ?? []),
    currency: bundle.project.currency,
    goldenVisaEligible: bundle.project.goldenVisaEligible,
    unitTypesJson,
    comparableProjectsJson,
    updatedAt: now,
  };

  await db
    .insert(projectDirectory)
    .values({ id: randomUUID(), nameNormalized, createdAt: now, heroImageDataUrl: bundle.project.heroImageDataUrl, ...values })
    .onConflictDoUpdate({ target: projectDirectory.nameNormalized, set: values });

  // Hero image handled separately from the rest of `values`: only ever set it
  // when this save actually has one, so a later save that doesn't touch the
  // image (or was made before an image existed) never blanks out a good one
  // a previous agent already contributed.
  if (bundle.project.heroImageDataUrl) {
    await sql`UPDATE project_directory SET hero_image_data_url = ${bundle.project.heroImageDataUrl} WHERE name_normalized = ${nameNormalized}`;
  }
}

/**
 * Looks up the project directory for a name an agent just typed. Tries an
 * exact normalized match first, then falls back to a partial match in either
 * direction (typed name is a substring of a stored name, or vice versa) so
 * "Marina Horizon" still finds "Marina Horizon Residences". Increments the
 * matched entry's usage count. Returns null if nothing matches.
 */
interface ProjectDirectoryRow {
  id: string;
  name: string;
  developer: string;
  area: string;
  sub_location: string;
  description: string;
  status: ProjectInput["status"];
  rera_number: string;
  escrow_bank: string;
  handover_date: string | null;
  launch_date: string | null;
  total_units: number | null;
  amenities: string;
  currency: string;
  golden_visa_eligible: boolean;
  hero_image_data_url: string | null;
  unit_types_json: string;
  comparable_projects_json: string;
  updated_at: string;
}

function mapDirectoryRow(row: ProjectDirectoryRow): ProjectDirectoryMatch {
  return {
    name: row.name,
    developer: row.developer,
    area: row.area,
    subLocation: row.sub_location,
    description: row.description,
    status: row.status,
    reraNumber: row.rera_number,
    escrowBank: row.escrow_bank,
    handoverDate: row.handover_date,
    launchDate: row.launch_date,
    totalUnits: row.total_units,
    amenities: safeParseArray(row.amenities),
    currency: row.currency,
    goldenVisaEligible: row.golden_visa_eligible,
    heroImageDataUrl: row.hero_image_data_url,
    unitTypes: safeParseArray(row.unit_types_json),
    comparableProjects: safeParseArray(row.comparable_projects_json),
    updatedAt: row.updated_at,
  };
}

export async function lookupProjectDirectory(name: string): Promise<ProjectDirectoryMatch | null> {
  const normalized = normalizeProjectName(name);
  if (!normalized) return null;

  const rows = await sql<ProjectDirectoryRow[]>`
    SELECT * FROM project_directory
    WHERE name_normalized = ${normalized}
       OR name_normalized ILIKE ${"%" + normalized + "%"}
       OR ${normalized} ILIKE ('%' || name_normalized || '%')
    ORDER BY
      (name_normalized = ${normalized}) DESC,
      times_used DESC,
      updated_at DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  await sql`UPDATE project_directory SET times_used = times_used + 1 WHERE id = ${row.id}`;

  return mapDirectoryRow(row);
}

/**
 * Like lookupProjectDirectory, but returns up to `limit` candidate matches
 * instead of silently picking the single "best" one — used to populate the
 * magic-wand dropdown so the agent can see all similarly-named projects and
 * pick the one they actually mean. Doesn't bump times_used itself; that
 * happens when the agent commits to a pick (via the exact-match lookup
 * above), so browsing the list doesn't skew the popularity ranking.
 */
export async function lookupProjectDirectorySuggestions(
  name: string,
  limit = 6
): Promise<ProjectDirectoryMatch[]> {
  const normalized = normalizeProjectName(name);
  if (!normalized) return [];

  const rows = await sql<ProjectDirectoryRow[]>`
    SELECT * FROM project_directory
    WHERE name_normalized ILIKE ${"%" + normalized + "%"}
       OR ${normalized} ILIKE ('%' || name_normalized || '%')
    ORDER BY
      (name_normalized = ${normalized}) DESC,
      times_used DESC,
      updated_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapDirectoryRow);
}

/* -------------------------------------------------------------------------- */
/* Generated reports                                                          */
/* -------------------------------------------------------------------------- */

export async function insertGeneratedReport(input: {
  projectId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  focusUnitTypeId: string | null;
  snapshotJson: string;
  pdfFileName: string;
}) {
  const id = randomUUID();
  await db.insert(generatedReports).values({ id, ...input });
  return id;
}

export async function listReportsForProject(projectId: string) {
  return db
    .select()
    .from(generatedReports)
    .where(eq(generatedReports.projectId, projectId))
    .orderBy(desc(generatedReports.createdAt));
}

export async function getReportById(id: string) {
  const rows = await db.select().from(generatedReports).where(eq(generatedReports.id, id)).limit(1);
  return rows[0] ?? null;
}

function safeParseArray(value: string | null | undefined): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
