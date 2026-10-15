/**
 * Dembel Performance Hub — database schema (Phase 1 scope), Drizzle ORM / PostgreSQL 16.
 * Every business table carries branch_id so other branches or HQ can join later.
 * Change this file, then run `npm run db:generate` to write a new SQL migration.
 */
import {
  pgTable, pgEnum, uuid, text, boolean, integer, numeric, date, timestamp, jsonb,
  uniqueIndex, index, type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
const money = (name: string) => numeric(name, { precision: 16, scale: 2 });

// ───────────── Enums ─────────────

/** SR Sales Rep · TM Telemarketer · MD Media · DS Digital Specialist · SS Supervisor ·
 *  SM Sales Manager · MM Marketing Manager · BM Branch Manager · OA Office Admin (Super Admin) */
export const roleCode = pgEnum('role_code', ['SR', 'TM', 'MD', 'DS', 'SS', 'SM', 'MM', 'BM', 'OA']);
export const staffStatus = pgEnum('staff_status', ['ACTIVE', 'ON_LEAVE', 'DEACTIVATED']);
export const lang = pgEnum('lang', ['EN', 'AM']);
export const metricPeriod = pgEnum('metric_period', ['DAILY', 'WEEKLY', 'MONTHLY']);
/** OKR §11.2 band families: INDIVIDUAL 90/70 · VISITS 80/50 · CLOSINGS 90/70 */
export const bandFamily = pgEnum('band_family', ['INDIVIDUAL', 'VISITS', 'CLOSINGS']);
export const entryStatus = pgEnum('entry_status', ['DRAFT', 'SUBMITTED', 'VERIFIED', 'RETURNED', 'LOCKED']);
export const visitType = pgEnum('visit_type', ['OFFICE', 'SITE']);
export const purpose = pgEnum('purpose', ['RESIDENCE', 'INVESTMENT', 'OTHER']);
export const pipelineStage = pgEnum('pipeline_stage', ['APPOINTMENT', 'ASSIGNED', 'VISIT', 'RESERVATION', 'CLOSED_WON', 'LOST']);
export const verifyTarget = pgEnum('verify_target', ['VISIT', 'DEAL']);
export const verifyAction = pgEnum('verify_action', ['VERIFY', 'RETURN', 'OVERRIDE']);
export const exportKind = pgEnum('export_kind', ['HQ_WEEKLY', 'COMMISSION_LETTER', 'MONTHLY_COMMISSION']);
export const exportFormat = pgEnum('export_format', ['XLSX', 'GSHEET', 'PDF']);

// ───────────── Organisation ─────────────

export const branches = pgTable('branches', {
  id: id(),
  code: text('code').notNull().unique(), // "DMB"
  name: text('name').notNull(),
  createdAt: createdAt(),
});

export const staff = pgTable('staff', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  staffCode: text('staff_code').notNull().unique(), // "TMR-DMB-SR-0007"
  fullName: text('full_name').notNull(),
  phone: text('phone').unique(),
  role: roleCode('role').notNull(),
  status: staffStatus('status').notNull().default('ACTIVE'),
  joinedOn: date('joined_on'),
  deactivatedOn: date('deactivated_on'),
  reportsToId: uuid('reports_to_id').references((): AnyPgColumn => staff.id),
  passwordHash: text('password_hash'),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  preferredLang: lang('preferred_lang').notNull().default('EN'),
  telegramChatId: text('telegram_chat_id'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('staff_branch_role_status_idx').on(t.branchId, t.role, t.status)]);

export const teams = pgTable('teams', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  code: text('code').notNull().unique(), // "DMB-T-KFL"
  name: text('name').notNull(),
  supervisorId: uuid('supervisor_id').references(() => staff.id),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [index('teams_branch_idx').on(t.branchId)]);

/** Dated membership so team moves keep history correct */
export const teamMemberships = pgTable('team_memberships', {
  id: id(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  staffId: uuid('staff_id').notNull().references(() => staff.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
}, (t) => [
  index('tm_staff_start_idx').on(t.staffId, t.startDate),
  index('tm_team_start_idx').on(t.teamId, t.startDate),
]);

/** Branch-wide sequences for readable codes: STAFF, LD-2610, VS-2610, DL-2610, CR-2610 … */
export const codeCounters = pgTable('code_counters', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  scope: text('scope').notNull(),
  next: integer('next').notNull().default(1),
}, (t) => [uniqueIndex('code_counters_branch_scope_uq').on(t.branchId, t.scope)]);

// ───────────── Metrics & targets ─────────────

/** What a role reports. Adding a metric is a row here, not a code change. */
export const metricDefs = pgTable('metric_defs', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  role: roleCode('role').notNull(),
  code: text('code').notNull(), // "raw_leads"
  labelEn: text('label_en').notNull(),
  labelAm: text('label_am'),
  period: metricPeriod('period').notNull(),
  unit: text('unit').notNull().default('count'),
  band: bandFamily('band').notNull().default('INDIVIDUAL'),
  /** null = entered by staff; otherwise computed, e.g. "office_visits + site_visits" or "records:lead.qualified" */
  formula: text('formula'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
}, (t) => [uniqueIndex('metric_defs_branch_role_code_uq').on(t.branchId, t.role, t.code)]);

/** Versioned targets: the one in force on a date is the latest effective_from ≤ date */
export const targets = pgTable('targets', {
  id: id(),
  metricDefId: uuid('metric_def_id').notNull().references(() => metricDefs.id),
  perPerson: numeric('per_person', { precision: 14, scale: 2 }).notNull(),
  targetPeriod: metricPeriod('target_period').notNull(),
  greenAt: numeric('green_at', { precision: 5, scale: 4 }).notNull(),
  yellowAt: numeric('yellow_at', { precision: 5, scale: 4 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  source: text('source'),
}, (t) => [index('targets_metric_effective_idx').on(t.metricDefId, t.effectiveFrom)]);

// ───────────── Daily totals ─────────────

export const dailyTotals = pgTable('daily_totals', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  staffId: uuid('staff_id').notNull().references(() => staff.id),
  workDate: date('work_date').notNull(),
  weekStart: date('week_start').notNull(), // Saturday
  status: entryStatus('status').notNull().default('DRAFT'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  late: boolean('late').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('daily_totals_staff_date_uq').on(t.staffId, t.workDate),
  index('daily_totals_branch_week_idx').on(t.branchId, t.weekStart),
]);

export const totalValues = pgTable('total_values', {
  id: id(),
  dailyTotalId: uuid('daily_total_id').notNull().references(() => dailyTotals.id, { onDelete: 'cascade' }),
  metricDefId: uuid('metric_def_id').notNull().references(() => metricDefs.id),
  value: numeric('value', { precision: 14, scale: 2 }).notNull(),
}, (t) => [uniqueIndex('total_values_entry_metric_uq').on(t.dailyTotalId, t.metricDefId)]);

/** Social media views: logged once a week on Friday, per platform */
export const weeklyViews = pgTable('weekly_views', {
  id: id(),
  staffId: uuid('staff_id').notNull().references(() => staff.id),
  weekStart: date('week_start').notNull(),
  platform: text('platform').notNull(),
  views: integer('views').notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('weekly_views_staff_week_platform_uq').on(t.staffId, t.weekStart, t.platform)]);

// ───────────── Admin-maintained lists ─────────────

export const sites = pgTable('sites', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
}, (t) => [uniqueIndex('sites_branch_name_uq').on(t.branchId, t.name)]);

export const propertyTypes = pgTable('property_types', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
}, (t) => [uniqueIndex('property_types_branch_name_uq').on(t.branchId, t.name)]);

/** Lead origin = source of sale. Decides telemarketer commission eligibility. */
export const leadOrigins = pgTable('lead_origins', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  name: text('name').notNull(),
  tmCommissionEligible: boolean('tm_commission_eligible').notNull().default(false),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [uniqueIndex('lead_origins_branch_name_uq').on(t.branchId, t.name)]);

// ───────────── Leads & pipeline ─────────────

export const leads = pgTable('leads', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  leadCode: text('lead_code').notNull().unique(), // "LD-2610-0143"
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  originId: uuid('origin_id').notNull().references(() => leadOrigins.id),
  createdById: uuid('created_by_id').notNull().references(() => staff.id),
  handledByTmId: uuid('handled_by_tm_id').references(() => staff.id),
  assignedRepId: uuid('assigned_rep_id').references(() => staff.id),
  // BTAP — all four required for Qualified
  budgetEtb: money('budget_etb'),
  budgetOk: boolean('budget_ok').notNull().default(false),
  timelineOk: boolean('timeline_ok').notNull().default(false),
  authorityOk: boolean('authority_ok').notNull().default(false),
  purpose: purpose('purpose'),
  // Optional criteria
  reachableOk: boolean('reachable_ok'),
  projectMatchOk: boolean('project_match_ok'),
  qualified: boolean('qualified').notNull().default(false),
  qualifiedAt: timestamp('qualified_at', { withTimezone: true }),
  stage: pipelineStage('stage').notNull().default('APPOINTMENT'),
  lostReason: text('lost_reason'),
  appointmentAt: timestamp('appointment_at', { withTimezone: true }),
  appointmentType: visitType('appointment_type'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('leads_branch_phone_idx').on(t.branchId, t.phone),
  index('leads_rep_stage_idx').on(t.assignedRepId, t.stage),
  index('leads_tm_idx').on(t.handledByTmId),
]);

export const pipelineEvents = pgTable('pipeline_events', {
  id: id(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  fromStage: pipelineStage('from_stage'),
  toStage: pipelineStage('to_stage').notNull(),
  actorId: uuid('actor_id').notNull().references(() => staff.id),
  note: text('note'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('pipeline_events_lead_at_idx').on(t.leadId, t.at)]);

// ───────────── Visits & deals (verified individually) ─────────────

export const visits = pgTable('visits', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  visitCode: text('visit_code').notNull().unique(), // "VS-2610-0412"
  repId: uuid('rep_id').notNull().references(() => staff.id),
  leadId: uuid('lead_id').references(() => leads.id),
  clientName: text('client_name').notNull(),
  type: visitType('type').notNull(),
  siteId: uuid('site_id').references(() => sites.id),
  visitedAt: timestamp('visited_at', { withTimezone: true }).notNull(),
  withSupervisor: boolean('with_supervisor').notNull().default(false),
  proofKey: text('proof_key'), // optional photo or signed form
  summary: text('summary'),
  status: entryStatus('status').notNull().default('SUBMITTED'),
  createdAt: createdAt(),
}, (t) => [
  index('visits_branch_at_idx').on(t.branchId, t.visitedAt),
  index('visits_rep_at_idx').on(t.repId, t.visitedAt),
]);

export const deals = pgTable('deals', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  dealCode: text('deal_code').notNull().unique(), // "DL-2610-007"
  repId: uuid('rep_id').notNull().references(() => staff.id),
  leadId: uuid('lead_id').unique().references(() => leads.id),
  buyerName: text('buyer_name').notNull(),
  buyerPhone: text('buyer_phone').notNull(),
  siteId: uuid('site_id').notNull().references(() => sites.id),
  propertyTypeId: uuid('property_type_id').notNull().references(() => propertyTypes.id),
  propertyId: text('property_id').notNull(),
  areaSqm: numeric('area_sqm', { precision: 10, scale: 2 }).notNull(),
  saleDate: date('sale_date').notNull(),
  totalPriceEtb: money('total_price_etb').notNull(),
  /** Paid amount in Birr as entered. No percentage or balance is derived. */
  paidEtb: money('paid_etb').notNull(),
  contractNo: text('contract_no').notNull().unique(),
  sourceId: uuid('source_id').notNull().references(() => leadOrigins.id),
  telemarketerId: uuid('telemarketer_id').references(() => staff.id),
  tmCommissionEligible: boolean('tm_commission_eligible').notNull().default(false),
  status: entryStatus('status').notNull().default('SUBMITTED'),
  createdAt: createdAt(),
}, (t) => [index('deals_branch_sale_date_idx').on(t.branchId, t.saleDate)]);

export const verifications = pgTable('verifications', {
  id: id(),
  target: verifyTarget('target').notNull(),
  visitId: uuid('visit_id').references(() => visits.id),
  dealId: uuid('deal_id').references(() => deals.id),
  action: verifyAction('action').notNull(),
  note: text('note'),
  actorId: uuid('actor_id').notNull().references(() => staff.id),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('verifications_visit_idx').on(t.visitId), index('verifications_deal_idx').on(t.dealId)]);

// ───────────── Exports ─────────────

export const exportTemplates = pgTable('export_templates', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  kind: exportKind('kind').notNull(),
  name: text('name').notNull(),
  fileKey: text('file_key').notNull(), // uploaded HQ .xlsx
  /** { "B4": "week.rawLeadsTotal", ... } cell → field */
  cellMap: jsonb('cell_map').notNull(),
  version: integer('version').notNull().default(1),
  active: boolean('active').notNull().default(true),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => staff.id),
  createdAt: createdAt(),
});

export const exportsLog = pgTable('exports', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  kind: exportKind('kind').notNull(),
  format: exportFormat('format').notNull(),
  refNo: text('ref_no').notNull().unique(), // "CR-DMB-2610-007"
  templateId: uuid('template_id').references(() => exportTemplates.id),
  dealId: uuid('deal_id').references(() => deals.id),
  weekStart: date('week_start'),
  fileKey: text('file_key'),
  externalUrl: text('external_url'), // Google Sheet URL
  createdById: uuid('created_by_id').notNull().references(() => staff.id),
  createdAt: createdAt(),
});

// ───────────── Sessions ─────────────

/** Server-side sessions. The cookie holds a random token; only its SHA-256 hash is stored. */
export const sessions = pgTable('sessions', {
  id: id(),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
}, (t) => [index('sessions_staff_idx').on(t.staffId)]);

// ───────────── Audit ─────────────

export const auditLogs = pgTable('audit_logs', {
  id: id(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  actorId: uuid('actor_id').references(() => staff.id),
  action: text('action').notNull(), // CREATE, VERIFY, RETURN, ASSIGN, EDIT, UNLOCK, EXPORT, LOGIN, SEED
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_branch_at_idx').on(t.branchId, t.at),
  index('audit_entity_idx').on(t.entity, t.entityId),
]);
