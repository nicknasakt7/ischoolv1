import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username } from 'better-auth/plugins/username';
import type { Env } from '../../../config/env.schema.js';
import type { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import {
  SESSION_LIFETIME_DAYS,
  SESSION_REFRESH_DAYS,
} from '../access/session-policy.js';

const DAY_SECONDS = 24 * 60 * 60;

export interface BetterAuthDeps {
  env: Pick<
    Env,
    | 'APP_ENV'
    | 'API_URL'
    | 'BETTER_AUTH_SECRET'
    | 'CORS_ORIGINS'
    | 'GOOGLE_CLIENT_ID'
    | 'GOOGLE_CLIENT_SECRET'
  >;
  prisma: PrismaService;
  /** Sign-in is refused for users with no active profile (e.g. staff who left). */
  hasActiveProfile: (userId: string) => Promise<boolean>;
  sendPasswordReset: (
    user: { email: string; name: string },
    token: string,
  ) => Promise<void>;
}

export function createBetterAuth(deps: BetterAuthDeps) {
  const { env } = deps;
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            // Accounts come only from invitations; Google can sign in existing users.
            disableSignUp: true,
          },
        }
      : {};

  return betterAuth({
    appName: 'iSchool',
    baseURL: env.API_URL,
    basePath: '/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.CORS_ORIGINS,
    database: prismaAdapter(deps.prisma, { provider: 'postgresql' }),
    advanced: {
      // Ids come from the database default (UUIDv7), like every other table.
      database: { generateId: false },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, token }) =>
        deps.sendPasswordReset(user, token),
    },
    socialProviders: google,
    session: {
      expiresIn: SESSION_LIFETIME_DAYS * DAY_SECONDS,
      updateAge: SESSION_REFRESH_DAYS * DAY_SECONDS,
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) =>
            (await deps.hasActiveProfile(session.userId)) ? true : false,
        },
      },
    },
    plugins: [username()],
    rateLimit: { enabled: env.APP_ENV !== 'test' },
    telemetry: { enabled: false },
  });
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;
export const BETTER_AUTH = Symbol('BETTER_AUTH');
