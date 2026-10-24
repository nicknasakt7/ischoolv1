import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        // Runs against a real PostgreSQL started by Testcontainers (needs Docker).
        extends: true,
        test: {
          name: 'integration',
          include: ['test/**/*.int-spec.ts'],
          globalSetup: ['test/setup/postgres.global-setup.ts'],
          setupFiles: ['test/setup/env.setup.ts'],
          testTimeout: 60_000,
          hookTimeout: 120_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
