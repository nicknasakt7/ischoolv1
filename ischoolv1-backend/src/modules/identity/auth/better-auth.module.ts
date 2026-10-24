import { Global, Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppConfigService } from '../../../config/app-config.service.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { MAILER, type Mailer } from '../../../infrastructure/mail/mailer.js';
import { ActorService } from '../access/actor.service.js';
import { frontendLink, passwordResetEmail } from '../invitations/emails.js';
import { BETTER_AUTH, createBetterAuth } from './better-auth.js';

@Global()
@Module({
  providers: [
    ActorService,
    {
      provide: BETTER_AUTH,
      inject: [AppConfigService, PrismaService, ActorService, MAILER],
      useFactory: (
        config: AppConfigService,
        prisma: PrismaService,
        actors: ActorService,
        mailer: Mailer,
      ) =>
        createBetterAuth({
          env: {
            APP_ENV: config.get('APP_ENV'),
            API_URL: config.get('API_URL'),
            BETTER_AUTH_SECRET: config.get('BETTER_AUTH_SECRET'),
            CORS_ORIGINS: config.get('CORS_ORIGINS'),
            GOOGLE_CLIENT_ID: config.get('GOOGLE_CLIENT_ID'),
            GOOGLE_CLIENT_SECRET: config.get('GOOGLE_CLIENT_SECRET'),
          },
          prisma,
          hasActiveProfile: (userId) => actors.hasActiveProfile(userId),
          sendPasswordReset: (user, token) =>
            mailer.send(
              passwordResetEmail(
                user.email,
                user.name,
                frontendLink(
                  config.get('FRONTEND_URL'),
                  '/reset-password',
                  token,
                ),
              ),
            ),
        }),
    },
  ],
  exports: [BETTER_AUTH, ActorService],
})
class BetterAuthProviderModule {}

/**
 * Mounts Better Auth's routes under /auth (sign-in, sign-out, reset-password, ...).
 * Route protection is ours (AccessGuard), so the adapter's global guard is off.
 */
export const BetterAuthModule = AuthModule.forRootAsync({
  imports: [BetterAuthProviderModule],
  inject: [BETTER_AUTH],
  useFactory: (auth: unknown) => ({ auth }),
  disableGlobalAuthGuard: true,
});

export { BetterAuthProviderModule };
