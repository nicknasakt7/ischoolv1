import { execFileSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/** One throwaway PostgreSQL per test run, migrated exactly like production (`migrate deploy`). */
export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_DIRECT_URL: databaseUrl },
    stdio: 'inherit',
  });

  project.provide('databaseUrl', databaseUrl);

  return async () => {
    await container.stop();
  };
}
