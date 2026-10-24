import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PgBoss, type SendOptions } from 'pg-boss';
import { AppConfigService } from '../../config/app-config.service.js';

/**
 * Background work (AI, email, PDFs, bulk invoicing) and schedules (remediation deadlines,
 * attendance alerts). The queue lives in PostgreSQL via pg-boss; see ADR 0005.
 */
@Injectable()
export class JobQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueue.name);
  private readonly boss: PgBoss;

  constructor(config: AppConfigService) {
    // The queue holds sessions open, so it must not go through a transaction pooler.
    this.boss = new PgBoss(config.get('DATABASE_DIRECT_URL'));
    this.boss.on('error', (error) => this.logger.error(error));
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss.stop({ graceful: true });
  }

  /** Creates the queue if needed and starts processing it. */
  async register<T extends object>(
    name: string,
    handler: (data: T) => Promise<void>,
  ): Promise<void> {
    await this.boss.createQueue(name);
    await this.boss.work<T>(name, async (jobs) => {
      for (const job of jobs) {
        await handler(job.data);
      }
    });
  }

  async send<T extends object>(
    name: string,
    data: T,
    options?: SendOptions,
  ): Promise<string | null> {
    return this.boss.send(name, data, options);
  }

  /** Runs `name` on a cron schedule (in the server's time zone unless options say otherwise). */
  async schedule(name: string, cron: string): Promise<void> {
    await this.boss.createQueue(name);
    await this.boss.schedule(name, cron);
  }
}
