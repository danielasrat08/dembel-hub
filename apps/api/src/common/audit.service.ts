import { Injectable } from '@nestjs/common';
import { DbService } from '../db/service/db.service';
import { auditLogs } from '../db/schema';

@Injectable()
export class AuditService {
  constructor(private readonly dbs: DbService) {}

  async log(e: { branchId: string; actorId?: string | null; action: string; entity: string; entityId: string; before?: unknown; after?: unknown }) {
    await this.dbs.db.insert(auditLogs).values({
      branchId: e.branchId,
      actorId: e.actorId ?? null,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      before: e.before ?? null,
      after: e.after ?? null,
    });
  }
}
