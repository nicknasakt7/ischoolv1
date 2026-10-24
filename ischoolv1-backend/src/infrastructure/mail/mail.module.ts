import { Global, Module } from '@nestjs/common';
import { MAILER } from './mailer.js';
import { QueuedMailer } from './queued-mailer.js';
import { SmtpTransport } from './smtp-transport.js';

@Global()
@Module({
  providers: [SmtpTransport, { provide: MAILER, useClass: QueuedMailer }],
  exports: [MAILER],
})
export class MailModule {}
