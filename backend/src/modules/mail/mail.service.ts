import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type SendBugReportInput = {
  reportId: number;
  username: string;
  email: string;
  category: string;
  page: string;
  feature: string;
  priority: string;
  description: string;
  reproductionSteps?: string;
  currentUrl?: string;
  browserInfo?: string;
  screenshotUrl?: string;
  reportedAt: Date;
};

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

  async sendBugReport(input: SendBugReportInput) {
    const from = process.env.MAIL_FROM ?? 'no-reply@wankul.local';
    const supportEmail =
      process.env.SUPPORT_EMAIL ??
      process.env.MAIL_TO ??
      process.env.MAIL_FROM ??
      'no-reply@wankul.local';

    const lines = [
      `Nouveau signalement Wankul`,
      ``,
      `Ticket #${input.reportId}`,
      `Utilisateur : ${input.username}`,
      `Email : ${input.email}`,
      `Catégorie : ${input.category}`,
      `Page : ${input.page}`,
      `Fonction : ${input.feature}`,
      `Priorité : ${input.priority}`,
      `Date : ${input.reportedAt.toISOString()}`,
      ``,
      `Description :`,
      input.description,
      ``,
      `Étapes pour reproduire :`,
      input.reproductionSteps?.trim() || 'Non renseigné',
      ``,
      `URL : ${input.currentUrl?.trim() || 'Non renseignée'}`,
      `Navigateur : ${input.browserInfo?.trim() || 'Non renseigné'}`,
      `Capture : ${input.screenshotUrl?.trim() || 'Aucune'}`,
    ];

    await this.transporter.sendMail({
      from,
      to: supportEmail,
      replyTo: input.email,
      subject: `[Wankul] Ticket #${input.reportId} - ${input.priority} - ${input.page} - ${input.feature}`,
      text: lines.join('\n'),
    });
  }
}