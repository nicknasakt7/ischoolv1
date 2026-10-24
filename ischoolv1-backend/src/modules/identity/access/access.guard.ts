import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode, type Permission } from '@ischool/contracts';
import { fromNodeHeaders } from 'better-auth/node';
import { AppException } from '../../../common/http/app-exception.js';
import { BETTER_AUTH, type BetterAuth } from '../auth/better-auth.js';
import { ActorService } from './actor.service.js';
import {
  PUBLIC_KEY,
  REQUIRED_PERMISSION_KEY,
  type RequestWithActor,
} from './decorators.js';
import { isDueForRefresh, isStaffSessionIdle } from './session-policy.js';

/**
 * Runs on every route: resolves the session, enforces profile and idle rules, then
 * checks the route's required permission. See the identity rules in GLOSSARY.md.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuth,
    private readonly actors: ActorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithActor>();
    const headers = fromNodeHeaders(request.headers);
    // Read without refreshing: a refresh would slide expiresAt and hide how long it sat idle.
    const session = await this.auth.api.getSession({
      headers,
      query: { disableRefresh: true },
    });
    if (!session) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const actor = await this.actors.load(session.user.id);
    if (!actor?.hasActiveProfile) {
      await this.actors.endAllSessions(session.user.id);
      throw new AppException(
        ErrorCode.SESSION_ENDED,
        HttpStatus.UNAUTHORIZED,
        'The account no longer has an active profile.',
      );
    }
    const now = new Date();
    if (actor.staff && isStaffSessionIdle(session.session.expiresAt, now)) {
      await this.auth.api.revokeSession({
        headers,
        body: { token: session.session.token },
      });
      throw new AppException(
        ErrorCode.SESSION_ENDED,
        HttpStatus.UNAUTHORIZED,
        'The staff session sat idle for too long.',
      );
    }

    if (isDueForRefresh(session.session.expiresAt, now)) {
      await this.auth.api.getSession({ headers });
    }

    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      REQUIRED_PERMISSION_KEY,
      targets,
    );
    if (permission && !actor.can(permission)) {
      throw new AppException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    request.actor = actor;
    return true;
  }
}
