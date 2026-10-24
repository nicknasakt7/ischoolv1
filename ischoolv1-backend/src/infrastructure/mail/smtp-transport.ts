import { Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service.js';
import type { MailMessage } from './mailer.js';

/** Delivers a message right now. Only the mail queue worker calls this. */
@Injectable()
export class SmtpTransport {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: AppConfigService) {
    this.transporter = nodemailer.createTransport(config.get('SMTP_URL'));
    this.from = config.get('MAIL_FROM');
  }

  async deliver(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
