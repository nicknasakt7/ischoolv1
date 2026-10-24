import type { INestApplication } from '@nestjs/common';
import { AuditLogService } from '../src/infrastructure/audit/audit-log.service.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { createTestApp } from './setup/test-app.js';

describe('AuditLogService', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let audit: AuditLogService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    audit = app.get(AuditLogService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('commits the audit row together with the change', async () => {
    await prisma.$transaction((tx) =>
      audit.record(
        {
          actorId: 'teacher-1',
          action: 'grade.updated',
          entityType: 'grade',
          entityId: 'committed',
          before: { value: 2.5 },
          after: { value: 3 },
        },
        tx,
      ),
    );

    const rows = await prisma.auditLog.findMany({
      where: { entityId: 'committed' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      before: { value: 2.5 },
      after: { value: 3 },
    });
  });

  it('rolls the audit row back when the change fails', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await audit.record(
          {
            actorId: 'teacher-1',
            action: 'grade.updated',
            entityType: 'grade',
            entityId: 'rolled-back',
          },
          tx,
        );
        throw new Error('the grade update failed');
      }),
    ).rejects.toThrow('the grade update failed');

    expect(
      await prisma.auditLog.count({ where: { entityId: 'rolled-back' } }),
    ).toBe(0);
  });
});
