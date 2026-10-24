import type { INestApplication } from '@nestjs/common';
import { ALL_PERMISSIONS, Permission } from '@ischool/contracts';
import request from 'supertest';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MAILER } from '../src/infrastructure/mail/mailer.js';
import { FILE_STORAGE } from '../src/infrastructure/storage/file-storage.js';
import { SchoolSetupService } from '../src/modules/identity/school-setup.service.js';
import { CapturingMailer, InMemoryFileStorage } from './setup/fakes.js';
import { createTestApp, resetDatabase } from './setup/test-app.js';

const ORIGIN = 'http://localhost:3000';
const OWNER_EMAIL = 'owner@school.test';
const PASSWORD = 'correct-horse-battery';

describe('Identity', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mailer = new CapturingMailer();
  const storage = new InMemoryFileStorage();
  let owner: ReturnType<typeof request.agent>;

  /** Accepts the invitation mailed to `email` and returns a signed-in agent. */
  async function acceptInvitationAndSignIn(email: string) {
    const http = app.getHttpServer();
    await request(http)
      .post('/auth/reset-password')
      .set('origin', ORIGIN)
      .send({ token: mailer.tokenFor(email), newPassword: PASSWORD })
      .expect(200);
    return signIn(email);
  }

  async function signIn(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/sign-in/email')
      .set('origin', ORIGIN)
      .send({ email, password: PASSWORD })
      .expect(200);
    return agent;
  }

  async function createStaff(email: string, staffCode: string) {
    const response = await owner
      .post('/staff')
      .send({
        email,
        staffCode,
        firstNameTh: 'สมหญิง',
        lastNameTh: 'รักเรียน',
        startDate: '2026-05-16',
      })
      .expect(201);
    return response.body as { id: string; userId: string };
  }

  beforeAll(async () => {
    app = await createTestApp({
      overrides: [
        { provide: MAILER, useValue: mailer },
        { provide: FILE_STORAGE, useValue: storage },
      ],
    });
    prisma = app.get(PrismaService);
    await resetDatabase(app);

    await app.get(SchoolSetupService).initialize({
      nameTh: 'โรงเรียนทดสอบ',
      owner: {
        email: OWNER_EMAIL,
        staffCode: 'OWNER',
        firstNameTh: 'สมชาย',
        lastNameTh: 'ใจดี',
        startDate: '2026-05-01',
      },
    });
    owner = await acceptInvitationAndSignIn(OWNER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('school setup', () => {
    it('emails the owner a Thai invitation that links to the web app', () => {
      const mail = mailer.lastTo(OWNER_EMAIL);
      expect(mail.subject).toContain('โรงเรียนทดสอบ');
      expect(mail.text).toContain(`${ORIGIN}/accept-invitation?token=`);
    });

    it('gives the owner every permission through the School Owner role', async () => {
      const response = await owner.get('/me').expect(200);

      expect(response.body.profiles.staff.staffCode).toBe('OWNER');
      const permissions = response.body.grants.map(
        (grant: { permission: string }) => grant.permission,
      );
      expect(permissions.sort()).toEqual([...ALL_PERMISSIONS].sort());
    });

    it('refuses to set up a second school', async () => {
      await expect(
        app.get(SchoolSetupService).initialize({
          nameTh: 'อีกโรงเรียน',
          owner: {
            email: 'other@school.test',
            staffCode: 'X',
            firstNameTh: 'ก',
            lastNameTh: 'ข',
            startDate: '2026-05-01',
          },
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('sign-in rules', () => {
    it('rejects anonymous requests and keeps public routes open', async () => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .expect(401);
      expect(response.body.code).toBe('UNAUTHENTICATED');

      await request(app.getHttpServer()).get('/health/live').expect(200);
    });

    it('has no self sign-up', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up/email')
        .set('origin', ORIGIN)
        .send({ email: 'stranger@x.test', password: PASSWORD, name: 'X' });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(
        await prisma.user.count({ where: { email: 'stranger@x.test' } }),
      ).toBe(0);
    });

    it('lets an invitation token be used only once', async () => {
      await createStaff('once@school.test', 'T-ONCE');
      const token = mailer.tokenFor('once@school.test');
      const http = app.getHttpServer();

      await request(http)
        .post('/auth/reset-password')
        .set('origin', ORIGIN)
        .send({ token, newPassword: PASSWORD })
        .expect(200);
      await request(http)
        .post('/auth/reset-password')
        .set('origin', ORIGIN)
        .send({ token, newPassword: 'another-password-1' })
        .expect(400);
    });

    it('ends an idle staff session after 7 days', async () => {
      await createStaff('idle@school.test', 'T-IDLE');
      const idle = await acceptInvitationAndSignIn('idle@school.test');
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: 'idle@school.test' },
      });
      // Last refreshed 8 days ago: expiresAt = refreshedAt + 30 days.
      const day = 24 * 60 * 60 * 1000;
      await prisma.session.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 8 * day + 30 * day) },
      });

      const response = await idle.get('/me').expect(401);
      expect(response.body.code).toBe('SESSION_ENDED');
    });
  });

  describe('staff', () => {
    it('invites new staff and rejects a duplicate email', async () => {
      const staff = await createStaff('teacher@school.test', 'T-001');

      expect(mailer.lastTo('teacher@school.test').subject).toContain('คำเชิญ');
      const detail = await owner.get(`/staff/${staff.id}`).expect(200);
      expect(detail.body).toMatchObject({
        staffCode: 'T-001',
        employmentStatus: 'ACTIVE',
        hasSignedIn: false,
        employmentPeriods: [{ startDate: '2026-05-16', endDate: null }],
      });

      const duplicate = await owner
        .post('/staff')
        .send({
          email: 'teacher@school.test',
          staffCode: 'T-999',
          firstNameTh: 'ซ้ำ',
          lastNameTh: 'ซ้ำ',
          startDate: '2026-05-16',
        })
        .expect(409);
      expect(duplicate.body.code).toBe('EMAIL_TAKEN');
    });

    it('records staff changes in the audit log', async () => {
      const staff = await createStaff('audited@school.test', 'T-AUD');

      const rows = await prisma.auditLog.findMany({
        where: { entityId: staff.id, action: 'staff.created' },
      });
      expect(rows).toHaveLength(1);
    });

    it('signs a staff member out everywhere when employment ends', async () => {
      const staff = await createStaff('leaver@school.test', 'T-LEAVE');
      const leaver = await acceptInvitationAndSignIn('leaver@school.test');
      await leaver.get('/me').expect(200);

      await owner
        .post(`/staff/${staff.id}/end-employment`)
        .send({ endDate: '2027-03-31', reason: 'RESIGNED' })
        .expect(200);

      await leaver.get('/me').expect(401);
      await request(app.getHttpServer())
        .post('/auth/sign-in/email')
        .set('origin', ORIGIN)
        .send({ email: 'leaver@school.test', password: PASSWORD })
        .expect((response) =>
          expect(response.status).toBeGreaterThanOrEqual(400),
        );
    });

    it('keeps history across a rehire', async () => {
      const staff = await createStaff('returner@school.test', 'T-RET');
      await owner
        .post(`/staff/${staff.id}/end-employment`)
        .send({ endDate: '2027-03-31', reason: 'RESIGNED' })
        .expect(200);

      const response = await owner
        .post(`/staff/${staff.id}/rehire`)
        .send({ startDate: '2028-05-16' })
        .expect(200);

      expect(response.body.employmentStatus).toBe('ACTIVE');
      expect(response.body.employmentPeriods).toEqual([
        {
          startDate: '2026-05-16',
          endDate: '2027-03-31',
          endReason: 'RESIGNED',
        },
        { startDate: '2028-05-16', endDate: null, endReason: null },
      ]);
    });

    it('deletes the old photo when a new one is uploaded', async () => {
      const staff = await createStaff('photo@school.test', 'T-PHOTO');
      const upload = (name: string) =>
        owner
          .put(`/staff/${staff.id}/photo`)
          .attach('file', Buffer.from('fake-image'), {
            filename: name,
            contentType: 'image/png',
          })
          .expect(200);

      const first = await upload('a.png');
      const firstKey = [...storage.files.keys()].find((key) =>
        key.startsWith(`staff/${staff.id}/`),
      );
      await upload('b.png');

      expect(first.body.photoUrl).toContain('signed=1');
      expect(firstKey && storage.files.has(firstKey)).toBe(false);
      expect(
        [...storage.files.keys()].filter((key) =>
          key.startsWith(`staff/${staff.id}/`),
        ),
      ).toHaveLength(1);
    });

    it('rejects a file that is not an image', async () => {
      const staff = await createStaff('pdf@school.test', 'T-PDF');
      const response = await owner
        .put(`/staff/${staff.id}/photo`)
        .attach('file', Buffer.from('%PDF'), {
          filename: 'cv.pdf',
          contentType: 'application/pdf',
        })
        .expect(422);
      expect(response.body.code).toBe('UNSUPPORTED_FILE');
    });
  });

  describe('roles and permissions', () => {
    it('grants access only through an assigned role', async () => {
      const staff = await createStaff('registrar@school.test', 'T-REG');
      const registrar = await acceptInvitationAndSignIn(
        'registrar@school.test',
      );
      const forbidden = await registrar.get('/staff').expect(403);
      expect(forbidden.body.code).toBe('FORBIDDEN');

      const role = await owner
        .post('/roles')
        .send({ name: 'งานทะเบียน', permissions: [Permission.STAFF_READ] })
        .expect(201);
      await owner
        .post(`/roles/${role.body.id}/assignments`)
        .send({ userId: staff.userId })
        .expect(201);

      await registrar.get('/staff').expect(200);
      await registrar
        .post('/staff')
        .send({})
        .expect((response) => expect(response.status).toBe(403));
    });

    it('does not let a scoped grant act school-wide', async () => {
      const staff = await createStaff('head@school.test', 'T-HEAD');
      const head = await acceptInvitationAndSignIn('head@school.test');
      const role = await owner
        .post('/roles')
        .send({
          name: 'หัวหน้ากลุ่มสาระ',
          permissions: [Permission.STAFF_READ],
        })
        .expect(201);
      await owner
        .post(`/roles/${role.body.id}/assignments`)
        .send({
          userId: staff.userId,
          scopeType: 'LEARNING_AREA',
          scopeId: '0190a000-0000-7000-8000-000000000001',
        })
        .expect(201);

      await head.get('/staff').expect(403);
    });

    it('locks the School Owner role', async () => {
      const roles = await owner.get('/roles').expect(200);
      const schoolOwner = roles.body.find(
        (role: { isSystem: boolean }) => role.isSystem,
      );

      const response = await owner
        .patch(`/roles/${schoolOwner.id}`)
        .send({ name: 'Renamed' })
        .expect(409);
      expect(response.body.code).toBe('SYSTEM_ROLE_LOCKED');
    });

    it('never removes the last School Owner', async () => {
      const me = await owner.get('/me').expect(200);
      const ownerStaff = await prisma.staff.findUniqueOrThrow({
        where: { userId: me.body.userId },
      });

      const ending = await owner
        .post(`/staff/${ownerStaff.id}/end-employment`)
        .send({ endDate: '2027-03-31', reason: 'RETIRED' })
        .expect(409);
      expect(ending.body.code).toBe('LAST_SCHOOL_OWNER');

      const assignment = await prisma.roleAssignment.findFirstOrThrow({
        where: { userId: me.body.userId, role: { isSystem: true } },
      });
      const revoking = await owner
        .delete(`/role-assignments/${assignment.id}`)
        .expect(409);
      expect(revoking.body.code).toBe('LAST_SCHOOL_OWNER');
    });
  });
});
