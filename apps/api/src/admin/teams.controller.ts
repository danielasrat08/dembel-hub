import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { DbService } from '../db/service/db.service';
import { staff, teamMemberships, teams } from '../db/schema';
import { AuditService } from '../common/audit.service';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { SessionUser } from '../auth/session.service';

const CreateBody = z.object({
  suffix: z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/, 'Use 2–5 letters, e.g. KFL'),
  name: z.string().trim().min(2).max(60),
  supervisorId: z.string().uuid().optional().nullable(),
});
const UpdateBody = z.object({ name: z.string().trim().min(2).max(60).optional(), supervisorId: z.string().uuid().nullable().optional(), active: z.boolean().optional() });

@Controller('admin/teams')
@Roles('OA', 'BM')
export class TeamsController {
  constructor(private readonly dbs: DbService, private readonly audit: AuditService) {}

  @Get()
  async list(@CurrentUser() me: SessionUser) {
    const { db } = this.dbs;
    const rows = await db
      .select({ id: teams.id, code: teams.code, name: teams.name, active: teams.active, supervisorId: teams.supervisorId,
        supervisorName: staff.fullName, supervisorCode: staff.staffCode })
      .from(teams).leftJoin(staff, eq(staff.id, teams.supervisorId))
      .where(eq(teams.branchId, me.branchId)).orderBy(asc(teams.code));
    const counts = await db
      .select({ teamId: teamMemberships.teamId, n: count() })
      .from(teamMemberships).innerJoin(staff, eq(staff.id, teamMemberships.staffId))
      .where(and(isNull(teamMemberships.endDate), eq(staff.status, 'ACTIVE')))
      .groupBy(teamMemberships.teamId);
    return rows.map((r) => ({ ...r, activeReps: counts.find((c) => c.teamId === r.id)?.n ?? 0 }));
  }

  @Post()
  @Roles('OA')
  async create(@CurrentUser() me: SessionUser, @Body(new ZodPipe(CreateBody)) b: z.infer<typeof CreateBody>) {
    const code = `DMB-T-${b.suffix}`;
    if ((await this.dbs.db.select({ id: teams.id }).from(teams).where(eq(teams.code, code))).length) throw new ConflictException(`Team ${code} already exists.`);
    if (b.supervisorId) await this.requireSupervisor(me.branchId, b.supervisorId);
    const [t] = await this.dbs.db.insert(teams).values({ branchId: me.branchId, code, name: b.name, supervisorId: b.supervisorId ?? null }).returning();
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'CREATE', entity: 'teams', entityId: t.id, after: { code, name: b.name } });
    return t;
  }

  @Patch(':id')
  @Roles('OA')
  async update(@CurrentUser() me: SessionUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(UpdateBody)) b: z.infer<typeof UpdateBody>) {
    const [before] = await this.dbs.db.select().from(teams).where(and(eq(teams.id, id), eq(teams.branchId, me.branchId)));
    if (!before) throw new NotFoundException('Team not found.');
    if (b.supervisorId) {
      await this.requireSupervisor(me.branchId, b.supervisorId);
      const other = await this.dbs.db.select({ code: teams.code }).from(teams).where(eq(teams.supervisorId, b.supervisorId));
      if (other.length && other[0].code !== before.code) throw new BadRequestException(`That supervisor already leads ${other[0].code}.`);
    }
    await this.dbs.db.update(teams).set(b).where(eq(teams.id, id));
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'EDIT', entity: 'teams', entityId: id,
      before: { name: before.name, supervisorId: before.supervisorId, active: before.active }, after: b });
    return { ok: true };
  }

  private async requireSupervisor(branchId: string, id: string) {
    const [s] = await this.dbs.db.select().from(staff).where(and(eq(staff.id, id), eq(staff.branchId, branchId)));
    if (!s || s.role !== 'SS' || s.status !== 'ACTIVE') throw new BadRequestException('Choose an active Sales Supervisor.');
  }
}
