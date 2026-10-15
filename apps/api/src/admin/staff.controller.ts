import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DbService } from '../db/service/db.service';
import { codeCounters, roleCode, staff, teamMemberships, teams } from '../db/schema';
import { AuditService } from '../common/audit.service';
import { ZodPipe } from '../common/zod.pipe';
import { normalizePhone } from '../common/phone';
import { CurrentUser, Roles } from '../auth/decorators';
import { SessionService, SessionUser } from '../auth/session.service';
import { generateTempPassword, hashPassword } from '../auth/passwords';

const today = () => new Date().toISOString().slice(0, 10);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const phoneField = z.string().trim().max(20).optional().nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const p = normalizePhone(v);
    if (!p) { ctx.addIssue({ code: 'custom', message: 'Enter an Ethiopian mobile number, e.g. 0911 22 33 44' }); return z.NEVER; }
    return p;
  });

const CreateBody = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: phoneField,
  role: z.enum(roleCode.enumValues),
  teamId: z.string().uuid().optional().nullable(),
  joinedOn: isoDate.optional(),
});
const UpdateBody = z.object({ fullName: z.string().trim().min(2).max(80).optional(), phone: phoneField, role: z.enum(roleCode.enumValues).optional() });
const DateBody = z.object({ date: isoDate.optional() });
const MoveBody = z.object({ teamId: z.string().uuid().nullable(), date: isoDate.optional() });

/** Roles that belong to a sales team. Others report directly to a manager. */
const TEAM_ROLES = new Set(['SR', 'SS']);

@Controller('admin/staff')
@Roles('OA', 'BM')
export class StaffController {
  constructor(private readonly dbs: DbService, private readonly audit: AuditService, private readonly sessions: SessionService) {}

  @Get()
  async list(@CurrentUser() me: SessionUser) {
    const { db } = this.dbs;
    const rows = await db
      .select({
        id: staff.id, staffCode: staff.staffCode, fullName: staff.fullName, phone: staff.phone, role: staff.role, status: staff.status,
        joinedOn: staff.joinedOn, deactivatedOn: staff.deactivatedOn, mustChangePassword: staff.mustChangePassword,
        hasPassword: sql<boolean>`${staff.passwordHash} is not null`, lastLoginAt: staff.lastLoginAt,
        teamId: teams.id, teamCode: teams.code, teamName: teams.name,
      })
      .from(staff)
      .leftJoin(teamMemberships, and(eq(teamMemberships.staffId, staff.id), isNull(teamMemberships.endDate)))
      .leftJoin(teams, eq(teams.id, teamMemberships.teamId))
      .where(eq(staff.branchId, me.branchId))
      .orderBy(asc(staff.staffCode));
    // Supervisors lead a team without being a member row; show that team for them.
    const led = await db.select({ supervisorId: teams.supervisorId, id: teams.id, code: teams.code, name: teams.name }).from(teams).where(eq(teams.branchId, me.branchId));
    return rows.map((r) => {
      const l = !r.teamId ? led.find((t) => t.supervisorId === r.id) : undefined;
      return l ? { ...r, teamId: l.id, teamCode: l.code, teamName: l.name } : r;
    });
  }

  @Post()
  @Roles('OA')
  async create(@CurrentUser() me: SessionUser, @Body(new ZodPipe(CreateBody)) b: z.infer<typeof CreateBody>) {
    const { db } = this.dbs;
    if (b.teamId && !TEAM_ROLES.has(b.role)) throw new BadRequestException('Only sales reps and supervisors belong to a team.');
    if (b.phone && (await db.select({ id: staff.id }).from(staff).where(eq(staff.phone, b.phone))).length)
      throw new ConflictException('Another staff member already uses this phone number.');
    if (b.teamId) await this.requireTeam(me.branchId, b.teamId);

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const created = await db.transaction(async (tx) => {
      const [c] = await tx.update(codeCounters).set({ next: sql`${codeCounters.next} + 1` })
        .where(and(eq(codeCounters.branchId, me.branchId), eq(codeCounters.scope, 'STAFF')))
        .returning({ n: sql<number>`${codeCounters.next} - 1` });
      if (!c) throw new BadRequestException('Staff number sequence is missing. Run the seed first.');
      const staffCode = `TMR-DMB-${b.role}-${String(c.n).padStart(4, '0')}`;
      const joinedOn = b.joinedOn ?? today();
      const [s] = await tx.insert(staff).values({
        branchId: me.branchId, staffCode, fullName: b.fullName, phone: b.phone, role: b.role, joinedOn, passwordHash, mustChangePassword: true,
      }).returning();
      if (b.teamId) {
        if (b.role === 'SS') await tx.update(teams).set({ supervisorId: s.id }).where(eq(teams.id, b.teamId));
        else await tx.insert(teamMemberships).values({ teamId: b.teamId, staffId: s.id, startDate: joinedOn });
      }
      return s;
    });
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'CREATE', entity: 'staff', entityId: created.id,
      after: { staffCode: created.staffCode, role: created.role, teamId: b.teamId ?? null } });
    // The temporary password is shown once to the Office Admin and never stored in plain text.
    return { id: created.id, staffCode: created.staffCode, fullName: created.fullName, tempPassword };
  }

  @Patch(':id')
  @Roles('OA')
  async update(@CurrentUser() me: SessionUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(UpdateBody)) b: z.infer<typeof UpdateBody>) {
    const { db } = this.dbs;
    const before = await this.requireStaff(me.branchId, id);
    if (b.phone && b.phone !== before.phone && (await db.select({ id: staff.id }).from(staff).where(eq(staff.phone, b.phone))).length)
      throw new ConflictException('Another staff member already uses this phone number.');
    if (b.role && b.role !== 'OA' && before.role === 'OA') await this.ensureAnotherAdmin(me.branchId, id);
    const patch: Partial<typeof staff.$inferInsert> = {};
    if (b.fullName !== undefined) patch.fullName = b.fullName;
    if (b.phone !== undefined) patch.phone = b.phone;
    if (b.role !== undefined) patch.role = b.role; // staff ID keeps its original prefix; IDs are never reissued
    if (!Object.keys(patch).length) return { ok: true };
    await db.update(staff).set(patch).where(eq(staff.id, id));
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'EDIT', entity: 'staff', entityId: id,
      before: { fullName: before.fullName, phone: before.phone, role: before.role }, after: patch });
    return { ok: true };
  }

  @Post(':id/deactivate')
  @Roles('OA')
  @HttpCode(200)
  async deactivate(@CurrentUser() me: SessionUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(DateBody)) b: z.infer<typeof DateBody>) {
    const s = await this.requireStaff(me.branchId, id);
    if (id === me.id) throw new BadRequestException('You cannot deactivate your own account.');
    if (s.role === 'OA') await this.ensureAnotherAdmin(me.branchId, id);
    const date = b.date ?? today();
    const { db } = this.dbs;
    await db.update(staff).set({ status: 'DEACTIVATED', deactivatedOn: date }).where(eq(staff.id, id));
    await db.update(teamMemberships).set({ endDate: date }).where(and(eq(teamMemberships.staffId, id), isNull(teamMemberships.endDate)));
    await db.update(teams).set({ supervisorId: null }).where(eq(teams.supervisorId, id));
    await this.sessions.destroyAllFor(id);
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'DEACTIVATE', entity: 'staff', entityId: id, after: { date } });
    return { ok: true };
  }

  @Post(':id/reactivate')
  @Roles('OA')
  @HttpCode(200)
  async reactivate(@CurrentUser() me: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.requireStaff(me.branchId, id);
    await this.dbs.db.update(staff).set({ status: 'ACTIVE', deactivatedOn: null }).where(eq(staff.id, id));
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'REACTIVATE', entity: 'staff', entityId: id });
    return { ok: true, note: 'Assign a team again if needed.' };
  }

  @Post(':id/move')
  @Roles('OA')
  @HttpCode(200)
  async move(@CurrentUser() me: SessionUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(MoveBody)) b: z.infer<typeof MoveBody>) {
    const s = await this.requireStaff(me.branchId, id);
    if (s.role !== 'SR') throw new BadRequestException('Only sales reps move between teams. To change a supervisor, edit the team.');
    if (b.teamId) await this.requireTeam(me.branchId, b.teamId);
    const date = b.date ?? today();
    const { db } = this.dbs;
    await db.transaction(async (tx) => {
      await tx.update(teamMemberships).set({ endDate: date }).where(and(eq(teamMemberships.staffId, id), isNull(teamMemberships.endDate)));
      if (b.teamId) await tx.insert(teamMemberships).values({ teamId: b.teamId, staffId: id, startDate: date });
    });
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'MOVE_TEAM', entity: 'staff', entityId: id, after: { teamId: b.teamId, date } });
    return { ok: true };
  }

  @Post(':id/reset-password')
  @Roles('OA')
  @HttpCode(200)
  async resetPassword(@CurrentUser() me: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    const s = await this.requireStaff(me.branchId, id);
    if (s.status !== 'ACTIVE') throw new BadRequestException('Reactivate the account before resetting its password.');
    const tempPassword = generateTempPassword();
    await this.dbs.db.update(staff).set({ passwordHash: await hashPassword(tempPassword), mustChangePassword: true }).where(eq(staff.id, id));
    await this.sessions.destroyAllFor(id);
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'RESET_PASSWORD', entity: 'staff', entityId: id });
    return { staffCode: s.staffCode, fullName: s.fullName, tempPassword };
  }

  private async requireStaff(branchId: string, id: string) {
    const [s] = await this.dbs.db.select().from(staff).where(and(eq(staff.id, id), eq(staff.branchId, branchId)));
    if (!s) throw new NotFoundException('Staff member not found.');
    return s;
  }
  private async requireTeam(branchId: string, id: string) {
    const [t] = await this.dbs.db.select().from(teams).where(and(eq(teams.id, id), eq(teams.branchId, branchId)));
    if (!t) throw new BadRequestException('Team not found.');
    return t;
  }
  private async ensureAnotherAdmin(branchId: string, exceptId: string) {
    const [{ n }] = await this.dbs.db.select({ n: count() }).from(staff)
      .where(and(eq(staff.branchId, branchId), eq(staff.role, 'OA'), eq(staff.status, 'ACTIVE'), sql`${staff.id} <> ${exceptId}`));
    if (n === 0) throw new BadRequestException('Keep at least one active Office Admin.');
  }
}
