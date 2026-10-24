import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';

/** Boots the real AppModule (plus any test-only modules) against the test database. */
export async function createTestApp(
  extra: Pick<ModuleMetadata, 'imports' | 'controllers'> = {},
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...(extra.imports ?? [])],
    controllers: extra.controllers ?? [],
  }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  setupApp(app);
  await app.init();
  return app;
}
