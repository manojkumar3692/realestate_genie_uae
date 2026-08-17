import { eq, and } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { newId } from "@/lib/id";
import { normalizeLocation } from "@/lib/normalize/location";
import { generateProjectProfile, type ProjectProfileInput } from "@/lib/ai/generateProjectProfile";
import { logAudit } from "@/lib/audit";

export interface CreateProjectInput {
  orgId: string;
  createdBy: string;
  name: string;
  developer: string;
  city: string;
  community: string;
  location: string;
  nearbyAreas: string[];
  propertyTypes: string[];
  bedroomTypes: string[];
  startingPrice: number | null;
  maxPrice: number | null;
  currency: string;
  paymentPlanSummary: string;
  downPaymentPercent: number | null;
  constructionStatus: "off_plan" | "ready";
  expectedHandover: string | null;
  expectedRentalYieldPercent: number | null;
  expectedAppreciationPercent: number | null;
  targetBuyerType: "investor" | "end_user" | "both";
  freeholdStatus: boolean;
  amenities: string[];
  sellingPoints: string[];
  notes: string;
  rawPastedText: string;
  unitTypes: Array<{
    typeLabel: string;
    bedrooms: number;
    sizeSqftMin: number;
    sizeSqftMax: number;
    priceFrom: number;
    priceTo: number;
  }>;
}

export async function createProject(input: CreateProjectInput) {
  const id = newId("proj");
  const canonicalLocation = normalizeLocation(input.location || input.community).canonical || input.location;

  await db.insert(schema.projects).values({
    id,
    orgId: input.orgId,
    createdBy: input.createdBy,
    name: input.name,
    developer: input.developer,
    city: input.city || "Dubai",
    community: input.community,
    location: canonicalLocation,
    nearbyAreas: input.nearbyAreas,
    propertyTypes: input.propertyTypes,
    bedroomTypes: input.bedroomTypes,
    startingPrice: input.startingPrice,
    maxPrice: input.maxPrice,
    currency: input.currency || "AED",
    paymentPlanSummary: input.paymentPlanSummary,
    downPaymentPercent: input.downPaymentPercent,
    constructionStatus: input.constructionStatus,
    expectedHandover: input.expectedHandover,
    expectedRentalYieldPercent: input.expectedRentalYieldPercent,
    expectedAppreciationPercent: input.expectedAppreciationPercent,
    targetBuyerType: input.targetBuyerType,
    freeholdStatus: input.freeholdStatus,
    amenities: input.amenities,
    sellingPoints: input.sellingPoints,
    notes: input.notes,
    rawPastedText: input.rawPastedText,
  });

  if (input.unitTypes.length > 0) {
    await db.insert(schema.projectUnitTypes).values(
      input.unitTypes.map((u, i) => ({
        id: newId("unit"),
        projectId: id,
        typeLabel: u.typeLabel,
        bedrooms: u.bedrooms,
        sizeSqftMin: u.sizeSqftMin,
        sizeSqftMax: u.sizeSqftMax,
        priceFrom: u.priceFrom,
        priceTo: u.priceTo,
        sortOrder: i,
      }))
    );
  }

  const featureRows = [
    ...input.amenities.map((a) => ({ id: newId("feat"), projectId: id, category: "amenity" as const, label: a, source: "manual" as const })),
    ...input.sellingPoints.map((s) => ({ id: newId("feat"), projectId: id, category: "selling_point" as const, label: s, source: "manual" as const })),
  ];
  if (featureRows.length > 0) await db.insert(schema.projectFeatures).values(featureRows);

  // Generate the project intelligence profile (AI-assisted with a deterministic fallback).
  const profileInput: ProjectProfileInput = {
    name: input.name,
    developer: input.developer,
    location: canonicalLocation,
    propertyTypes: input.propertyTypes,
    bedroomTypes: input.bedroomTypes,
    startingPrice: input.startingPrice,
    currency: input.currency || "AED",
    paymentPlanSummary: input.paymentPlanSummary,
    constructionStatus: input.constructionStatus,
    expectedHandover: input.expectedHandover,
    expectedRentalYieldPercent: input.expectedRentalYieldPercent,
    targetBuyerType: input.targetBuyerType,
    amenities: input.amenities,
  };
  const profile = await generateProjectProfile(profileInput);
  await db.insert(schema.projectProfiles).values({
    id: newId("pprofile"),
    projectId: id,
    buyerFitSummary: profile.buyerFitSummary,
    aiSummary: profile.aiSummary,
    strengths: profile.strengths,
    potentialSegments: profile.potentialSegments,
  });
  if (profile.strengths.length) {
    await db.insert(schema.projectFeatures).values(
      profile.strengths.map((s) => ({ id: newId("feat"), projectId: id, category: "strength" as const, label: s, source: "ai" as const }))
    );
  }

  await logAudit({ orgId: input.orgId, userId: input.createdBy, action: "project.created", entityType: "project", entityId: id });

  return id;
}

export async function deleteProject(projectId: string, orgId: string) {
  await db.delete(schema.projects).where(and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)));
}
