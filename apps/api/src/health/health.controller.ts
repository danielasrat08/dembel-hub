import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { DbService } from '../db/service/db.service';
import { Public } from '../auth/decorators';
import { branches, metricDefs, staff, teams } from '../db/schema';

/** Liveness + database check. Returns counts only, never personal data. */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dbs: DbService) {}

  @Get()
  async check() {
    const { db } = this.dbs;
    try {
      const [[b], [t], [s], [m]] = await Promise.all([
        db.select({ n: count() }).from(branches),
        db.select({ n: count() }).from(teams).where(eq(teams.active, true)),
        db.select({ n: count() }).from(staff).where(eq(staff.status, 'ACTIVE')),
        db.select({ n: count() }).from(metricDefs).where(and(eq(metricDefs.active, true))),
      ]);
      return {
        status: 'ok',
        service: 'dembel-hub-api',
        version: process.env.APP_VERSION ?? 'dev',
        time: new Date().toISOString(),
        database: { status: 'up', branches: b.n, teams: t.n, activeStaff: s.n, metrics: m.n },
      };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: { status: 'down' } });
    }
  }
}
