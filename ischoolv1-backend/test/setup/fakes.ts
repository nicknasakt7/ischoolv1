import type { FileStorage } from '../../src/infrastructure/storage/file-storage.js';
import type {
  MailMessage,
  Mailer,
} from '../../src/infrastructure/mail/mailer.js';

/** Keeps sent mail in memory so tests can read invitation links. */
export class CapturingMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  lastTo(email: string): MailMessage {
    const message = this.sent.findLast((mail) => mail.to === email);
    if (!message) throw new Error(`No mail sent to ${email}`);
    return message;
  }

  /** The `token` query parameter of the last link mailed to `email`. */
  tokenFor(email: string): string {
    const url = /https?:\/\/\S+/.exec(this.lastTo(email).text)?.[0];
    const token = url && new URL(url).searchParams.get('token');
    if (!token) throw new Error(`No token in mail to ${email}`);
    return token;
  }
}

export class InMemoryFileStorage implements FileStorage {
  readonly files = new Map<string, Uint8Array>();

  async put(key: string, body: Uint8Array): Promise<void> {
    this.files.set(key, body);
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  async signedDownloadUrl(key: string): Promise<string> {
    return `https://files.test/${key}?signed=1`;
  }
}
