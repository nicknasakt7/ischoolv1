// First-run setup for a new school deployment. Run after migrations:
//   node dist/cli/school-init.js --name "โรงเรียนตัวอย่าง" --owner-email owner@school.th \
//     --owner-first-name สมชาย --owner-last-name ใจดี --owner-staff-code T0001
import { parseArgs } from 'node:util';
import { createStaffSchema } from '@ischool/contracts';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AppException } from '../common/http/app-exception.js';
import { toDateOnly } from '../common/date-only.js';
import { SchoolSetupService } from '../modules/identity/school-setup.service.js';

// `pnpm school:init -- --name ...` passes the `--` through; drop it.
const argv = process.argv.slice(2);
const { values } = parseArgs({
  args: argv[0] === '--' ? argv.slice(1) : argv,
  options: {
    name: { type: 'string' },
    'name-en': { type: 'string' },
    'owner-email': { type: 'string' },
    'owner-first-name': { type: 'string' },
    'owner-last-name': { type: 'string' },
    'owner-staff-code': { type: 'string', default: 'OWNER' },
  },
});

if (!values.name) {
  console.error('--name is required');
  process.exit(1);
}
const owner = createStaffSchema.safeParse({
  email: values['owner-email'],
  firstNameTh: values['owner-first-name'],
  lastNameTh: values['owner-last-name'],
  staffCode: values['owner-staff-code'],
  startDate: toDateOnly(new Date()),
});
if (!owner.success) {
  console.error('Invalid owner details:', owner.error.issues);
  process.exit(1);
}

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});
try {
  await app.get(SchoolSetupService).initialize({
    nameTh: values.name,
    nameEn: values['name-en'],
    owner: owner.data,
  });
  console.log(
    `School created. An invitation was emailed to ${owner.data.email}.`,
  );
} catch (error) {
  console.error(
    error instanceof AppException ? (error.detail ?? error.code) : error,
  );
  process.exitCode = 1;
} finally {
  await app.close();
}
