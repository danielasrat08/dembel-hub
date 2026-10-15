import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ALLOW_PENDING_PW, IS_PUBLIC, ROLES } from './decorators';
import { COOKIE, RoleCode, SessionService } from './session.service';

/** Global guard: every route needs a valid session unless marked @Public(). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly sessions: SessionService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>();
    // Basic CSRF defence: state-changing requests must be JSON (browsers can't send that cross-site without CORS).
    const hasBody = (req.headers['content-length'] ?? '0') !== '0' || req.headers['transfer-encoding'] !== undefined;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && hasBody && !req.is('application/json'))
      throw new ForbiddenException('Requests must be sent as JSON.');

    const user = await this.sessions.resolve(req.cookies?.[COOKIE]);
    if (!user) throw new UnauthorizedException('Please sign in.');
    req.user = user;

    if (user.mustChangePassword && !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PW, targets))
      throw new ForbiddenException({ message: 'Change your temporary password first.', code: 'PASSWORD_CHANGE_REQUIRED' });

    const roles = this.reflector.getAllAndOverride<RoleCode[] | undefined>(ROLES, targets);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('Your role cannot do this.');
    return true;
  }
}
