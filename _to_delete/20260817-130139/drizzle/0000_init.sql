CREATE TABLE "comparable_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"distance_km" real DEFAULT 0,
	"price_history" text DEFAULT '[]' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_assumptions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"projection_years" integer DEFAULT 5 NOT NULL,
	"annual_appreciation_percent" real DEFAULT 6 NOT NULL,
	"rental_yield_percent" real DEFAULT 7 NOT NULL,
	"rent_growth_percent" real DEFAULT 4 NOT NULL,
	"vacancy_percent" real DEFAULT 5 NOT NULL,
	"loan_enabled" boolean DEFAULT true NOT NULL,
	"ltv_percent" real DEFAULT 50 NOT NULL,
	"interest_rate_percent" real DEFAULT 4.5 NOT NULL,
	"tenure_years" integer DEFAULT 20 NOT NULL,
	"bank_name" text DEFAULT '' NOT NULL,
	"dld_fee_percent" real DEFAULT 4 NOT NULL,
	"other_acquisition_cost_percent" real DEFAULT 2 NOT NULL,
	"exit_year" integer DEFAULT 5 NOT NULL,
	"exit_selling_cost_percent" real DEFAULT 4 NOT NULL,
	CONSTRAINT "financial_assumptions_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "firm_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_name" text DEFAULT 'Your Brokerage' NOT NULL,
	"agent_name" text DEFAULT '' NOT NULL,
	"agent_title" text DEFAULT 'Real Estate Consultant' NOT NULL,
	"agent_phone" text DEFAULT '' NOT NULL,
	"agent_whatsapp" text DEFAULT '' NOT NULL,
	"agent_email" text DEFAULT '' NOT NULL,
	"rera_broker_number" text DEFAULT '' NOT NULL,
	"logo_data_url" text,
	"primary_color" text DEFAULT '#0B3B37' NOT NULL,
	"accent_color" text DEFAULT '#C9A24B' NOT NULL,
	"disclaimer_text" text DEFAULT 'This document is for illustrative purposes only and does not constitute financial, legal or investment advice. Figures are projections based on assumptions provided and are not guaranteed. Buyers should conduct independent due diligence and consult a licensed financial advisor before making any investment decision.' NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"client_phone" text DEFAULT '' NOT NULL,
	"client_email" text DEFAULT '' NOT NULL,
	"focus_unit_type_id" text,
	"snapshot_json" text NOT NULL,
	"pdf_file_name" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"label" text NOT NULL,
	"percent" real DEFAULT 0 NOT NULL,
	"months_from_launch" integer DEFAULT 0 NOT NULL,
	"trigger_type" text DEFAULT 'construction' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"developer" text DEFAULT '' NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"sub_location" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'off_plan' NOT NULL,
	"rera_number" text DEFAULT '' NOT NULL,
	"escrow_bank" text DEFAULT '' NOT NULL,
	"handover_date" text,
	"launch_date" text,
	"total_units" integer,
	"amenities" text DEFAULT '[]' NOT NULL,
	"hero_image_data_url" text,
	"currency" text DEFAULT 'AED' NOT NULL,
	"golden_visa_eligible" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_types" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type_label" text NOT NULL,
	"size_sqft_min" real DEFAULT 0 NOT NULL,
	"size_sqft_max" real DEFAULT 0 NOT NULL,
	"price_from" real DEFAULT 0 NOT NULL,
	"price_to" real DEFAULT 0 NOT NULL,
	"representative_price" real DEFAULT 0 NOT NULL,
	"service_charge_per_sqft" real DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comparable_projects" ADD CONSTRAINT "comparable_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_assumptions" ADD CONSTRAINT "financial_assumptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_types" ADD CONSTRAINT "unit_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;