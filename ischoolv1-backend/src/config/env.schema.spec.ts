import { validateEnv } from './env.schema.js';

const validEnv = {
  APP_ENV: 'local',
  API_URL: 'http://localhost:3001',
  FRONTEND_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  SMTP_URL: 'smtp://localhost:1025',
  MAIL_FROM: 'iSchool <no-reply@ischool.local>',
  CORS_ORIGINS: 'http://localhost:3000, https://school-a.example.app',
  DATABASE_URL: 'postgresql://u:p@localhost:5433/db',
  DATABASE_DIRECT_URL: 'postgresql://u:p@localhost:5433/db',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_REGION: 'auto',
  STORAGE_BUCKET: 'files',
  STORAGE_ACCESS_KEY_ID: 'key',
  STORAGE_SECRET_ACCESS_KEY: 'secret',
  STORAGE_FORCE_PATH_STYLE: 'true',
};

describe('validateEnv', () => {
  it('parses lists, booleans and defaults', () => {
    const env = validateEnv(validEnv);

    expect(env.CORS_ORIGINS).toEqual([
      'http://localhost:3000',
      'https://school-a.example.app',
    ]);
    expect(env.STORAGE_FORCE_PATH_STYLE).toBe(true);
    expect(env.PORT).toBe(3001);
  });

  it('names every missing variable', () => {
    expect(() => validateEnv({ APP_ENV: 'local' })).toThrow(/DATABASE_URL/);
  });

  it('rejects an unknown APP_ENV', () => {
    expect(() => validateEnv({ ...validEnv, APP_ENV: 'prod' })).toThrow(
      /APP_ENV/,
    );
  });
});
