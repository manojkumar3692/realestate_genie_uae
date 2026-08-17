// Shared domain types used across the wizard, calculation engine, and PDF template.
// These mirror the DB schema shapes but are the "working" shapes used in-memory
// and inside the JSON snapshot stored with every generated report.

export type ProjectStatus = "off_plan" | "ready" | "secondary";

export interface ProjectInput {
  id: string;
  name: string;
  developer: string;
  area: string;
  subLocation: string;
  description: string;
  status: ProjectStatus;
  reraNumber: string;
  escrowBank: string;
  handoverDate: string | null;
  launchDate: string | null;
  totalUnits: number | null;
  amenities: string[];
  heroImageDataUrl: string | null;
  currency: string;
  goldenVisaEligible: boolean;
}

export interface UnitTypeInput {
  id: string;
  projectId: string;
  typeLabel: string;
  sizeSqftMin: number;
  sizeSqftMax: number;
  priceFrom: number;
  priceTo: number;
  representativePrice: number;
  serviceChargePerSqft: number;
  sortOrder: number;
}

export type MilestoneTrigger = "booking" | "construction" | "handover" | "post_handover";

export interface PaymentMilestoneInput {
  id: string;
  projectId: string;
  label: string;
  percent: number;
  monthsFromLaunch: number;
  triggerType: MilestoneTrigger;
  sortOrder: number;
}

export interface PriceHistoryPoint {
  year: number;
  pricePerSqft: number;
}

export interface ComparableProjectInput {
  id: string;
  projectId: string;
  name: string;
  area: string;
  distanceKm: number;
  priceHistory: PriceHistoryPoint[];
  notes: string;
  sortOrder: number;
}

export interface FinancialAssumptionsInput {
  id: string;
  projectId: string;
  projectionYears: number;
  annualAppreciationPercent: number;
  rentalYieldPercent: number;
  rentGrowthPercent: number;
  vacancyPercent: number;
  loanEnabled: boolean;
  ltvPercent: number;
  interestRatePercent: number;
  tenureYears: number;
  bankName: string;
  dldFeePercent: number;
  otherAcquisitionCostPercent: number;
  exitYear: number;
  exitSellingCostPercent: number;
}

export interface FirmSettingsInput {
  id: number;
  firmName: string;
  agentName: string;
  agentTitle: string;
  agentPhone: string;
  agentWhatsapp: string;
  agentEmail: string;
  reraBrokerNumber: string;
  logoDataUrl: string | null;
  primaryColor: string;
  accentColor: string;
  disclaimerText: string;
}

// Full bundle of everything needed to run calculations / render the PDF.
export interface ProjectBundle {
  project: ProjectInput;
  unitTypes: UnitTypeInput[];
  paymentMilestones: PaymentMilestoneInput[];
  comparableProjects: ComparableProjectInput[];
  financials: FinancialAssumptionsInput;
  firm: FirmSettingsInput;
}

/**
 * Who the generated PDF is being pitched to. Drives which headline numbers,
 * table columns and narrative framing appear in the report — an investor,
 * an end user (buying to live in it) and a flip buyer (short-term reseller)
 * care about very different numbers, even though the underlying math is the
 * same calculation engine underneath.
 */
export type ClientType = "investor" | "end_user" | "flip";

export interface ReportClientInfo {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  focusUnitTypeId: string | null;
  clientType: ClientType;
  /** Only used when clientType === "flip" — how many years until the planned resale. Defaults to 2. */
  flipExitYear?: number | null;
}

// Result of a project directory lookup (see src/db/schema.ts projectDirectory) —
// project basics plus reusable unit types / comparables, without ids or
// projectId since those get freshly generated for whichever project adopts them.
export interface ProjectDirectoryMatch {
  name: string;
  developer: string;
  area: string;
  subLocation: string;
  description: string;
  status: ProjectStatus;
  reraNumber: string;
  escrowBank: string;
  handoverDate: string | null;
  launchDate: string | null;
  totalUnits: number | null;
  amenities: string[];
  currency: string;
  goldenVisaEligible: boolean;
  heroImageDataUrl: string | null;
  unitTypes: Omit<UnitTypeInput, "id" | "projectId" | "sortOrder">[];
  comparableProjects: Omit<ComparableProjectInput, "id" | "projectId" | "sortOrder">[];
  /** ISO timestamp this directory entry was last saved from — show agents how fresh it is. */
  updatedAt: string;
}
