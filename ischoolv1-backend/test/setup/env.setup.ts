import { inject } from 'vitest';

// Runs before any test file is imported, so ConfigModule.forRoot() (evaluated when
// AppModule is imported) sees these values and skips the developer's .env file.
const databaseUrl = inject('databaseUrl');

Object.assign(process.env, {
  APP_ENV: 'test',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  CORS_ORIGINS: 'http://localhost:3000',
  DATABASE_URL: databaseUrl,
  DATABASE_DIRECT_URL: databaseUrl,
  STORAGE_ENDPOINT: 'http://localhost:9',
  STORAGE_REGION: 'auto',
  STORAGE_BUCKET: 'test-files',
  STORAGE_ACCESS_KEY_ID: 'test',
  STORAGE_SECRET_ACCESS_KEY: 'test',
});
