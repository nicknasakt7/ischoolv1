import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Permission } from '@ischool/contracts';
import type { Request } from 'express';
import type { Actor } from './actor.js';

/** Same metadata key the Better Auth Nest adapter uses for anonymous routes. */
export const PUBLIC_KEY = 'PUBLIC';
export const REQUIRED_PERMISSION_KEY = 'REQUIRED_PERMISSION';

/** No sign-in needed. Every other route requires an active session. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/**
 * The actor needs this permission school-wide. Scoped checks (one Learning Area,
 * one Grade Level) happen in the service with `actor.can(permission, scope)`.
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);

export type RequestWithActor = Request & { actor?: Actor };

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const actor = context.switchToHttp().getRequest<RequestWithActor>().actor;
    if (!actor) throw new Error('CurrentActor used on a public route');
    return actor;
  },
);
