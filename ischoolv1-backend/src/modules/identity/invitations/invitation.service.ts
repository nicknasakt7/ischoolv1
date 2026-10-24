import { randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '@ischool/contracts';
import { AppException } from '../../../common/http/app-exception.js';
import { AppConfigService } from '../../../config/app-config.service.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { MAILER, type Mailer } from '../../../infrastructure/mail/mailer.js';
import { BETTER_AUTH, type BetterAuth } from '../auth/better-auth.js';
import { frontendLink, invitationEmail } from './emails.js';

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * An invitation is a password-reset token with a longer life: the invitee sets their first
 * password through Better Auth's standard `POST /auth/reset-password`, which creates the
 * password account when none exists yet. The token format must match Better Auth's
 * (`reset-password:<token>` → userId); the identity integration tests guard that.
 */
@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuth,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async invite(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { _count: { select: { accounts: true } } },
    });
    if (user._count.accounts > 0) {
      throw new AppException(ErrorCode.ALREADY_SIGNED_IN, HttpStatus.CONFLICT);
    }

    const token = randomBytes(32).toString('base64url');
    const context = await this.auth.$context;
    await context.internalAdapter.createVerificationValue({
      identifier: `reset-password:${token}`,
      value: user.id,
      expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
    });

    const school = await this.prisma.school.findFirst();
    await this.mailer.send(
      invitationEmail(
        user.email,
        user.name,
        school?.nameTh ?? 'โรงเรียน',
        frontendLink(
          this.config.get('FRONTEND_URL'),
          '/accept-invitation',
          token,
        ),
      ),
    );
  }
}
