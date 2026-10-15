import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { RoleCode } from './session.service';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Route needs no sign-in. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Route is limited to these roles. */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES, roles);
/** Lets a signed-in user with mustChangePassword call this route (only the change-password routes). */
export const ALLOW_PENDING_PW = 'allowPendingPw';
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PENDING_PW, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
