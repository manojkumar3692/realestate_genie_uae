import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * Firm / agent branding settings.
 * Single-row table for now (no auth/multi-tenant yet) — every generated PDF
 * pulls branding (logo, colors, contact info) from here.
 */
export const firmSettings = pgTable("firm_settings", {
  id: serial("id").primaryKey(),
  firmName: text("firm_name").notNull().default("Your Brokerage"),
  agentName: text("agent_name").notNull().default(""),
  agentTitle: text("agent_title").notNull().default("Real Estate Consultant"),
  agentPhone: text("agent_phone").notNull().default(""),
  agentWhatsapp: text("agent_whatsapp").notNull().default(""),
  agentEmail: text("agent_email").notNull().default(""),
  reraBrokerNumber: text("rera_broker_number").notNull().default(""),
  logoDataUrl: text("logo_data_url"),
  primaryColor: text("primary_color").notNull().default("#0B3B37"),
  accentColor: text("accent_color").notNull().default("#C9A24B"),
  disclaimerText: text("disclaimer_text").notNull().default(
    "This document is for illustrative purposes only and does not constitute financial, legal or investment advice. Figures are projections based on assumptions provided and are not guaranteed. Buyers should conduct independent due diligence and consult a licensed financial advisor before making any investment decision."
  ),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  developer: text("developer").notNull().default(""),
  area: text("area").notNull().default(""),
  subLocation: text("sub_location").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["off_plan", "ready", "secondary"] })
    .notNull()
    .default("off_plan"),
  reraNumber: text("rera_number").notNull().default(""),
  escrowBank: text("escrow_bank").notNull().default(""),
  handoverDate: text("handover_date"), // ISO date string
  launchDate: text("launch_date"), // ISO date string, used as payment plan anchor
  totalUnits: integer("total_units"),
  amenities: text("amenities").notNull().default("[]"), // JSON string[]
  heroImageDataUrl: text("hero_image_data_url"),
  currency: text("currency").notNull().default("AED"),
  goldenVisaEligible: boolean("golden_visa_eligible").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const unitTypes = pgTable("unit_types", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  typeLabel: text("type_label").notNull(), // Studio, 1 Bedroom, 2 Bedroom, ...
  sizeSqftMin: real("size_sqft_min").notNull().default(0),
  sizeSqftMax: real("size_sqft_max").notNull().default(0),
  priceFrom: real("price_from").notNull().default(0),
  priceTo: real("price_to").notNull().default(0),
  representativePrice: real("representative_price").notNull().default(0),
  serviceChargePerSqft: real("service_charge_per_sqft").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const paymentMilestones = pgTable("payment_milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  percent: real("percent").notNull().default(0),
  monthsFromLaunch: integer("months_from_launch").notNull().default(0),
  triggerType: text("trigger_type", {
    enum: ["booking", "construction", "handover", "post_handover"],
  })
    .notNull()
    .default("construction"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const comparableProjects = pgTable("comparable_projects", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  area: text("area").notNull().default(""),
  distanceKm: real("distance_km").default(0),
  priceHistory: text("price_history").notNull().default("[]"), // JSON [{year, pricePerSqft}]
  notes: text("notes").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const financialAssumptions = pgTable("financial_assumptions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  projectionYears: integer("projection_years").notNull().default(5),
  annualAppreciationPercent: real("annual_appreciation_percent").notNull().default(6),
  rentalYieldPercent: real("rental_yield_percent").notNull().default(7),
  rentGrowthPercent: real("rent_growth_percent").notNull().default(4),
  vacancyPercent: real("vacancy_percent").notNull().default(5),
  loanEnabled: boolean("loan_enabled").notNull().default(true),
  ltvPercent: real("ltv_percent").notNull().default(50),
  interestRatePercent: real("interest_rate_percent").notNull().default(4.5),
  tenureYears: integer("tenure_years").notNull().default(20),
  bankName: text("bank_name").notNull().default(""),
  dldFeePercent: real("dld_fee_percent").notNull().default(4),
  otherAcquisitionCostPercent: real("other_acquisition_cost_percent").notNull().default(2),
  exitYear: integer("exit_year").notNull().default(5),
  exitSellingCostPercent: real("exit_selling_cost_percent").notNull().default(4),
});

export const generatedReports = pgTable("generated_reports", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull().default(""),
  clientPhone: text("client_phone").notNull().default(""),
  clientEmail: text("client_email").notNull().default(""),
  focusUnitTypeId: text("focus_unit_type_id"),
  snapshotJson: text("snapshot_json").notNull(), // full immutable data snapshot used to render this PDF
  pdfFileName: text("pdf_file_name").notNull(), // storage object path within the Supabase bucket
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const projectsRelations = relations(projects, ({ many, one }) => ({
  unitTypes: many(unitTypes),
  paymentMilestones: many(paymentMilestones),
  comparableProjects: many(comparableProjects),
  financialAssumptions: one(financialAssumptions, {
    fields: [projects.id],
    references: [financialAssumptions.projectId],
  }),
  generatedReports: many(generatedReports),
}));

export const unitTypesRelations = relations(unitTypes, ({ one }) => ({
  project: one(projects, { fields: [unitTypes.projectId], references: [projects.id] }),
}));

export const paymentMilestonesRelations = relations(paymentMilestones, ({ one }) => ({
  project: one(projects, { fields: [paymentMilestones.projectId], references: [projects.id] }),
}));

export const comparableProjectsRelations = relations(comparableProjects, ({ one }) => ({
  project: one(projects, { fields: [comparableProjects.projectId], references: [projects.id] }),
}));

export const financialAssumptionsRelations = relations(financialAssumptions, ({ one }) => ({
  project: one(projects, { fields: [financialAssumptions.projectId], references: [projects.id] }),
}));

export const generatedReportsRelations = relations(generatedReports, ({ one }) => ({
  project: one(projects, { fields: [generatedReports.projectId], references: [projects.id] }),
}));

/**
 * A growing, shared library of project facts, decoupled from any single
 * `projects` row (no FK — it must survive that project being edited or
 * deleted). Every time an agent saves a project with a non-empty name, this
 * table is upserted (keyed by normalized name) with that project's basics,
 * unit types and comparables. When any agent later starts a new project and
 * types a matching name, the wizard can look this up and pre-fill the form
 * instead of starting blank — the database gets more useful the more it's used.
 */
export const projectDirectory = pgTable("project_directory", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameNormalized: text("name_normalized").notNull().unique(),
  developer: text("developer").notNull().default(""),
  area: text("area").notNull().default(""),
  subLocation: text("sub_location").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["off_plan", "ready", "secondary"] })
    .notNull()
    .default("off_plan"),
  reraNumber: text("rera_number").notNull().default(""),
  escrowBank: text("escrow_bank").notNull().default(""),
  handoverDate: text("handover_date"),
  launchDate: text("launch_date"),
  totalUnits: integer("total_units"),
  amenities: text("amenities").notNull().default("[]"), // JSON string[]
  currency: text("currency").notNull().default("AED"),
  goldenVisaEligible: boolean("golden_visa_eligible").notNull().default(false),
  heroImageDataUrl: text("hero_image_data_url"), // set once by whichever agent first uploads one; never cleared by later saves that omit it
  unitTypesJson: text("unit_types_json").notNull().default("[]"), // JSON UnitTypeInput[] (no id/projectId)
  comparableProjectsJson: text("comparable_projects_json").notNull().default("[]"), // JSON ComparableProjectInput[] (no id/projectId)
  timesUsed: integer("times_used").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});
