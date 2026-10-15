import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { DbService } from '../db/service/db.service';
import { sessions, staff, teamMemberships, teams } from '../db/schema';
import { isNull } from 'drizzle-orm';

export type RoleCode = (typeof staff.$inferSelect)['role'];

export interface SessionUser {
  id: string;
  branchId: string;
  staffCode: string;
  fullName: string;
  role: RoleCode;
  mustChangePassword: boolean;
  preferredLang: 'EN' | 'AM';
  team: { id: string; code: string; name: string } | null;
  sessionId: string;
}

export const COOKIE = 'dh_session';
const IDLE_MS = 12 * 60 * 60 * 1000; // sign out after 12 h without activity
const MAX_MS = 7 * 24 * 60 * 60 * 1000; // and after 7 days at most

const sha = (t: string) => createHash('sha256').update(t).digest('hex');

@Injectable()
export class SessionService {
  constructor(private readonly dbs: DbService) {}

  async create(staffId: string, ip?: string, userAgent?: string) {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    await this.dbs.db.insert(sessions).values({
      staffId, tokenHash: sha(token), ip: ip ?? null, userAgent: userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(now + MAX_MS), lastSeenAt: new Date(now),
    });
    return { token, maxAgeMs: MAX_MS };
  }

  /** Returns the signed-in user, or null if the token is unknown, expired, idle too long, or the staff member is not active. */
  async resolve(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const { db } = this.dbs;
    const now = new Date();
    const [row] = await db
      .select({ s: sessions, u: staff })
      .from(sessions)
      .innerJoin(staff, eq(staff.id, sessions.staffId))
      .where(and(eq(sessions.tokenHash, sha(token)), gt(sessions.expiresAt, now)));
    if (!row) return null;
    if (now.getTime() - row.s.lastSeenAt.getTime() > IDLE_MS || row.u.status !== 'ACTIVE') {
      await db.delete(sessions).where(eq(sessions.id, row.s.id));
      return null;
    }
    // Touch at most once a minute
    if (now.getTime() - row.s.lastSeenAt.getTime() > 60_000)
      await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.s.id));

    const [tm] = await db
      .select({ id: teams.id, code: teams.code, name: teams.name })
      .from(teamMemberships)
      .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
      .where(and(eq(teamMemberships.staffId, row.u.id), isNull(teamMemberships.endDate)))
      .limit(1);
    const [led] = tm ? [] : await db.select({ id: teams.id, code: teams.code, name: teams.name }).from(teams).where(eq(teams.supervisorId, row.u.id)).limit(1);

    return {
      id: row.u.id, branchId: row.u.branchId, staffCode: row.u.staffCode, fullName: row.u.fullName, role: row.u.role,
      mustChangePassword: row.u.mustChangePassword, preferredLang: row.u.preferredLang, team: tm ?? led ?? null, sessionId: row.s.id,
    };
  }

  async destroy(sessionId: string) {
    await this.dbs.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  /** Ends every session of a staff member, optionally keeping one (the current device). */
  async destroyAllFor(staffId: string, keepSessionId?: string) {
    const all = await this.dbs.db.select({ id: sessions.id }).from(sessions).where(eq(sessions.staffId, staffId));
    for (const s of all) if (s.id !== keepSessionId) await this.dbs.db.delete(sessions).where(eq(sessions.id, s.id));
  }

  async purgeExpired() {
    await this.dbs.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}
