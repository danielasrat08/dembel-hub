/**
 * Seed: Temer Dembel Branch reference data.
 * Sources: the five team Sales Performance Trackers (Reps + Targets sheets),
 * IPMS v1 (§6 role KPIs) and the OKR master reference (§7, §11.2).
 * Idempotent: running it again only adds an audit-log entry.
 */
import { and, eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { createDb } from './client';
import * as s from './schema';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

type Role = (typeof s.roleCode.enumValues)[number];
type Period = (typeof s.metricPeriod.enumValues)[number];
type Band = (typeof s.bandFamily.enumValues)[number];

const TRACKER_START = '2026-08-01';
const TEAMS: Record<string, string> = {
  // Display names are set from the real roster file on the server; codes are neutral.
  KFL: 'Team KFL', WGR: 'Team WGR', AFN: 'Team AFN', BLY: 'Team BLY', DHL: 'Team DHL',
};

type M = {
  role: Role; code: string; en: string; am: string; period: Period; band?: Band; unit?: string; formula?: string;
  target?: { per: number; period: Period; green: number; yellow: number; source: string };
};

// Targets mirror the "Targets" sheet of the team trackers.
const METRICS: M[] = [
  { role: 'SR', code: 'raw_leads', en: 'Raw leads', am: 'ጥሬ ደንበኞች', period: 'DAILY',
    target: { per: 30, period: 'WEEKLY', green: 0.9, yellow: 0.7, source: 'OKR Sec.7 KR5 · 5/day × 6' } },
  { role: 'SR', code: 'cold_calls', en: 'Cold calls', am: 'የቀዝቃዛ ጥሪዎች', period: 'DAILY',
    target: { per: 40, period: 'DAILY', green: 0.9, yellow: 0.7, source: 'IPMS 6.1' } },
  { role: 'SR', code: 'follow_ups', en: 'Follow-ups', am: 'ክትትሎች', period: 'DAILY',
    target: { per: 90, period: 'WEEKLY', green: 0.9, yellow: 0.7, source: 'OKR Sec.7 KR2 · 15/day × 6' } },
  { role: 'SR', code: 'scheduled_visits', en: 'Scheduled visits', am: 'የታቀዱ ጉብኝቶች', period: 'DAILY', band: 'VISITS',
    target: { per: 6, period: 'WEEKLY', green: 0.8, yellow: 0.5, source: 'Derived: 3 conducted ÷ 65% show-up' } },
  { role: 'SR', code: 'office_visits', en: 'Office visits', am: 'የቢሮ ጉብኝቶች', period: 'DAILY', band: 'VISITS',
    formula: 'records:visit.OFFICE.verified' },
  { role: 'SR', code: 'site_visits', en: 'Site visits', am: 'የሳይት ጉብኝቶች', period: 'DAILY', band: 'VISITS',
    formula: 'records:visit.SITE.verified' },
  { role: 'SR', code: 'conducted_visits', en: 'Total visits conducted', am: 'ጠቅላላ ጉብኝቶች', period: 'WEEKLY', band: 'VISITS',
    formula: 'office_visits + site_visits',
    target: { per: 3, period: 'WEEKLY', green: 0.8, yellow: 0.5, source: 'OKR Sec.7 KR4' } },
  { role: 'SR', code: 'qualified_leads', en: 'Qualified leads (BTAP)', am: 'ብቁ ደንበኞች', period: 'DAILY',
    formula: 'records:lead.qualified',
    target: { per: 6, period: 'WEEKLY', green: 0.9, yellow: 0.7, source: 'OKR Sec.7 KR6' } },
  { role: 'SR', code: 'reservations', en: 'Offer / reservation', am: 'ቦታ ማስያዝ', period: 'DAILY',
    target: { per: 1, period: 'WEEKLY', green: 0.9, yellow: 0.7, source: 'Branch operating norm' } },
  { role: 'SR', code: 'posts', en: 'Social posts', am: 'ማህበራዊ ልጥፎች', period: 'DAILY',
    target: { per: 6, period: 'WEEKLY', green: 0.9, yellow: 0.7, source: 'OKR Sec.7 KR3 · 1/day' } },
  { role: 'SR', code: 'views', en: 'Social media views', am: 'እይታዎች', period: 'WEEKLY',
    formula: 'records:weekly_views.sum',
    target: { per: 15000, period: 'WEEKLY', green: 0.9, yellow: 0.7, source: 'OKR Sec.7 KR3 · 2,500/day × 6' } },
  { role: 'SR', code: 'crm_compliance', en: '30-min response compliance', am: 'የ30 ደቂቃ ምላሽ', period: 'DAILY', unit: 'percent',
    target: { per: 95, period: 'DAILY', green: 0.9, yellow: 0.7, source: 'OKR Sec.5 KR5' } },
  { role: 'SR', code: 'deals_closed', en: 'Deals closed', am: 'የተዘጉ ሽያጮች', period: 'MONTHLY', band: 'CLOSINGS',
    formula: 'records:deal.verified',
    target: { per: 1, period: 'MONTHLY', green: 0.9, yellow: 0.7, source: 'IPMS 6.1 stretch' } },

  { role: 'TM', code: 'total_calls', en: 'Total calls', am: 'ጠቅላላ ጥሪዎች', period: 'DAILY',
    target: { per: 120, period: 'DAILY', green: 0.9, yellow: 0.7, source: 'IPMS 6.2' } },
  { role: 'TM', code: 'contacts_reached', en: 'Contacts reached', am: 'የተገኙ ሰዎች', period: 'DAILY',
    target: { per: 100, period: 'DAILY', green: 0.9, yellow: 0.7, source: 'IPMS 6.2' } },
  { role: 'TM', code: 'qualified_leads', en: 'Qualified leads', am: 'ብቁ ደንበኞች', period: 'DAILY',
    target: { per: 6, period: 'DAILY', green: 0.9, yellow: 0.7, source: 'IPMS 6.2' } },
  { role: 'TM', code: 'appointments_set', en: 'Appointments set', am: 'የተያዙ ቀጠሮዎች', period: 'DAILY',
    formula: 'records:lead.appointment_by_tm',
    target: { per: 2, period: 'DAILY', green: 0.9, yellow: 0.7, source: 'IPMS 6.2' } },
];

/** From the launch memos in the project files. The Office Admin can edit this list in the app. */
const SITES = ['CIT-SAR5 Phase II', 'City Plus Sarbet', 'Seken Diaspora DIA-SEK1'];
const PROPERTY_TYPES = ['Apartment', 'Shop', 'Office', 'Other'];
const ORIGINS: [string, boolean][] = [
  ['Personal prospecting', false],
  ['Rep own social media', false],
  ['Digital Marketing team', true],
  ['Telemarketer calling', true],
  ['Referral', false],
  ['Walk-in', false],
  ['DLP campaign', false],
];

type SeedStaff = { team: string; fullName: string; role: 'SS' | 'SR'; status: 'ACTIVE' | 'DEACTIVATED'; joinedOn: string | null; deactivatedOn: string | null };

/**
 * Staff names are personal data and are NOT stored in git.
 * The real roster lives on the server at STAFF_SEED_FILE (default: seed/staff.private.json, git-ignored).
 * Without it, the anonymised example roster is used so development and CI still work.
 */
function loadStaff(): SeedStaff[] {
  // Hosted platforms without file access (e.g. Render free): roster as a base64 secret env var
  if (process.env.STAFF_SEED_B64) {
    console.log('Using staff roster from STAFF_SEED_B64');
    return JSON.parse(Buffer.from(process.env.STAFF_SEED_B64, 'base64').toString('utf8')) as SeedStaff[];
  }
  const candidates = [
    process.env.STAFF_SEED_FILE,
    path.join(__dirname, 'seed/staff.private.json'),
    path.join(__dirname, '../../src/db/seed/staff.private.json'),
  ].filter(Boolean) as string[];
  const real = candidates.find((p) => existsSync(p));
  const file = real ?? [path.join(__dirname, 'seed/staff.example.json'), path.join(__dirname, '../../src/db/seed/staff.example.json')].find((p) => existsSync(p));
  if (!file) throw new Error('No staff seed file found');
  console.log(real ? `Using staff roster: ${file}` : 'Using anonymised example roster (set STAFF_SEED_FILE for the real one)');
  return JSON.parse(readFileSync(file, 'utf8')) as SeedStaff[];
}

export async function runSeed() {
  const tempPw = process.env.SEED_ADMIN_PASSWORD;
  if (!tempPw || tempPw.length < 10) throw new Error('Set SEED_ADMIN_PASSWORD (10+ characters) before seeding.');

  const { db, pool } = createDb();
  await db.transaction(async (tx) => {
    await tx.insert(s.branches).values({ code: 'DMB', name: 'Temer Dembel Branch' }).onConflictDoNothing();
    const [branch] = await tx.select().from(s.branches).where(eq(s.branches.code, 'DMB'));
    const B = branch.id;

    // One branch-wide staff sequence; the role prefix is part of the code.
    let seq = 0;
    const upsertStaff = async (fullName: string, role: Role, extra: Partial<typeof s.staff.$inferInsert> = {}) => {
      const staffCode = `TMR-DMB-${role}-${String(++seq).padStart(4, '0')}`;
      await tx.insert(s.staff).values({ branchId: B, staffCode, fullName, role, ...extra }).onConflictDoNothing();
      const [row] = await tx.select().from(s.staff).where(eq(s.staff.staffCode, staffCode));
      return row;
    };

    const oa = await upsertStaff('Office Admin', 'OA', { passwordHash: await hash(tempPw) });
    const bm = await upsertStaff('Branch Manager', 'BM');
    const sm = await upsertStaff(process.env.SEED_SALES_MANAGER_NAME ?? 'Sales Manager', 'SM', { reportsToId: bm.id });

    const byTeam: Record<string, SeedStaff[]> = {};
    for (const m of loadStaff()) (byTeam[m.team] ??= []).push(m);

    for (const [tcode, members] of Object.entries(byTeam)) {
      const supSeed = members.find((m) => m.role === 'SS');
      if (!supSeed) throw new Error(`Team ${tcode} has no supervisor`);
      const sup = await upsertStaff(supSeed.fullName, 'SS', { reportsToId: sm.id });
      const teamName = supSeed.fullName.startsWith('Supervisor ') ? TEAMS[tcode] : `Team ${supSeed.fullName.split(' ')[0]}`;
      await tx.insert(s.teams).values({ branchId: B, code: `DMB-T-${tcode}`, name: teamName, supervisorId: sup.id }).onConflictDoNothing();
      const [team] = await tx.select().from(s.teams).where(eq(s.teams.code, `DMB-T-${tcode}`));

      for (const m of members) {
        const person = m.role === 'SS' ? sup : await upsertStaff(m.fullName, 'SR', {
          status: m.status, joinedOn: m.joinedOn, deactivatedOn: m.deactivatedOn, reportsToId: sup.id,
        });
        const existing = await tx.select({ id: s.teamMemberships.id }).from(s.teamMemberships)
          .where(and(eq(s.teamMemberships.teamId, team.id), eq(s.teamMemberships.staffId, person.id)));
        if (!existing.length) {
          await tx.insert(s.teamMemberships).values({
            teamId: team.id, staffId: person.id, startDate: m.joinedOn ?? TRACKER_START, endDate: m.deactivatedOn,
          });
        }
      }
    }

    await tx.insert(s.codeCounters).values({ branchId: B, scope: 'STAFF', next: seq + 1 })
      .onConflictDoUpdate({ target: [s.codeCounters.branchId, s.codeCounters.scope], set: { next: seq + 1 } });

    for (const [order, m] of METRICS.entries()) {
      await tx.insert(s.metricDefs).values({
        branchId: B, role: m.role, code: m.code, labelEn: m.en, labelAm: m.am, period: m.period,
        band: m.band ?? 'INDIVIDUAL', unit: m.unit ?? 'count', formula: m.formula ?? null, sortOrder: order,
      }).onConflictDoNothing();
      const [md] = await tx.select().from(s.metricDefs)
        .where(and(eq(s.metricDefs.branchId, B), eq(s.metricDefs.role, m.role), eq(s.metricDefs.code, m.code)));
      if (m.target) {
        const has = await tx.select({ id: s.targets.id }).from(s.targets).where(eq(s.targets.metricDefId, md.id));
        if (!has.length) {
          await tx.insert(s.targets).values({
            metricDefId: md.id, perPerson: String(m.target.per), targetPeriod: m.target.period,
            greenAt: String(m.target.green), yellowAt: String(m.target.yellow), effectiveFrom: TRACKER_START, source: m.target.source,
          });
        }
      }
    }

    for (const name of SITES) await tx.insert(s.sites).values({ branchId: B, name }).onConflictDoNothing();
    for (const name of PROPERTY_TYPES) await tx.insert(s.propertyTypes).values({ branchId: B, name }).onConflictDoNothing();
    for (const [i, [name, eligible]] of ORIGINS.entries())
      await tx.insert(s.leadOrigins).values({ branchId: B, name, tmCommissionEligible: eligible, sortOrder: i }).onConflictDoNothing();

    await tx.insert(s.auditLogs).values({ branchId: B, actorId: oa.id, action: 'SEED', entity: 'branches', entityId: B, after: { staff: seq } });

    console.log(`Seeded ${branch.name}: ${seq} staff, ${Object.keys(byTeam).length} teams, ${METRICS.length} metrics.`);
    console.log(`Office Admin login: ${oa.staffCode} (temporary password from SEED_ADMIN_PASSWORD; change it on first login)`);
  });
  await pool.end();
}

if (require.main === module) runSeed().catch((e) => { console.error(e); process.exit(1); });
