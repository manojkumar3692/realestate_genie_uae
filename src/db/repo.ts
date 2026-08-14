import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db, sql } from "./client";
import {
  comparableProjects,
  financialAssumptions,
  firmSettings,
  generatedReports,
  paymentMilestones,
  projects,
  unitTypes,
} from "./schema";
import type {
  ComparableProjectInput,
  FinancialAssumptionsInput,
  FirmSettingsInput,
  PaymentMilestoneInput,
  ProjectBundle,
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

  return (await getProjectBundle(id))!;
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
