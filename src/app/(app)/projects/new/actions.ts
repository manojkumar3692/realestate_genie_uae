"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/requireSession";
import { parseProjectText, type ParsedProjectText } from "@/lib/ai/parseProjectText";
import { createProject, type CreateProjectInput } from "@/db/repoProjects";

export async function parseProjectTextAction(rawText: string): Promise<ParsedProjectText | null> {
  await requireSession();
  if (!rawText.trim()) return null;
  return parseProjectText(rawText);
}

export interface CreateProjectFormInput {
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
  expectedHandover: string;
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

export async function createProjectAction(input: CreateProjectFormInput): Promise<{ error: string } | void> {
  const session = await requireSession();
  if (!input.name.trim()) return { error: "Project name is required." };
  if (!input.location.trim() && !input.community.trim()) return { error: "Location or community is required." };

  const payload: CreateProjectInput = {
    orgId: session.orgId,
    createdBy: session.sub,
    name: input.name.trim(),
    developer: input.developer.trim(),
    city: input.city.trim() || "Dubai",
    community: input.community.trim(),
    location: input.location.trim() || input.community.trim(),
    nearbyAreas: input.nearbyAreas,
    propertyTypes: input.propertyTypes,
    bedroomTypes: input.bedroomTypes,
    startingPrice: input.startingPrice,
    maxPrice: input.maxPrice,
    currency: input.currency || "AED",
    paymentPlanSummary: input.paymentPlanSummary,
    downPaymentPercent: input.downPaymentPercent,
    constructionStatus: input.constructionStatus,
    expectedHandover: input.expectedHandover || null,
    expectedRentalYieldPercent: input.expectedRentalYieldPercent,
    expectedAppreciationPercent: input.expectedAppreciationPercent,
    targetBuyerType: input.targetBuyerType,
    freeholdStatus: input.freeholdStatus,
    amenities: input.amenities,
    sellingPoints: input.sellingPoints,
    notes: input.notes,
    rawPastedText: input.rawPastedText,
    unitTypes: input.unitTypes.filter((u) => u.typeLabel.trim()),
  };

  const id = await createProject(payload);
  redirect(`/projects/${id}`);
}
