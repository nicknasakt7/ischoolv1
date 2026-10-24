import type { MailMessage } from '../../../infrastructure/mail/mailer.js';

/** A link into the web app carrying a one-time token, e.g. /accept-invitation?token=... */
export function frontendLink(
  frontendUrl: string,
  path: string,
  token: string,
): string {
  const url = new URL(path, frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function linkEmail(
  to: string,
  subject: string,
  lines: string[],
  action: string,
  url: string,
): MailMessage {
  return {
    to,
    subject,
    text: [...lines, '', `${action}: ${url}`].join('\n'),
    html: [
      ...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
      `<p><a href="${escapeHtml(url)}">${escapeHtml(action)}</a></p>`,
    ].join('\n'),
  };
}

export function invitationEmail(
  to: string,
  name: string,
  schoolName: string,
  url: string,
): MailMessage {
  return linkEmail(
    to,
    `คำเชิญเข้าใช้งาน iSchool ของ${schoolName}`,
    [
      `สวัสดีคุณ${name}`,
      `${schoolName} เชิญคุณเข้าใช้งานระบบ iSchool`,
      'กดลิงก์ด้านล่างเพื่อตั้งรหัสผ่าน ลิงก์นี้ใช้ได้ภายใน 7 วัน',
    ],
    'ตั้งรหัสผ่าน',
    url,
  );
}

export function passwordResetEmail(
  to: string,
  name: string,
  url: string,
): MailMessage {
  return linkEmail(
    to,
    'ตั้งรหัสผ่าน iSchool ใหม่',
    [
      `สวัสดีคุณ${name}`,
      'มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ ลิงก์นี้ใช้ได้ภายใน 1 ชั่วโมง',
      'ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้',
    ],
    'ตั้งรหัสผ่านใหม่',
    url,
  );
}
