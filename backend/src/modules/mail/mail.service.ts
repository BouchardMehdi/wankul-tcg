import { existsSync } from 'fs';
import { basename, isAbsolute, join } from 'path';

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

type AuthMailInput = {
  username: string;
  code: string;
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  codeLabel: string;
  securityNote: string;
  ctaLabel: string;
};

const MAIL_LOGO_CID = 'wankul-brand-logo';
const CODE_EXPIRATION_MINUTES = 15;

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

  private getFrom() {
    return process.env.MAIL_FROM ?? 'no-reply@wankul.local';
  }

  private getAppUrl() {
    return (
      process.env.FRONTEND_URL ??
      process.env.CLIENT_URL ??
      process.env.APP_URL ??
      'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private resolveLogoPath() {
    const candidates: string[] = [];

    if (process.env.MAIL_LOGO_PATH) {
      candidates.push(
        isAbsolute(process.env.MAIL_LOGO_PATH)
          ? process.env.MAIL_LOGO_PATH
          : join(process.cwd(), process.env.MAIL_LOGO_PATH),
      );
    }

    candidates.push(
      join(process.cwd(), '..', 'frontend', 'src', 'assets', 'Wankil_Studio_Logo.png'),
      join(process.cwd(), '..', 'frontend', 'public', 'pwa-192.png'),
      join(process.cwd(), '..', 'frontend', 'public', 'favicon.png'),
      join(process.cwd(), 'public', 'favicon.png'),
    );

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  private getLogoAttachments() {
    const logoPath = this.resolveLogoPath();
    if (!logoPath) return [];

    return [
      {
        filename: basename(logoPath),
        path: logoPath,
        cid: MAIL_LOGO_CID,
      },
    ];
  }

  private buildAuthText(input: AuthMailInput) {
    return `Bonjour ${input.username},

${input.intro}

${input.codeLabel} : ${input.code}

Ce code expire dans ${CODE_EXPIRATION_MINUTES} minutes.

${input.securityNote}

Wankul TCG`;
  }

  private buildLogoHtml() {
    const hasLogo = Boolean(this.resolveLogoPath());

    if (!hasLogo) {
      return `<div style="display:inline-block;padding:10px 14px;border-radius:16px;background:#111827;color:#ffffff;font-size:18px;font-weight:900;letter-spacing:-0.04em;">Wankul TCG</div>`;
    }

    return `<img src="cid:${MAIL_LOGO_CID}" width="148" alt="Wankul TCG" style="display:block;width:148px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">`;
  }

  private buildAuthHtml(input: AuthMailInput) {
    const username = this.escapeHtml(input.username);
    const code = this.escapeHtml(input.code);
    const appUrl = this.escapeHtml(this.getAppUrl());

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>${this.escapeHtml(input.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#070a12;color:#f4f7ff;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
      ${this.escapeHtml(input.intro)} Code: ${code}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#070a12;background-image:radial-gradient(circle at 18% 8%,rgba(155,92,255,0.22),transparent 34%),radial-gradient(circle at 86% 12%,rgba(76,201,240,0.16),transparent 34%),radial-gradient(circle at 50% 100%,rgba(255,77,109,0.14),transparent 42%);">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:0;border-radius:30px;background:#12182b;background-image:linear-gradient(145deg,#141b32,#080c18);border:1px solid rgba(255,255,255,0.14);box-shadow:0 28px 70px rgba(0,0,0,0.38);overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:26px 26px 18px;background:#101729;background-image:radial-gradient(circle at 15% 0%,rgba(255,77,109,0.24),transparent 36%),radial-gradient(circle at 95% 0%,rgba(76,201,240,0.20),transparent 32%);">
                      ${this.buildLogoHtml()}
                      <p style="margin:18px 0 8px;color:#ffd55f;font-size:12px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;">${this.escapeHtml(input.eyebrow)}</p>
                      <h1 style="margin:0;color:#f8fbff;font-size:38px;line-height:0.96;letter-spacing:-0.05em;font-weight:900;">${this.escapeHtml(input.title)}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 26px 10px;">
                      <p style="margin:0 0 14px;color:#dce4f5;font-size:16px;line-height:1.6;font-weight:700;">Bonjour <strong style="color:#ffffff;">${username}</strong>,</p>
                      <p style="margin:0;color:#cbd5e8;font-size:15px;line-height:1.65;font-weight:700;">${this.escapeHtml(input.intro)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 26px 20px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;">
                        <tr>
                          <td style="padding:18px;border-radius:22px;background:#0b1020;background-image:linear-gradient(135deg,rgba(255,77,109,0.18),rgba(155,92,255,0.18));border:1px solid rgba(255,213,95,0.28);">
                            <p style="margin:0 0 8px;color:#ffd55f;font-size:12px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">${this.escapeHtml(input.codeLabel)}</p>
                            <div style="display:block;margin:0;color:#ffffff;font-size:40px;line-height:1;font-weight:900;letter-spacing:0.18em;text-align:center;">${code}</div>
                            <p style="margin:12px 0 0;color:#aab6cc;font-size:13px;line-height:1.5;text-align:center;font-weight:700;">Valable ${CODE_EXPIRATION_MINUTES} minutes. Ne partage jamais ce code.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 26px 24px;">
                      <a href="${appUrl}" style="display:inline-block;padding:13px 18px;border-radius:16px;background:#ff4d6d;background-image:linear-gradient(135deg,#ff4d6d,#9b5cff);color:#ffffff;text-decoration:none;font-size:14px;font-weight:900;">${this.escapeHtml(input.ctaLabel)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 26px 24px;border-top:1px solid rgba(255,255,255,0.10);">
                      <p style="margin:0;color:#8f9bb3;font-size:12px;line-height:1.6;font-weight:700;">${this.escapeHtml(input.securityNote)}</p>
                      <p style="margin:12px 0 0;color:#6f7b91;font-size:11px;line-height:1.5;">Wankul TCG - Opening, collection et market dynamique.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private buildAuthMail(input: AuthMailInput) {
    return {
      subject: input.subject,
      text: this.buildAuthText(input),
      html: this.buildAuthHtml(input),
      attachments: this.getLogoAttachments(),
    };
  }

  async sendVerificationCode(email: string, username: string, code: string) {
    const mail = this.buildAuthMail({
      username,
      code,
      subject: 'Code de vérification Wankul TCG',
      eyebrow: 'Création de compte',
      title: 'Valide ton compte.',
      intro:
        'Entre ce code dans la page de vérification pour activer ton compte et récupérer ton bonus de départ.',
      codeLabel: 'Code de vérification',
      securityNote:
        "Si tu n'es pas à l'origine de cette création de compte, ignore simplement cet email.",
      ctaLabel: 'Retourner sur Wankul TCG',
    });

    await this.transporter.sendMail({
      from: this.getFrom(),
      to: email,
      ...mail,
    });
  }

  async sendPasswordResetCode(email: string, username: string, code: string) {
    const mail = this.buildAuthMail({
      username,
      code,
      subject: 'Reinitialisation du mot de passe Wankul TCG',
      eyebrow: 'Securite du compte',
      title: 'Change ton mot de passe.',
      intro:
        'Utilise ce code pour confirmer la réinitialisation de ton mot de passe Wankul TCG.',
      codeLabel: 'Code de réinitialisation',
      securityNote:
        "Si tu n'es pas à l'origine de cette demande, ton compte reste protégé et tu peux ignorer cet email.",
      ctaLabel: 'Retourner sur Wankul TCG',
    });

    await this.transporter.sendMail({
      from: this.getFrom(),
      to: email,
      ...mail,
    });
  }

  async sendBugReport(input: SendBugReportInput) {
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
      `Categorie : ${input.category}`,
      `Page : ${input.page}`,
      `Fonction : ${input.feature}`,
      `Priorite : ${input.priority}`,
      `Date : ${input.reportedAt.toISOString()}`,
      ``,
      `Description :`,
      input.description,
      ``,
      `Etapes pour reproduire :`,
      input.reproductionSteps?.trim() || 'Non renseigne',
      ``,
      `URL : ${input.currentUrl?.trim() || 'Non renseignee'}`,
      `Navigateur : ${input.browserInfo?.trim() || 'Non renseigne'}`,
      `Capture : ${input.screenshotUrl?.trim() || 'Aucune'}`,
    ];

    await this.transporter.sendMail({
      from: this.getFrom(),
      to: supportEmail,
      replyTo: input.email,
      subject: `[Wankul] Ticket #${input.reportId} - ${input.priority} - ${input.page} - ${input.feature}`,
      text: lines.join('\n'),
    });
  }
}
