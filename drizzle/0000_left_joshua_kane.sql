CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"source_id" text,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "column_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"import_job_id" text NOT NULL,
	"source_column" text NOT NULL,
	"sample_values_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detected_field" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"method" text DEFAULT 'deterministic' NOT NULL,
	"accepted" boolean DEFAULT true NOT NULL,
	"ignored" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_inferences" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"inferred_budget_min" real,
	"inferred_budget_max" real,
	"inferred_locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_property_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_bedrooms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_purpose" text DEFAULT 'unclear' NOT NULL,
	"inferred_payment_preferences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_timeline" text DEFAULT '' NOT NULL,
	"inferred_objections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_developer_preferences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_purchase_readiness" text DEFAULT 'unknown' NOT NULL,
	"profile_confidence" real DEFAULT 0 NOT NULL,
	"ai_summary" text DEFAULT '' NOT NULL,
	"evidence_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_inferred_at" timestamp with time zone,
	CONSTRAINT "customer_inferences_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "customer_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" text DEFAULT 'import' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"raw_note" text DEFAULT '' NOT NULL,
	"project_mentioned" text DEFAULT '' NOT NULL,
	"source_record_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"budget_min" real,
	"budget_max" real,
	"budget_currency" text DEFAULT 'AED' NOT NULL,
	"preferred_locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interested_projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_developers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bedrooms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"property_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"purpose" text DEFAULT 'unclear' NOT NULL,
	"purchase_timeline" text DEFAULT '' NOT NULL,
	"payment_plan_preference" text DEFAULT '' NOT NULL,
	"ready_or_offplan_preference" text DEFAULT 'either' NOT NULL,
	"downpayment_preference" text DEFAULT '' NOT NULL,
	"expected_roi_requirement" real,
	"purchase_readiness" text DEFAULT 'unknown' NOT NULL,
	"previous_status" text DEFAULT '' NOT NULL,
	"lost_reason" text DEFAULT '' NOT NULL,
	"last_contacted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_preferences_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "customer_source_records" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"import_job_id" text,
	"imported_row_id" text,
	"source_id" text,
	"campaign_id" text,
	"raw_source_text" text DEFAULT '' NOT NULL,
	"raw_campaign_text" text DEFAULT '' NOT NULL,
	"lead_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"normalized_phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"normalized_email" text DEFAULT '' NOT NULL,
	"nationality" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"do_not_contact" boolean DEFAULT false NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"latest_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duplicate_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_a_id" text NOT NULL,
	"customer_b_id" text NOT NULL,
	"match_type" text NOT NULL,
	"confidence_level" text NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "generated_outreach" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"project_id" text NOT NULL,
	"channel" text NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'template' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_by" text,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"sheet_name" text,
	"status" text DEFAULT 'uploading' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"header_row_index" integer DEFAULT 0 NOT NULL,
	"progress_json" jsonb DEFAULT '{"stage":"uploading","processed":0,"total":0}'::jsonb NOT NULL,
	"stats_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "imported_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"import_job_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"raw_json" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"customer_id" text
);
--> statement-breakpoint
CREATE TABLE "match_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"source_excerpt" text DEFAULT '' NOT NULL,
	"source_date" timestamp with time zone,
	"confidence" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_reasons" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"weight" real DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_features" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"total_score" real DEFAULT 0 NOT NULL,
	"bucket" text DEFAULT 'none' NOT NULL,
	"score_breakdown_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"concerns_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation_source" text DEFAULT 'template' NOT NULL,
	"outcome_status" text DEFAULT 'not_contacted' NOT NULL,
	"outcome_updated_at" timestamp with time zone,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"buyer_fit_summary" text DEFAULT '' NOT NULL,
	"ai_summary" text DEFAULT '' NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"potential_segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_profiles_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_unit_types" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type_label" text NOT NULL,
	"bedrooms" real DEFAULT 0 NOT NULL,
	"size_sqft_min" real DEFAULT 0 NOT NULL,
	"size_sqft_max" real DEFAULT 0 NOT NULL,
	"price_from" real DEFAULT 0 NOT NULL,
	"price_to" real DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_by" text,
	"name" text NOT NULL,
	"developer" text DEFAULT '' NOT NULL,
	"city" text DEFAULT 'Dubai' NOT NULL,
	"community" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"nearby_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"property_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bedroom_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starting_price" real,
	"max_price" real,
	"currency" text DEFAULT 'AED' NOT NULL,
	"payment_plan_summary" text DEFAULT '' NOT NULL,
	"payment_plan_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"down_payment_percent" real,
	"construction_status" text DEFAULT 'off_plan' NOT NULL,
	"expected_handover" text,
	"expected_rental_yield_percent" real,
	"expected_appreciation_percent" real,
	"target_buyer_type" text DEFAULT 'both' NOT NULL,
	"freehold_status" boolean DEFAULT true NOT NULL,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selling_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"raw_pasted_text" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"platform" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" text PRIMARY KEY NOT NULL,
	"import_job_id" text NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "column_mappings" ADD CONSTRAINT "column_mappings_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_inferences" ADD CONSTRAINT "customer_inferences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_source_records" ADD CONSTRAINT "customer_source_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_source_records" ADD CONSTRAINT "customer_source_records_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_customer_a_id_customers_id_fk" FOREIGN KEY ("customer_a_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_customer_b_id_customers_id_fk" FOREIGN KEY ("customer_b_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_outreach" ADD CONSTRAINT "generated_outreach_match_id_project_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."project_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_outreach" ADD CONSTRAINT "generated_outreach_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_outreach" ADD CONSTRAINT "generated_outreach_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_rows" ADD CONSTRAINT "imported_rows_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_evidence" ADD CONSTRAINT "match_evidence_match_id_project_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."project_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_reasons" ADD CONSTRAINT "match_reasons_match_id_project_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."project_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_features" ADD CONSTRAINT "project_features_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_matches" ADD CONSTRAINT "project_matches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_matches" ADD CONSTRAINT "project_matches_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_unit_types" ADD CONSTRAINT "project_unit_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_org_idx" ON "audit_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "campaigns_org_idx" ON "campaigns" USING btree ("org_id","normalized_name");--> statement-breakpoint
CREATE INDEX "column_mappings_job_idx" ON "column_mappings" USING btree ("import_job_id");--> statement-breakpoint
CREATE INDEX "customer_identities_customer_idx" ON "customer_identities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_interactions_customer_idx" ON "customer_interactions" USING btree ("customer_id","occurred_at");--> statement-breakpoint
CREATE INDEX "customer_source_records_customer_idx" ON "customer_source_records" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "customers_org_phone_idx" ON "customers" USING btree ("org_id","normalized_phone");--> statement-breakpoint
CREATE INDEX "customers_org_email_idx" ON "customers" USING btree ("org_id","normalized_email");--> statement-breakpoint
CREATE INDEX "duplicate_candidates_org_idx" ON "duplicate_candidates" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "import_jobs_org_idx" ON "import_jobs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "imported_rows_job_idx" ON "imported_rows" USING btree ("import_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_matches_unique_idx" ON "project_matches" USING btree ("project_id","customer_id");--> statement-breakpoint
CREATE INDEX "project_matches_project_idx" ON "project_matches" USING btree ("project_id","bucket","total_score");--> statement-breakpoint
CREATE INDEX "project_matches_customer_idx" ON "project_matches" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "projects_org_idx" ON "projects" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_org_normalized_idx" ON "sources" USING btree ("org_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_normalized_email_idx" ON "users" USING btree ("normalized_email");