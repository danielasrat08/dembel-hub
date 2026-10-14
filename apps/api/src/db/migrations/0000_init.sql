CREATE TYPE "public"."band_family" AS ENUM('INDIVIDUAL', 'VISITS', 'CLOSINGS');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('DRAFT', 'SUBMITTED', 'VERIFIED', 'RETURNED', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('XLSX', 'GSHEET', 'PDF');--> statement-breakpoint
CREATE TYPE "public"."export_kind" AS ENUM('HQ_WEEKLY', 'COMMISSION_LETTER', 'MONTHLY_COMMISSION');--> statement-breakpoint
CREATE TYPE "public"."lang" AS ENUM('EN', 'AM');--> statement-breakpoint
CREATE TYPE "public"."metric_period" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('APPOINTMENT', 'ASSIGNED', 'VISIT', 'RESERVATION', 'CLOSED_WON', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."purpose" AS ENUM('RESIDENCE', 'INVESTMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."role_code" AS ENUM('SR', 'TM', 'MD', 'DS', 'SS', 'SM', 'MM', 'BM', 'OA');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('ACTIVE', 'ON_LEAVE', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."verify_action" AS ENUM('VERIFY', 'RETURN', 'OVERRIDE');--> statement-breakpoint
CREATE TYPE "public"."verify_target" AS ENUM('VISIT', 'DEAL');--> statement-breakpoint
CREATE TYPE "public"."visit_type" AS ENUM('OFFICE', 'SITE');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "code_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"next" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_totals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"week_start" date NOT NULL,
	"status" "entry_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp with time zone,
	"late" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"deal_code" text NOT NULL,
	"rep_id" uuid NOT NULL,
	"lead_id" uuid,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"site_id" uuid NOT NULL,
	"property_type_id" uuid NOT NULL,
	"property_id" text NOT NULL,
	"area_sqm" numeric(10, 2) NOT NULL,
	"sale_date" date NOT NULL,
	"total_price_etb" numeric(16, 2) NOT NULL,
	"paid_etb" numeric(16, 2) NOT NULL,
	"contract_no" text NOT NULL,
	"source_id" uuid NOT NULL,
	"telemarketer_id" uuid,
	"tm_commission_eligible" boolean DEFAULT false NOT NULL,
	"status" "entry_status" DEFAULT 'SUBMITTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deals_deal_code_unique" UNIQUE("deal_code"),
	CONSTRAINT "deals_lead_id_unique" UNIQUE("lead_id"),
	CONSTRAINT "deals_contract_no_unique" UNIQUE("contract_no")
);
--> statement-breakpoint
CREATE TABLE "export_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"kind" "export_kind" NOT NULL,
	"name" text NOT NULL,
	"file_key" text NOT NULL,
	"cell_map" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"kind" "export_kind" NOT NULL,
	"format" "export_format" NOT NULL,
	"ref_no" text NOT NULL,
	"template_id" uuid,
	"deal_id" uuid,
	"week_start" date,
	"file_key" text,
	"external_url" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exports_ref_no_unique" UNIQUE("ref_no")
);
--> statement-breakpoint
CREATE TABLE "lead_origins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tm_commission_eligible" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"lead_code" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"origin_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"handled_by_tm_id" uuid,
	"assigned_rep_id" uuid,
	"budget_etb" numeric(16, 2),
	"budget_ok" boolean DEFAULT false NOT NULL,
	"timeline_ok" boolean DEFAULT false NOT NULL,
	"authority_ok" boolean DEFAULT false NOT NULL,
	"purpose" "purpose",
	"reachable_ok" boolean,
	"project_match_ok" boolean,
	"qualified" boolean DEFAULT false NOT NULL,
	"qualified_at" timestamp with time zone,
	"stage" "pipeline_stage" DEFAULT 'APPOINTMENT' NOT NULL,
	"lost_reason" text,
	"appointment_at" timestamp with time zone,
	"appointment_type" "visit_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_lead_code_unique" UNIQUE("lead_code")
);
--> statement-breakpoint
CREATE TABLE "metric_defs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"role" "role_code" NOT NULL,
	"code" text NOT NULL,
	"label_en" text NOT NULL,
	"label_am" text,
	"period" "metric_period" NOT NULL,
	"unit" text DEFAULT 'count' NOT NULL,
	"band" "band_family" DEFAULT 'INDIVIDUAL' NOT NULL,
	"formula" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"from_stage" "pipeline_stage",
	"to_stage" "pipeline_stage" NOT NULL,
	"actor_id" uuid NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"staff_code" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"role" "role_code" NOT NULL,
	"status" "staff_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_on" date,
	"deactivated_on" date,
	"reports_to_id" uuid,
	"password_hash" text,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"preferred_lang" "lang" DEFAULT 'EN' NOT NULL,
	"telegram_chat_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_staff_code_unique" UNIQUE("staff_code"),
	CONSTRAINT "staff_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_def_id" uuid NOT NULL,
	"per_person" numeric(14, 2) NOT NULL,
	"target_period" "metric_period" NOT NULL,
	"green_at" numeric(5, 4) NOT NULL,
	"yellow_at" numeric(5, 4) NOT NULL,
	"effective_from" date NOT NULL,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"supervisor_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "total_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_total_id" uuid NOT NULL,
	"metric_def_id" uuid NOT NULL,
	"value" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target" "verify_target" NOT NULL,
	"visit_id" uuid,
	"deal_id" uuid,
	"action" "verify_action" NOT NULL,
	"note" text,
	"actor_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"visit_code" text NOT NULL,
	"rep_id" uuid NOT NULL,
	"lead_id" uuid,
	"client_name" text NOT NULL,
	"type" "visit_type" NOT NULL,
	"site_id" uuid,
	"visited_at" timestamp with time zone NOT NULL,
	"with_supervisor" boolean DEFAULT false NOT NULL,
	"proof_key" text,
	"summary" text,
	"status" "entry_status" DEFAULT 'SUBMITTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_visit_code_unique" UNIQUE("visit_code")
);
--> statement-breakpoint
CREATE TABLE "weekly_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"platform" text NOT NULL,
	"views" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_staff_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_counters" ADD CONSTRAINT "code_counters_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_totals" ADD CONSTRAINT "daily_totals_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_totals" ADD CONSTRAINT "daily_totals_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_rep_id_staff_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_property_type_id_property_types_id_fk" FOREIGN KEY ("property_type_id") REFERENCES "public"."property_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_source_id_lead_origins_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."lead_origins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_telemarketer_id_staff_id_fk" FOREIGN KEY ("telemarketer_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_templates" ADD CONSTRAINT "export_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_templates" ADD CONSTRAINT "export_templates_uploaded_by_id_staff_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_template_id_export_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."export_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_origins" ADD CONSTRAINT "lead_origins_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_origin_id_lead_origins_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."lead_origins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_handled_by_tm_id_staff_id_fk" FOREIGN KEY ("handled_by_tm_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_rep_id_staff_id_fk" FOREIGN KEY ("assigned_rep_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_defs" ADD CONSTRAINT "metric_defs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_actor_id_staff_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_types" ADD CONSTRAINT "property_types_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_reports_to_id_staff_id_fk" FOREIGN KEY ("reports_to_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_metric_def_id_metric_defs_id_fk" FOREIGN KEY ("metric_def_id") REFERENCES "public"."metric_defs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_supervisor_id_staff_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "total_values" ADD CONSTRAINT "total_values_daily_total_id_daily_totals_id_fk" FOREIGN KEY ("daily_total_id") REFERENCES "public"."daily_totals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "total_values" ADD CONSTRAINT "total_values_metric_def_id_metric_defs_id_fk" FOREIGN KEY ("metric_def_id") REFERENCES "public"."metric_defs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_actor_id_staff_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_rep_id_staff_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_views" ADD CONSTRAINT "weekly_views_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_branch_at_idx" ON "audit_logs" USING btree ("branch_id","at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "code_counters_branch_scope_uq" ON "code_counters" USING btree ("branch_id","scope");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_totals_staff_date_uq" ON "daily_totals" USING btree ("staff_id","work_date");--> statement-breakpoint
CREATE INDEX "daily_totals_branch_week_idx" ON "daily_totals" USING btree ("branch_id","week_start");--> statement-breakpoint
CREATE INDEX "deals_branch_sale_date_idx" ON "deals" USING btree ("branch_id","sale_date");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_origins_branch_name_uq" ON "lead_origins" USING btree ("branch_id","name");--> statement-breakpoint
CREATE INDEX "leads_branch_phone_idx" ON "leads" USING btree ("branch_id","phone");--> statement-breakpoint
CREATE INDEX "leads_rep_stage_idx" ON "leads" USING btree ("assigned_rep_id","stage");--> statement-breakpoint
CREATE INDEX "leads_tm_idx" ON "leads" USING btree ("handled_by_tm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "metric_defs_branch_role_code_uq" ON "metric_defs" USING btree ("branch_id","role","code");--> statement-breakpoint
CREATE INDEX "pipeline_events_lead_at_idx" ON "pipeline_events" USING btree ("lead_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "property_types_branch_name_uq" ON "property_types" USING btree ("branch_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_branch_name_uq" ON "sites" USING btree ("branch_id","name");--> statement-breakpoint
CREATE INDEX "staff_branch_role_status_idx" ON "staff" USING btree ("branch_id","role","status");--> statement-breakpoint
CREATE INDEX "targets_metric_effective_idx" ON "targets" USING btree ("metric_def_id","effective_from");--> statement-breakpoint
CREATE INDEX "tm_staff_start_idx" ON "team_memberships" USING btree ("staff_id","start_date");--> statement-breakpoint
CREATE INDEX "tm_team_start_idx" ON "team_memberships" USING btree ("team_id","start_date");--> statement-breakpoint
CREATE INDEX "teams_branch_idx" ON "teams" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "total_values_entry_metric_uq" ON "total_values" USING btree ("daily_total_id","metric_def_id");--> statement-breakpoint
CREATE INDEX "verifications_visit_idx" ON "verifications" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "verifications_deal_idx" ON "verifications" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "visits_branch_at_idx" ON "visits" USING btree ("branch_id","visited_at");--> statement-breakpoint
CREATE INDEX "visits_rep_at_idx" ON "visits" USING btree ("rep_id","visited_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_views_staff_week_platform_uq" ON "weekly_views" USING btree ("staff_id","week_start","platform");