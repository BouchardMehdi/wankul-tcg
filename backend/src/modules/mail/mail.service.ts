import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
    // ✅ MailHog = pas d'auth. En prod tu peux remettre user/pass via env.
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  async sendVerificationCode(email: string, username: string, code: string) {
    const from = process.env.MAIL_FROM ?? 'no-reply@wankul.local';

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Code de vérification Wankul',
      text: `Bonjour ${username},\n\nVoici ton code de vérification : ${code}\n\nIl expire dans 15 minutes.`,
    });
  }
}
