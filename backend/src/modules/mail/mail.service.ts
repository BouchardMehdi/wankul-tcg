import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? process.env.MAIL_HOST,
    port: Number(process.env.SMTP_PORT ?? process.env.MAIL_PORT ?? 1025),
    secure: (process.env.SMTP_SECURE ?? process.env.MAIL_SECURE ?? 'false') === 'true',
    auth:
      (process.env.SMTP_USER ?? process.env.MAIL_USER) &&
      (process.env.SMTP_PASS ?? process.env.MAIL_PASS)
        ? {
            user: process.env.SMTP_USER ?? process.env.MAIL_USER,
            pass: process.env.SMTP_PASS ?? process.env.MAIL_PASS,
          }
        : undefined,
  });

  async sendVerificationCode(email: string, username: string, code: string) {
    const from = process.env.MAIL_FROM ?? 'no-reply@wankul.local';

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Code de vérification Wankul',
      text: `Bonjour ${username},

Voici ton code de vérification : ${code}

Il expire dans 15 minutes.`,
    });
  }

  async sendPasswordResetCode(email: string, username: string, code: string) {
    const from = process.env.MAIL_FROM ?? 'no-reply@wankul.local';

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Réinitialisation du mot de passe Wankul',
      text: `Bonjour ${username},

Voici ton code de réinitialisation : ${code}

Il expire dans 15 minutes.

Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.`,
    });
  }
}