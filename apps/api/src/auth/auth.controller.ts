import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DbService } from '../db/service/db.service';
import { staff } from '../db/schema';
import { AuditService } from '../common/audit.service';
import { ZodPipe } from '../common/zod.pipe';
import { normalizePhone } from '../common/phone';
import { AllowPendingPasswordChange, CurrentUser, Public } from './decorators';
import { COOKIE, SessionService, SessionUser } from './session.service';
import { hashPassword, passwordProblem, verifyPassword } from './passwords';
import { clearFailures, isLocked, minutesUntilUnlock, recordFailure } from './rate-limit';

const LoginBody = z.object({ login: z.string().trim().min(3).max(40), password: z.string().min(1).max(200) });
const ChangeBody = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(1).max(200) });
const LangBody = z.object({ lang: z.enum(['EN', 'AM']) });

// Used when no account matches, so a wrong ID takes as long as a wrong password.
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$2dP1sEaMZuSWW5bQ8cUMLg$3yj5yFuiMeokSRQg1vRy1dpca9mq0nuk0LzoBmIAOME';

function cookieOpts(req: Request, maxAge?: number) {
  const secure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', ...(maxAge ? { maxAge } : {}) };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly dbs: DbService, private readonly sessions: SessionService, private readonly audit: AuditService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodPipe(LoginBody)) body: z.infer<typeof LoginBody>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const loginKey = body.login.toUpperCase();
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.ip;
    if (isLocked(loginKey) || isLocked(`ip:${ip}`))
      throw new HttpException(`Too many failed attempts. Try again in ${Math.max(minutesUntilUnlock(loginKey), minutesUntilUnlock(`ip:${ip}`))} minutes.`, HttpStatus.TOO_MANY_REQUESTS);

    const phone = normalizePhone(body.login);
    const [u] = await this.dbs.db.select().from(staff)
      .where(phone ? eq(staff.phone, phone) : sql`upper(${staff.staffCode}) = ${loginKey}`).limit(1);

    const ok = await verifyPassword(u?.passwordHash ?? DUMMY_HASH, body.password);
    if (!u || !ok || u.status !== 'ACTIVE') {
      recordFailure(loginKey);
      recordFailure(`ip:${ip}`);
      if (u) await this.audit.log({ branchId: u.branchId, actorId: u.id, action: 'LOGIN_FAILED', entity: 'staff', entityId: u.id, after: { ip } });
      // Same message for every case, so it doesn't reveal which IDs exist.
      throw new UnauthorizedException('Staff ID, phone number or password is not correct, or the account is not active.');
    }
    clearFailures(loginKey);

    const { token, maxAgeMs } = await this.sessions.create(u.id, ip, req.headers['user-agent']);
    await this.dbs.db.update(staff).set({ lastLoginAt: new Date() }).where(eq(staff.id, u.id));
    await this.audit.log({ branchId: u.branchId, actorId: u.id, action: 'LOGIN', entity: 'staff', entityId: u.id, after: { ip } });
    res.cookie(COOKIE, token, cookieOpts(req, maxAgeMs));
    return { ok: true, mustChangePassword: u.mustChangePassword };
  }

  @Post('logout')
  @HttpCode(200)
  @AllowPendingPasswordChange()
  async logout(@CurrentUser() user: SessionUser, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.destroy(user.sessionId);
    res.clearCookie(COOKIE, cookieOpts(req));
    return { ok: true };
  }

  @Get('me')
  @AllowPendingPasswordChange()
  me(@CurrentUser() user: SessionUser) {
    const { sessionId: _s, ...rest } = user;
    return rest;
  }

  @Post('change-password')
  @HttpCode(200)
  @AllowPendingPasswordChange()
  async changePassword(@CurrentUser() user: SessionUser, @Body(new ZodPipe(ChangeBody)) body: z.infer<typeof ChangeBody>) {
    const [u] = await this.dbs.db.select().from(staff).where(eq(staff.id, user.id));
    if (!(await verifyPassword(u.passwordHash, body.currentPassword))) throw new BadRequestException('Your current password is not correct.');
    if (body.newPassword === body.currentPassword) throw new BadRequestException('Choose a new password that is different from the current one.');
    const problem = passwordProblem(body.newPassword, u.staffCode);
    if (problem) throw new BadRequestException(problem);

    await this.dbs.db.update(staff).set({ passwordHash: await hashPassword(body.newPassword), mustChangePassword: false }).where(eq(staff.id, u.id));
    await this.sessions.destroyAllFor(u.id, user.sessionId); // sign out other devices
    await this.audit.log({ branchId: u.branchId, actorId: u.id, action: 'PASSWORD_CHANGED', entity: 'staff', entityId: u.id });
    return { ok: true };
  }

  @Post('language')
  @HttpCode(200)
  @AllowPendingPasswordChange()
  async language(@CurrentUser() user: SessionUser, @Body(new ZodPipe(LangBody)) body: z.infer<typeof LangBody>) {
    await this.dbs.db.update(staff).set({ preferredLang: body.lang }).where(eq(staff.id, user.id));
    return { ok: true };
  }
}
