import { defineConfig } from 'prisma/config';

// Prisma CLI does not read .env on its own; Node can.
try {
  process.loadEnvFile();
} catch {
  // No .env file (CI, production): variables come from the environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations must bypass any transaction pooler. Optional here because
    // `prisma generate` (run at install and image build) needs no database.
    url: process.env.DATABASE_DIRECT_URL,
  },
});
