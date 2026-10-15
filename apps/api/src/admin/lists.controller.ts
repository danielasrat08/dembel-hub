import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { DbService } from '../db/service/db.service';
import { leadOrigins, propertyTypes, sites } from '../db/schema';
import { AuditService } from '../common/audit.service';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { SessionUser } from '../auth/session.service';

const TABLES = { sites, 'property-types': propertyTypes, 'lead-origins': leadOrigins } as const;
type Kind = keyof typeof TABLES;

const CreateBody = z.object({ name: z.string().trim().min(2).max(80), tmCommissionEligible: z.boolean().optional() });
const UpdateBody = z.object({ name: z.string().trim().min(2).max(80).optional(), active: z.boolean().optional(), tmCommissionEligible: z.boolean().optional() });

function table(kind: string) {
  if (!(kind in TABLES)) throw new NotFoundException('Unknown list.');
  return TABLES[kind as Kind];
}

/** Admin-maintained dropdown lists: sites, property types, lead origins (= sources of sale). */
@Controller('admin/lists')
export class ListsController {
  constructor(private readonly dbs: DbService, private readonly audit: AuditService) {}

  /** Every signed-in user can read the lists (they fill the dropdowns on entry forms). */
  @Get()
  async all(@CurrentUser() me: SessionUser) {
    const { db } = this.dbs;
    const [s, p, o] = await Promise.all([
      db.select().from(sites).where(eq(sites.branchId, me.branchId)).orderBy(asc(sites.name)),
      db.select().from(propertyTypes).where(eq(propertyTypes.branchId, me.branchId)).orderBy(asc(propertyTypes.name)),
      db.select().from(leadOrigins).where(eq(leadOrigins.branchId, me.branchId)).orderBy(asc(leadOrigins.sortOrder), asc(leadOrigins.name)),
    ]);
    return { sites: s, propertyTypes: p, leadOrigins: o };
  }

  @Post(':kind')
  @Roles('OA')
  async create(@CurrentUser() me: SessionUser, @Param('kind') kind: string, @Body(new ZodPipe(CreateBody)) b: z.infer<typeof CreateBody>) {
    const t = table(kind);
    if (b.tmCommissionEligible !== undefined && kind !== 'lead-origins') throw new BadRequestException('Commission eligibility applies to lead origins only.');
    const exists = await this.dbs.db.select({ id: t.id }).from(t).where(and(eq(t.branchId, me.branchId), eq(t.name, b.name)));
    if (exists.length) throw new ConflictException(`"${b.name}" is already in the list.`);
    const values: Record<string, unknown> = { branchId: me.branchId, name: b.name };
    if (kind === 'lead-origins') values.tmCommissionEligible = b.tmCommissionEligible ?? false;
    const [row] = await this.dbs.db.insert(t).values(values as never).returning();
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'CREATE', entity: kind, entityId: row.id, after: values });
    return row;
  }

  @Patch(':kind/:id')
  @Roles('OA')
  async update(@CurrentUser() me: SessionUser, @Param('kind') kind: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(UpdateBody)) b: z.infer<typeof UpdateBody>) {
    const t = table(kind);
    if (b.tmCommissionEligible !== undefined && kind !== 'lead-origins') throw new BadRequestException('Commission eligibility applies to lead origins only.');
    const [before] = await this.dbs.db.select().from(t).where(and(eq(t.id, id), eq(t.branchId, me.branchId)));
    if (!before) throw new NotFoundException('Item not found.');
    await this.dbs.db.update(t).set(b as never).where(eq(t.id, id));
    await this.audit.log({ branchId: me.branchId, actorId: me.id, action: 'EDIT', entity: kind, entityId: id, before, after: b });
    return { ok: true };
  }
}
