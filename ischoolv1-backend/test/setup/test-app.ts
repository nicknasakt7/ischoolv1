import type { INestApplication, ModuleMetadata, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';

type TestOverrideToken = symbol | string | Type;

/** Boots the real AppModule (plus any test-only modules) against the test database. */
export async function createTestApp(
  extra: Pick<ModuleMetadata, 'imports' | 'controllers'> & {
    /** Replace providers, e.g. the mailer or file storage, with test doubles. */
    overrides?: { provide: TestOverrideToken; useValue: unknown }[];
  } = {},
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule, ...(extra.imports ?? [])],
    controllers: extra.controllers ?? [],
  });
  for (const override of extra.overrides ?? []) {
    builder = builder
      .overrideProvider(override.provide)
      .useValue(override.useValue);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication({
    bufferLogs: true,
    bodyParser: false,
  });
  setupApp(app);
  await app.init();
  return app;
}

/** Empties every application table so each test file starts from a fresh school. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
