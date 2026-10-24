import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { AuditModule } from './infrastructure/audit/audit.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { JobsModule } from './infrastructure/jobs/jobs.module.js';
import { LoggingModule } from './infrastructure/logging.module.js';
import { MailModule } from './infrastructure/mail/mail.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';

@Module({
  imports: [
    // Infrastructure
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    StorageModule,
    JobsModule,
    MailModule,
    AuditModule,
    // Domain modules (one per bounded context, added phase by phase)
    HealthModule,
    IdentityModule,
  ],
})
export class AppModule {}
