import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tenancy & auth
// ---------------------------------------------------------------------------

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Commercial account model (see src/lib/pricing/config.ts for what each plan includes).
  // `type` is the durable org-shape field other logic branches on (e.g. future per-agent
  // privacy rules only apply to "team"); `planKey` is the billing-facing plan string, kept
  // separate in case pricing promos/overrides ever diverge from the org's shape. Both default
  // to "individual" so this migration is purely additive — no backfill needed for existing orgs.
  type: text("type", { enum: ["individual", "team"] }).notNull().default("individual"),
  planKey: text("plan_key", { enum: ["individual", "team"] }).notNull().default("individual"),
  region: text("region", { enum: ["uae", "india"] }).notNull().default("uae"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull().default(""),
    role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("users_normalized_email_idx").on(t.normalizedEmail)]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g. "import.delete", "customer.merge"
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("audit_logs_org_idx").on(t.orgId)]
);

// ---------------------------------------------------------------------------
// Import pipeline (raw layer)
// ---------------------------------------------------------------------------

export const importJobs = pgTable(
  "import_jobs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type", { enum: ["csv", "xlsx"] }).notNull(),
    sheetName: text("sheet_name"),
    status: text("status", {
      enum: [
        "uploading",
        "parsing",
        "mapping_review",
        "normalizing",
        "deduplicating",
        "extracting",
        "completed",
        "error",
      ],
    })
      .notNull()
      .default("uploading"),
    rowCount: integer("row_count").notNull().default(0),
    headerRowIndex: integer("header_row_index").notNull().default(0),
    progressJson: jsonb("progress_json")
      .$type<{ stage: string; processed: number; total: number }>()
      .notNull()
      .default({ stage: "uploading", processed: 0, total: 0 }),
    statsJson: jsonb("stats_json").$type<Record<string, number>>().notNull().default({}),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("import_jobs_org_idx").on(t.orgId)]
);

export const uploadedFiles = pgTable("uploaded_files", {
  id: text("id").primaryKey(),
  importJobId: text("import_job_id")
    .notNull()
    .references(() => importJobs.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const columnMappings = pgTable(
  "column_mappings",
  {
    id: text("id").primaryKey(),
    importJobId: text("import_job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    sourceColumn: text("source_column").notNull(),
    sampleValuesJson: jsonb("sample_values_json").$type<string[]>().notNull().default([]),
    detectedField: text("detected_field").notNull(), // normalized field key, or "unmapped"
    confidence: real("confidence").notNull().default(0), // 0-1
    method: text("method", {
      enum: ["deterministic", "fuzzy", "value_inspection", "ai", "manual"],
    })
      .notNull()
      .default("deterministic"),
    accepted: boolean("accepted").notNull().default(true),
    ignored: boolean("ignored").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("column_mappings_job_idx").on(t.importJobId)]
);

// Raw imported rows — the values here are NEVER overwritten by normalization or AI.
export const importedRows = pgTable(
  "imported_rows",
  {
    id: text("id").primaryKey(),
    importJobId: text("import_job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    rawJson: jsonb("raw_json").$type<Record<string, string>>().notNull(),
    status: text("status", { enum: ["pending", "normalized", "skipped", "error"] })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    customerId: text("customer_id"), // set once resolved to a customer (FK added below via relation only, no cascade needed)
  },
  (t) => [index("imported_rows_job_idx").on(t.importJobId)]
);

// ---------------------------------------------------------------------------
// Customers — normalized (structured) + inferred (AI) layers, kept separate
// ---------------------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    normalizedPhone: text("normalized_phone").notNull().default(""),
    email: text("email").notNull().default(""),
    normalizedEmail: text("normalized_email").notNull().default(""),
    nationality: text("nationality").notNull().default(""),
    // "lost_elsewhere" is set by the outcome loop's "Bought Elsewhere" button — the customer
    // bought a property through someone else. Hard-excluded from matching everywhere (see
    // score.ts), same as won/do_not_contact/invalid, so a dead lead stops surfacing org-wide the
    // moment an agent logs it, not just on the project they happened to be looking at.
    status: text("status", {
      enum: ["new", "contacted", "lost", "won", "dormant", "do_not_contact", "invalid", "lost_elsewhere"],
    })
      .notNull()
      .default("new"),
    doNotContact: boolean("do_not_contact").notNull().default(false),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().default(sql`now()`),
    latestSeenAt: timestamp("latest_seen_at", { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("customers_org_idx").on(t.orgId),
    index("customers_org_phone_idx").on(t.orgId, t.normalizedPhone),
    index("customers_org_email_idx").on(t.orgId, t.normalizedEmail),
  ]
);

export const customerIdentities = pgTable(
  "customer_identities",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["phone", "email"] }).notNull(),
    value: text("value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [index("customer_identities_customer_idx").on(t.customerId)]
);

export const customerSourceRecords = pgTable(
  "customer_source_records",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    importJobId: text("import_job_id").references(() => importJobs.id, { onDelete: "set null" }),
    importedRowId: text("imported_row_id"),
    sourceId: text("source_id"),
    campaignId: text("campaign_id"),
    rawSourceText: text("raw_source_text").notNull().default(""),
    rawCampaignText: text("raw_campaign_text").notNull().default(""),
    leadDate: timestamp("lead_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("customer_source_records_customer_idx").on(t.customerId)]
);

// The customer timeline. One row per touchpoint: an import row, a note, a status change.
export const customerInteractions = pgTable(
  "customer_interactions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().default(sql`now()`),
    channel: text("channel", {
      enum: ["import", "note", "status_change", "manual", "system"],
    })
      .notNull()
      .default("import"),
    summary: text("summary").notNull().default(""),
    rawNote: text("raw_note").notNull().default(""),
    projectMentioned: text("project_mentioned").notNull().default(""),
    sourceRecordId: text("source_record_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("customer_interactions_customer_idx").on(t.customerId, t.occurredAt)]
);

// NORMALIZED layer — deterministic parsing of structured columns only.
export const customerPreferences = pgTable("customer_preferences", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  budgetCurrency: text("budget_currency").notNull().default("AED"),
  preferredLocations: jsonb("preferred_locations").$type<string[]>().notNull().default([]),
  interestedProjects: jsonb("interested_projects").$type<string[]>().notNull().default([]),
  preferredDevelopers: jsonb("preferred_developers").$type<string[]>().notNull().default([]),
  bedrooms: jsonb("bedrooms").$type<string[]>().notNull().default([]),
  propertyTypes: jsonb("property_types").$type<string[]>().notNull().default([]),
  purpose: text("purpose", { enum: ["investment", "end_use", "holiday_home", "unclear"] })
    .notNull()
    .default("unclear"),
  purchaseTimeline: text("purchase_timeline").notNull().default(""),
  paymentPlanPreference: text("payment_plan_preference").notNull().default(""),
  readyOrOffplanPreference: text("ready_or_offplan_preference", {
    enum: ["ready", "off_plan", "either"],
  })
    .notNull()
    .default("either"),
  downpaymentPreference: text("downpayment_preference").notNull().default(""),
  expectedRoiRequirement: real("expected_roi_requirement"),
  purchaseReadiness: text("purchase_readiness", {
    enum: ["immediate", "warm", "cold", "unknown"],
  })
    .notNull()
    .default("unknown"),
  previousStatus: text("previous_status").notNull().default(""),
  lostReason: text("lost_reason").notNull().default(""),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// INFERRED layer — AI-derived, always separate from raw/normalized, always with evidence.
export const customerInferences = pgTable("customer_inferences", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  inferredBudgetMin: real("inferred_budget_min"),
  inferredBudgetMax: real("inferred_budget_max"),
  inferredLocations: jsonb("inferred_locations").$type<string[]>().notNull().default([]),
  inferredPropertyTypes: jsonb("inferred_property_types").$type<string[]>().notNull().default([]),
  inferredBedrooms: jsonb("inferred_bedrooms").$type<string[]>().notNull().default([]),
  inferredPurpose: text("inferred_purpose", {
    enum: ["investment", "end_use", "holiday_home", "unclear"],
  })
    .notNull()
    .default("unclear"),
  inferredPaymentPreferences: jsonb("inferred_payment_preferences")
    .$type<string[]>()
    .notNull()
    .default([]),
  inferredTimeline: text("inferred_timeline").notNull().default(""),
  inferredObjections: jsonb("inferred_objections").$type<string[]>().notNull().default([]),
  inferredDeveloperPreferences: jsonb("inferred_developer_preferences")
    .$type<string[]>()
    .notNull()
    .default([]),
  inferredPurchaseReadiness: text("inferred_purchase_readiness", {
    enum: ["immediate", "warm", "cold", "unknown"],
  })
    .notNull()
    .default("unknown"),
  profileConfidence: real("profile_confidence").notNull().default(0),
  aiSummary: text("ai_summary").notNull().default(""),
  // Evidence for every inferred field: [{ field, value, confidence, sourceExcerpt, sourceInteractionId, date }]
  evidenceJson: jsonb("evidence_json")
    .$type<
      Array<{
        field: string;
        value: string;
        confidence: number;
        sourceExcerpt: string;
        sourceInteractionId?: string;
        date?: string;
      }>
    >()
    .notNull()
    .default([]),
  lastInferredAt: timestamp("last_inferred_at", { withTimezone: true }),
});

// LIVE layer — append-only history of buyer intelligence learned from agent outcome feedback
// after a match was contacted (the "Living Buyer Profile" loop). Separate from both the
// normalized (customerPreferences) and AI-inferred-from-notes (customerInferences) layers on
// purpose: an agent's live report ("budget changed to 900k") should win over stale import/AI
// data without silently erasing it, and every update stays queryable as history, never
// overwritten in place. Scoring reads only the latest row per (customerId, field).
export const customerLiveSignals = pgTable(
  "customer_live_signals",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    // The match/project this outcome was logged against, if any (contact-today's list view can
    // log outcomes without a specific match in view being open... it always has one — the row
    // itself is a match — so this is set whenever we have it; null is only a defensive fallback).
    matchId: text("match_id").references(() => projectMatches.id, { onDelete: "set null" }),
    outcomeStatus: text("outcome_status").notNull(), // mirrors the button tapped, e.g. "budget_changed"
    field: text("field", { enum: ["budget", "location", "readiness", "none"] }).notNull(),
    rawAnswer: text("raw_answer").notNull().default(""), // the agent's own words, always kept verbatim
    // Structured result once interpreted (deterministic parser and/or AI) — shape depends on
    // `field`: {min,max,currency} for budget, {locations:[canonical...]} for location,
    // {readiness, note} for a "not now" timing hint. Empty object if interpretation failed.
    structuredValueJson: jsonb("structured_value_json").$type<Record<string, unknown>>().notNull().default({}),
    interpretedBy: text("interpreted_by", { enum: ["ai", "deterministic", "none"] }).notNull().default("none"),
    confidence: real("confidence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index("customer_live_signals_customer_idx").on(t.customerId, t.field, t.createdAt),
    index("customer_live_signals_match_idx").on(t.matchId),
  ]
);

export const duplicateCandidates = pgTable(
  "duplicate_candidates",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerAId: text("customer_a_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    customerBId: text("customer_b_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    matchType: text("match_type", {
      enum: ["exact_phone", "exact_email", "fuzzy_name_phone", "other"],
    }).notNull(),
    confidenceLevel: text("confidence_level", {
      enum: ["confirmed", "probable", "possible"],
    }).notNull(),
    score: real("score").notNull().default(0),
    status: text("status", { enum: ["pending", "merged", "rejected"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("duplicate_candidates_org_idx").on(t.orgId, t.status)]
);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    developer: text("developer").notNull().default(""),
    city: text("city").notNull().default("Dubai"),
    community: text("community").notNull().default(""),
    location: text("location").notNull().default(""),
    nearbyAreas: jsonb("nearby_areas").$type<string[]>().notNull().default([]),
    propertyTypes: jsonb("property_types").$type<string[]>().notNull().default([]),
    bedroomTypes: jsonb("bedroom_types").$type<string[]>().notNull().default([]),
    startingPrice: real("starting_price"),
    maxPrice: real("max_price"),
    currency: text("currency").notNull().default("AED"),
    paymentPlanSummary: text("payment_plan_summary").notNull().default(""),
    paymentPlanJson: jsonb("payment_plan_json")
      .$type<Array<{ label: string; percent: number; trigger: string }>>()
      .notNull()
      .default([]),
    downPaymentPercent: real("down_payment_percent"),
    constructionStatus: text("construction_status", { enum: ["off_plan", "ready"] })
      .notNull()
      .default("off_plan"),
    expectedHandover: text("expected_handover"), // free-form "Q4 2029" or ISO date
    expectedRentalYieldPercent: real("expected_rental_yield_percent"),
    expectedAppreciationPercent: real("expected_appreciation_percent"),
    targetBuyerType: text("target_buyer_type", {
      enum: ["investor", "end_user", "both"],
    })
      .notNull()
      .default("both"),
    freeholdStatus: boolean("freehold_status").notNull().default(true),
    amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
    sellingPoints: jsonb("selling_points").$type<string[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    rawPastedText: text("raw_pasted_text").notNull().default(""),
    status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("projects_org_idx").on(t.orgId)]
);

export const projectUnitTypes = pgTable("project_unit_types", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  typeLabel: text("type_label").notNull(), // Studio, 1BR, 2BR, Townhouse...
  bedrooms: real("bedrooms").notNull().default(0), // 0 = studio
  sizeSqftMin: real("size_sqft_min").notNull().default(0),
  sizeSqftMax: real("size_sqft_max").notNull().default(0),
  priceFrom: real("price_from").notNull().default(0),
  priceTo: real("price_to").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const projectFeatures = pgTable("project_features", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  category: text("category", { enum: ["amenity", "selling_point", "strength"] }).notNull(),
  label: text("label").notNull(),
  source: text("source", { enum: ["manual", "ai"] }).notNull().default("manual"),
});

export const projectProfiles = pgTable("project_profiles", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  buyerFitSummary: text("buyer_fit_summary").notNull().default(""),
  aiSummary: text("ai_summary").notNull().default(""),
  strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
  potentialSegments: jsonb("potential_segments").$type<string[]>().notNull().default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export const projectMatches = pgTable(
  "project_matches",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    totalScore: real("total_score").notNull().default(0),
    bucket: text("bucket", { enum: ["hot", "warm", "possible", "none"] }).notNull().default("none"),
    scoreBreakdownJson: jsonb("score_breakdown_json")
      .$type<Record<string, { score: number; max: number }>>()
      .notNull()
      .default({}),
    concernsJson: jsonb("concerns_json").$type<string[]>().notNull().default([]),
    explanationSource: text("explanation_source", { enum: ["ai", "template"] })
      .notNull()
      .default("template"),
    // The outcome loop is 7 buttons, not a CRM pipeline (see AGENTS notes / product spec §6):
    // Interested, Not Now, Budget Changed, Different Location, Not Interested, Bought Elsewhere,
    // No Response. "not_contacted" is the implicit starting state before any button is tapped —
    // it's never itself a button. The old pipeline-stage values (contacted/viewing/booked/
    // purchased) are kept here only so existing rows keep typechecking; nothing in the UI writes
    // them anymore.
    outcomeStatus: text("outcome_status", {
      enum: [
        "not_contacted",
        "contacted",
        "no_response",
        "interested",
        "not_interested",
        "viewing",
        "booked",
        "purchased",
        "not_now",
        "budget_changed",
        "different_location",
        "bought_elsewhere",
      ],
    })
      .notNull()
      .default("not_contacted"),
    outcomeUpdatedAt: timestamp("outcome_updated_at", { withTimezone: true }),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("project_matches_unique_idx").on(t.projectId, t.customerId),
    index("project_matches_project_idx").on(t.projectId, t.bucket, t.totalScore),
    index("project_matches_customer_idx").on(t.customerId),
  ]
);

export const matchReasons = pgTable("match_reasons", {
  id: text("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => projectMatches.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["positive", "concern"] }).notNull(),
  text: text("text").notNull(),
  weight: real("weight").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const matchEvidence = pgTable("match_evidence", {
  id: text("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => projectMatches.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  value: text("value").notNull(),
  sourceExcerpt: text("source_excerpt").notNull().default(""),
  sourceDate: timestamp("source_date", { withTimezone: true }),
  confidence: real("confidence").notNull().default(0),
});

export const generatedOutreach = pgTable("generated_outreach", {
  id: text("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => projectMatches.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  channel: text("channel", { enum: ["call_opening", "whatsapp"] }).notNull(),
  content: text("content").notNull(),
  source: text("source", { enum: ["ai", "template"] }).notNull().default("template"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// Acquisition intelligence
// ---------------------------------------------------------------------------

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // display name, e.g. "Meta"
    normalizedName: text("normalized_name").notNull(), // "meta"
    platform: text("platform", {
      enum: ["meta", "google", "portal", "referral", "website", "walk_in", "other", "unknown"],
    })
      .notNull()
      .default("unknown"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("sources_org_normalized_idx").on(t.orgId, t.normalizedName)]
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("campaigns_org_idx").on(t.orgId, t.normalizedName)]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  projects: many(projects),
  importJobs: many(importJobs),
}));

export const importJobsRelations = relations(importJobs, ({ many, one }) => ({
  columnMappings: many(columnMappings),
  importedRows: many(importedRows),
  uploadedFile: one(uploadedFiles, {
    fields: [importJobs.id],
    references: [uploadedFiles.importJobId],
  }),
}));

export const customersRelations = relations(customers, ({ many, one }) => ({
  identities: many(customerIdentities),
  sourceRecords: many(customerSourceRecords),
  interactions: many(customerInteractions),
  preferences: one(customerPreferences, {
    fields: [customers.id],
    references: [customerPreferences.customerId],
  }),
  inferences: one(customerInferences, {
    fields: [customers.id],
    references: [customerInferences.customerId],
  }),
  matches: many(projectMatches),
  liveSignals: many(customerLiveSignals),
}));

export const customerLiveSignalsRelations = relations(customerLiveSignals, ({ one }) => ({
  customer: one(customers, { fields: [customerLiveSignals.customerId], references: [customers.id] }),
  match: one(projectMatches, { fields: [customerLiveSignals.matchId], references: [projectMatches.id] }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  unitTypes: many(projectUnitTypes),
  features: many(projectFeatures),
  profile: one(projectProfiles, {
    fields: [projects.id],
    references: [projectProfiles.projectId],
  }),
  matches: many(projectMatches),
}));

export const projectMatchesRelations = relations(projectMatches, ({ many, one }) => ({
  reasons: many(matchReasons),
  evidence: many(matchEvidence),
  project: one(projects, { fields: [projectMatches.projectId], references: [projects.id] }),
  customer: one(customers, { fields: [projectMatches.customerId], references: [customers.id] }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  source: one(sources, { fields: [campaigns.sourceId], references: [sources.id] }),
}));
