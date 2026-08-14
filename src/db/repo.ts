import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, sqlite } from "./client";
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

export function getFirmSettings(): FirmSettingsInput {
  const row = db.select().from(firmSettings).where(eq(firmSettings.id, 1)).get();
  if (row) return row as unknown as FirmSettingsInput;

  db.insert(firmSettings).values({ id: 1 }).run();
  const created = db.select().from(firmSettings).where(eq(firmSettings.id, 1)).get()!;
  return created as unknown as FirmSettingsInput;
}

export function updateFirmSettings(input: Partial<FirmSettingsInput>) {
  getFirmSettings(); // ensure row exists
  db.update(firmSettings)
    .set({ ...input, updatedAt: new Date().toISOString() } as any)
    .where(eq(firmSettings.id, 1))
    .run();
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

export function listProjects(): ProjectSummary[] {
  const rows = sqlite
    .prepare(
      `SELECT
        p.id, p.name, p.developer, p.area, p.status, p.currency, p.updated_at as updatedAt,
        (SELECT COUNT(*) FROM unit_types u WHERE u.project_id = p.id) as unitTypeCount,
        (SELECT MIN(price_from) FROM unit_types u WHERE u.project_id = p.id AND u.price_from > 0) as priceFrom,
        (SELECT MAX(price_to) FROM unit_types u WHERE u.project_id = p.id) as priceTo,
        (SELECT COUNT(*) FROM generated_reports r WHERE r.project_id = p.id) as reportCount
      FROM projects p
      ORDER BY p.updated_at DESC`
    )
    .all();
  return rows as ProjectSummary[];
}

/* -------------------------------------------------------------------------- */
/* Create / delete                                                            */
/* -------------------------------------------------------------------------- */

export function createDraftProject(name: string = "Untitled Project"): string {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(projects)
    .values({ id, name, createdAt: now, updatedAt: now })
    .run();
  db.insert(financialAssumptions)
    .values({ id: randomUUID(), projectId: id })
    .run();
  return id;
}

export function deleteProject(id: string) {
  db.delete(projects).where(eq(projects.id, id)).run();
}

/* -------------------------------------------------------------------------- */
/* Full bundle read                                                           */
/* -------------------------------------------------------------------------- */

export function getProjectBundle(id: string): ProjectBundle | null {
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return null;

  const units = db
    .select()
    .from(unitTypes)
    .where(eq(unitTypes.projectId, id))
    .orderBy(unitTypes.sortOrder)
    .all();

  const milestones = db
    .select()
    .from(paymentMilestones)
    .where(eq(paymentMilestones.projectId, id))
    .orderBy(paymentMilestones.sortOrder)
    .all();

  const comparables = db
    .select()
    .from(comparableProjects)
    .where(eq(comparableProjects.projectId, id))
    .orderBy(comparableProjects.sortOrder)
    .all();

  let financials = db
    .select()
    .from(financialAssumptions)
    .where(eq(financialAssumptions.projectId, id))
    .get();

  if (!financials) {
    db.insert(financialAssumptions).values({ id: randomUUID(), projectId: id }).run();
    financials = db
      .select()
      .from(financialAssumptions)
      .where(eq(financialAssumptions.projectId, id))
      .get();
  }

  const firm = getFirmSettings();

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

export function saveProjectBundle(id: string, input: ProjectBundleWriteInput) {
  const now = new Date().toISOString();

  db.transaction(() => {
    db.update(projects)
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
      .where(eq(projects.id, id))
      .run();

    db.delete(unitTypes).where(eq(unitTypes.projectId, id)).run();
    input.unitTypes.forEach((u, idx) => {
      db.insert(unitTypes)
        .values({ ...u, id: randomUUID(), projectId: id, sortOrder: idx })
        .run();
    });

    db.delete(paymentMilestones).where(eq(paymentMilestones.projectId, id)).run();
    input.paymentMilestones.forEach((m, idx) => {
      db.insert(paymentMilestones)
        .values({ ...m, id: randomUUID(), projectId: id, sortOrder: idx })
        .run();
    });

    db.delete(comparableProjects).where(eq(comparableProjects.projectId, id)).run();
    input.comparableProjects.forEach((c, idx) => {
      db.insert(comparableProjects)
        .values({
          ...c,
          id: randomUUID(),
          projectId: id,
          priceHistory: JSON.stringify(c.priceHistory ?? []),
          sortOrder: idx,
        })
        .run();
    });

    const existingFinancials = db
      .select()
      .from(financialAssumptions)
      .where(eq(financialAssumptions.projectId, id))
      .get();

    if (existingFinancials) {
      db.update(financialAssumptions)
        .set(input.financials)
        .where(eq(financialAssumptions.projectId, id))
        .run();
    } else {
      db.insert(financialAssumptions)
        .values({ ...input.financials, id: randomUUID(), projectId: id })
        .run();
    }
  });

  return getProjectBundle(id)!;
}

/* -------------------------------------------------------------------------- */
/* Generated reports                                                          */
/* -------------------------------------------------------------------------- */

export function insertGeneratedReport(input: {
  projectId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  focusUnitTypeId: string | null;
  snapshotJson: string;
  pdfFileName: string;
}) {
  const id = randomUUID();
  db.insert(generatedReports)
    .values({ id, ...input })
    .run();
  return id;
}

export function listReportsForProject(projectId: string) {
  return db
    .select()
    .from(generatedReports)
    .where(eq(generatedReports.projectId, projectId))
    .orderBy(desc(generatedReports.createdAt))
    .all();
}

export function getReportById(id: string) {
  return db.select().from(generatedReports).where(eq(generatedReports.id, id)).get();
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
