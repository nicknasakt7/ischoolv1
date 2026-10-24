import { Body, Controller, type INestApplication, Post } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { inject } from 'vitest';
import { createTestApp } from './setup/test-app.js';

const echoSchema = z.object({
  firstName: z.string().min(1),
  dob: z.iso.date(),
});

@Controller('test-echo')
class EchoController {
  @Post()
  echo(@Body({ schema: echoSchema }) body: z.infer<typeof echoSchema>) {
    return body;
  }
}

describe('HTTP layer', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [EchoController] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports readiness with the database up', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('accepts a body that matches its Zod schema', async () => {
    await request(app.getHttpServer())
      .post('/test-echo')
      .send({ firstName: 'Somchai', dob: '2015-06-01', extra: 'dropped' })
      .expect(201, { firstName: 'Somchai', dob: '2015-06-01' });
  });

  it('rejects an invalid body with field errors as Problem Details', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-echo')
      .send({ firstName: '', dob: 'yesterday' })
      .expect(422)
      .expect('content-type', /application\/problem\+json/);

    expect(response.body).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      instance: '/test-echo',
    });
    expect(Object.keys(response.body.errors).sort()).toEqual([
      'dob',
      'firstName',
    ]);
  });

  it('answers unknown routes with a NOT_FOUND problem', async () => {
    const response = await request(app.getHttpServer())
      .get('/does-not-exist')
      .expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
  });
});

describe('test environment', () => {
  it('uses the throwaway database, never the developer .env', async () => {
    const { AppConfigService } =
      await import('../src/config/app-config.service.js');
    const app = await createTestApp();
    const config = app.get(AppConfigService);

    expect(config.get('APP_ENV')).toBe('test');
    expect(config.get('DATABASE_URL')).toBe(inject('databaseUrl'));
    await app.close();
  });
});
