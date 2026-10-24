export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Sends email. The app's implementation queues messages so a slow or failing SMTP server never blocks a request. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');
