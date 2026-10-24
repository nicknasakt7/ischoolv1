import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { JobQueue } from '../jobs/job-queue.js';
import type { MailMessage, Mailer } from './mailer.js';
import { SmtpTransport } from './smtp-transport.js';

const MAIL_QUEUE = 'mail.send';

/** Puts mail on the job queue; the worker delivers it over SMTP with pg-boss retries. */
@Injectable()
export class QueuedMailer implements Mailer, OnApplicationBootstrap {
  constructor(
    private readonly jobs: JobQueue,
    private readonly transport: SmtpTransport,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.jobs.register<MailMessage>(MAIL_QUEUE, (message) =>
      this.transport.deliver(message),
    );
  }

  async send(message: MailMessage): Promise<void> {
    await this.jobs.send(MAIL_QUEUE, message, {
      retryLimit: 5,
      retryBackoff: true,
    });
  }
}
