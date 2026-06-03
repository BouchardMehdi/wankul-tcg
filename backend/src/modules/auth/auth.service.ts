import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import { EconomyService } from '../economy/economy.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ReportBugDto } from '../report/dto/report-bug.dto';
import { BugReport, BugReportStatus } from '../report/bug-report.entity';
import { BugReportStatusHistory } from '../report/bug-report-status-history.entity';

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

type GoogleTokenInfo = {
  iss?: string;
  sub?: string;
  aud?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  picture?: string;
};

function isGoogleEmailVerified(value: GoogleTokenInfo['email_verified']) {
  return value === true || value === 'true';
}

function normalizeGoogleUsername(value: string) {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '')
    .slice(0, 32);

  return cleaned || 'player';
}

const SIGNUP_BONUS = 1500;
const CODE_EXPIRATION_MINUTES = 15;
const PLAYER_REPORT_PAGE_SIZE = 5;
const PLAYER_REFRESH_DEFAULT_EXPIRES_IN = '30d' as StringValue;
const PLAYER_DEFAULT_VISIBLE_STATUSES: BugReportStatus[] = [
  'open',
  'investigating',
  'planned',
  'closed',
];

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(BugReport) private readonly bugReportsRepo: Repository<BugReport>,
    @InjectRepository(BugReportStatusHistory)
    private readonly bugReportHistoryRepo: Repository<BugReportStatusHistory>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly economy: EconomyService,
  ) {}

  private async findUserByUsernameOrEmail(identifier: string) {
    const normalized = identifier.trim();
    const lower = normalized.toLowerCase();

    return this.usersRepo.findOne({
      where: [{ username: normalized }, { email: lower }],
    });
  }

  private getGoogleClientId() {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (!clientId) {
      throw new BadRequestException('Connexion Google non configurée.');
    }

    return clientId;
  }

  private async verifyGoogleCredential(credential: string): Promise<GoogleTokenInfo> {
    const token = credential.trim();
    if (!token) {
      throw new BadRequestException('Jeton Google manquant.');
    }

    let data: GoogleTokenInfo;
    try {
      const params = new URLSearchParams({ id_token: token });
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?${params.toString()}`);
      data = (await res.json()) as GoogleTokenInfo;

      if (!res.ok) {
        throw new Error('Google tokeninfo rejected token');
      }
    } catch {
      throw new UnauthorizedException('Connexion Google refusée.');
    }

    const clientId = this.getGoogleClientId();
    const issuerAllowed =
      data.iss === 'accounts.google.com' || data.iss === 'https://accounts.google.com';

    if (
      !issuerAllowed ||
      data.aud !== clientId ||
      !data.sub ||
      !data.email ||
      !isGoogleEmailVerified(data.email_verified)
    ) {
      throw new UnauthorizedException('Compte Google non validé.');
    }

    data.email = data.email.trim().toLowerCase();
    return data;
  }

  private async generateUniqueGoogleUsername(profile: GoogleTokenInfo) {
    const emailLocalPart = profile.email?.split('@')[0] ?? '';
    const preferredName = profile.given_name || profile.name || emailLocalPart;
    let base = normalizeGoogleUsername(preferredName);

    if (base.length < 3) {
      base = normalizeGoogleUsername(`player${profile.sub?.slice(-6) ?? ''}`);
    }

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const candidate = `${base.slice(0, 40 - suffix.length)}${suffix}`;
      const existing = await this.usersRepo.findOne({ where: { username: candidate } });

      if (!existing) return candidate;
    }

    const randomSuffix = randomBytes(3).toString('hex');
    return `${base.slice(0, 33)}-${randomSuffix}`;
  }

  private assertUserNotSuspended(user: User) {
    if (!user.suspendedUntil) return;

    const suspendedUntil = new Date(user.suspendedUntil);
    if (Number.isNaN(suspendedUntil.getTime()) || suspendedUntil.getTime() <= Date.now()) {
      return;
    }

    throw new ForbiddenException(
      `Compte suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`,
    );
  }

  private assertUserCanUsePlayerSession(user: User) {
    this.assertUserNotSuspended(user);

    if (!user.emailVerified) {
      throw new ForbiddenException('Email non vérifié');
    }
  }

  private async createPlayerSession(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      scope: 'player',
    };

    const access_token = await this.jwt.signAsync(payload);
    const refreshExpiresIn = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      PLAYER_REFRESH_DEFAULT_EXPIRES_IN) as StringValue;
    const refresh_token = await this.jwt.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        scope: 'player_refresh',
      },
      { expiresIn: refreshExpiresIn },
    );

    return {
      access_token,
      refresh_token,
      refresh_expires_in: refreshExpiresIn,
    };
  }

  private async saveScreenshotFromDataUrl(
    screenshotDataUrl?: string,
    screenshotFilename?: string,
  ): Promise<string | null> {
    if (!screenshotDataUrl?.trim()) return null;

    const match = screenshotDataUrl.match(
      /^data:(image\/png|image\/jpeg|image\/jpg|image\/webp);base64,(.+)$/i,
    );

    if (!match) {
      throw new BadRequestException('Format de capture invalide');
    }

    const mimeType = match[1].toLowerCase();
    const base64 = match[2];

    const ext =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';

    const buffer = Buffer.from(base64, 'base64');
    const maxSize = 4 * 1024 * 1024;

    if (buffer.length > maxSize) {
      throw new BadRequestException('Screenshot too large (max 4 MB)');
    }

    const uploadsDir = join(process.cwd(), 'uploads', 'bug-reports');
    await mkdir(uploadsDir, { recursive: true });

    const baseName = sanitizeFilename(
      screenshotFilename?.trim() || `bug-report-${Date.now()}.${ext}`,
    );

    const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${baseName}`;
    const filePath = join(uploadsDir, finalName);

    await writeFile(filePath, buffer);

    return `/uploads/bug-reports/${finalName}`;
  }

  private async appendBugReportHistory(params: {
    reportId: number;
    fromStatus: string | null;
    toStatus: string;
    note?: string | null;
    changedBy?: string;
  }) {
    const history = this.bugReportHistoryRepo.create({
      reportId: params.reportId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      note: params.note?.trim() || null,
      changedBy: params.changedBy?.trim() || 'system',
    });

    await this.bugReportHistoryRepo.save(history);
  }

  private formatBugReport(report: BugReport) {
    return {
      id: report.id,
      category: report.category,
      page: report.page,
      feature: report.feature,
      priority: report.priority,
      description: report.description,
      reproductionSteps: report.reproductionSteps,
      currentUrl: report.currentUrl,
      browserInfo: report.browserInfo,
      screenshotUrl: report.screenshotUrl,
      status: report.status,
      resolutionNote: report.resolutionNote,
      treatedAt: report.treatedAt,
      treatedBy: report.treatedBy,
      fixedAt: report.fixedAt,
      fixedBy: report.fixedBy,
      closedAt: report.closedAt,
      closedBy: report.closedBy,
      lastStatusChangedBy: report.lastStatusChangedBy,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      histories: (report.histories ?? [])
        .slice()
        .sort((a, b) => {
          return new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime();
        })
        .map((history) => ({
          id: history.id,
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          note: history.note,
          changedBy: history.changedBy,
          changedAt: history.changedAt,
        })),
    };
  }

  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    const existingUsername = await this.usersRepo.findOne({ where: { username } });
    if (existingUsername) throw new BadRequestException('Username already used');

    const existingEmail = await this.usersRepo.findOne({ where: { email } });
    if (existingEmail) throw new BadRequestException('Email already used');

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generate6DigitCode();
    const emailVerificationCodeHash = await bcrypt.hash(code, 10);
    const emailVerificationExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    const user = this.usersRepo.create({
      username,
      email,
      passwordHash,
      emailVerificationCodeHash,
      emailVerificationExpiresAt,
      emailVerified: false,
      role: 'player',
      adminPasswordHash: null,
    });

    await this.usersRepo.save(user);

    await this.mail.sendVerificationCode(email, username, code);

    return { message: 'Account created. Verification code sent by email.' };
  }

  async resendVerificationCode(username: string) {
    const normalizedUsername = username.trim();
    const user = await this.usersRepo.findOne({ where: { username: normalizedUsername } });
    if (!user) throw new NotFoundException('User not found');

    if (user.emailVerified) {
      throw new BadRequestException('Email déjà vérifié');
    }

    const code = generate6DigitCode();
    user.emailVerificationCodeHash = await bcrypt.hash(code, 10);
    user.emailVerificationExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    await this.usersRepo.save(user);

    await this.mail.sendVerificationCode(user.email, user.username, code);

    return { message: 'Verification code resent.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const username = dto.username.trim();
    const code = dto.code.trim();

    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    if (user.emailVerified) {
      return { message: 'Email déjà vérifié.' };
    }

    if (!user.emailVerificationCodeHash) {
      throw new BadRequestException('Aucun code de vérification trouvé. Demande un nouveau code.');
    }

    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Code de vérification expiré. Demande un nouveau code.');
    }

    const isValid = await bcrypt.compare(code, user.emailVerificationCodeHash);
    if (!isValid) throw new BadRequestException('Code de vérification invalide');

    user.emailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;

    await this.usersRepo.save(user);

    if (typeof (this.economy as any).grantSignupBonusIfNeeded === 'function') {
      const bonus = await (this.economy as any).grantSignupBonusIfNeeded(user.id);
      return {
        message: 'Email vérifié. WunkulCoins de bienvenue ajoutés.',
        signupBonusGranted: bonus.granted,
        bonusAmount: bonus.amount,
        currentCredits: bonus.credits,
      };
    }

    if (typeof (this.economy as any).addCredits === 'function') {
      await (this.economy as any).addCredits(user.id, SIGNUP_BONUS, {
        reason: 'signup_verified',
      });
    }

    return {
      message: 'Email vérifié. WunkulCoins de bienvenue ajoutés.',
      bonusAmount: SIGNUP_BONUS,
    };
  }

  async forgotPassword(identifier: string) {
    const user = await this.findUserByUsernameOrEmail(identifier);

    if (!user || !user.emailVerified) {
      return {
        message:
          'Si un compte correspond à cet identifiant, un code de réinitialisation a été envoyé.',
      };
    }

    const code = generate6DigitCode();
    user.passwordResetCodeHash = await bcrypt.hash(code, 10);
    user.passwordResetExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    await this.usersRepo.save(user);

    await this.mail.sendPasswordResetCode(user.email, user.username, code);

    return {
      message:
        'Si un compte correspond à cet identifiant, un code de réinitialisation a été envoyé.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const identifier = dto.identifier.trim();
    const code = dto.code.trim();
    const newPassword = dto.newPassword;

    const user = await this.findUserByUsernameOrEmail(identifier);
    if (!user) throw new BadRequestException('Demande de réinitialisation invalide');

    if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      throw new BadRequestException('No password reset request found');
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Password reset code expired');
    }

    const isValid = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!isValid) throw new BadRequestException('Code de réinitialisation invalide');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetCodeHash = null;
    user.passwordResetExpiresAt = null;

    await this.usersRepo.save(user);

    return { message: 'Password updated successfully.' };
  }

  async reportBug(userId: number, dto: ReportBugDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const screenshotUrl = await this.saveScreenshotFromDataUrl(
      dto.screenshotDataUrl,
      dto.screenshotFilename,
    );

    const report = this.bugReportsRepo.create({
      userId: user.id,
      usernameSnapshot: user.username,
      emailSnapshot: user.email,
      category: dto.category.trim(),
      page: dto.page.trim(),
      feature: dto.feature.trim(),
      priority: dto.priority.trim(),
      description: dto.description.trim(),
      reproductionSteps: dto.reproductionSteps?.trim() || null,
      currentUrl: dto.currentUrl?.trim() || null,
      browserInfo: dto.browserInfo?.trim() || null,
      screenshotUrl,
      status: 'open',
      resolutionNote: null,
      treatedAt: null,
      treatedBy: null,
      fixedAt: null,
      fixedBy: null,
      closedAt: null,
      closedBy: null,
      lastStatusChangedBy: null,
    });

    const saved = await this.bugReportsRepo.save(report);

    await this.appendBugReportHistory({
      reportId: saved.id,
      fromStatus: null,
      toStatus: 'open',
      note: 'Ticket créé',
      changedBy: user.username,
    });

    try {
      await this.mail.sendBugReport({
        reportId: saved.id,
        username: user.username,
        email: user.email,
        category: saved.category,
        page: saved.page,
        feature: saved.feature,
        priority: saved.priority,
        description: saved.description,
        reproductionSteps: saved.reproductionSteps ?? undefined,
        currentUrl: saved.currentUrl ?? undefined,
        browserInfo: saved.browserInfo ?? undefined,
        screenshotUrl: saved.screenshotUrl ?? undefined,
        reportedAt: saved.createdAt,
      });
    } catch (error) {
      console.error('Failed to send bug report email', error);
    }

    return {
      message: 'Merci, ton signalement a bien été envoyé.',
      reportId: saved.id,
    };
  }

  async getMyBugReports(
    userId: number,
    params?: {
      status?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const rawStatus = (params?.status ?? '').trim();
    const page = Math.max(1, Number(params?.page ?? 1) || 1);
    const pageSize = Math.min(
      PLAYER_REPORT_PAGE_SIZE,
      Math.max(1, Number(params?.pageSize ?? PLAYER_REPORT_PAGE_SIZE) || PLAYER_REPORT_PAGE_SIZE),
    );

    const allowedStatuses: BugReportStatus[] = [
      'open',
      'investigating',
      'planned',
      'fixed',
      'closed',
      'rejected',
    ];

    const statuses: BugReportStatus[] =
      rawStatus && allowedStatuses.includes(rawStatus as BugReportStatus)
        ? [rawStatus as BugReportStatus]
        : PLAYER_DEFAULT_VISIBLE_STATUSES;

    const [reports, total] = await this.bugReportsRepo.findAndCount({
      where: {
        userId,
        status: In(statuses),
      },
      relations: ['histories'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: reports.map((report) => this.formatBugReport(report)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      filters: {
        status: rawStatus || null,
      },
      availableStatuses: [
        { value: '', label: 'Actifs et utiles' },
        { value: 'open', label: 'Ouvert' },
        { value: 'investigating', label: 'En analyse' },
        { value: 'planned', label: 'Planifié' },
        { value: 'closed', label: 'Clos' },
        { value: 'fixed', label: 'Corrigé' },
        { value: 'rejected', label: 'Rejeté' },
      ],
    };
  }

  async login(dto: LoginDto) {
    const username = dto.username.trim();
    const password = dto.password;

    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new ForbiddenException('Identifiants invalides');

    this.assertUserCanUsePlayerSession(user);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new ForbiddenException('Identifiants invalides');

    return this.createPlayerSession(user);
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    const profile = await this.verifyGoogleCredential(dto.credential);
    const email = profile.email!;

    let user = await this.usersRepo.findOne({ where: { googleId: profile.sub! } });
    let shouldGrantWelcomeBonus = false;

    if (!user) {
      user = await this.usersRepo.findOne({ where: { email } });
    }

    if (user) {
      this.assertUserNotSuspended(user);

      if (!user.emailVerified) {
        user.emailVerified = true;
        user.emailVerificationCodeHash = null;
        user.emailVerificationExpiresAt = null;
        shouldGrantWelcomeBonus = true;
      }

      if (!user.googleId) {
        user.googleId = profile.sub!;
      }

      await this.usersRepo.save(user);

      const session = await this.createPlayerSession(user);
      const bonus = shouldGrantWelcomeBonus
        ? await this.economy.grantSignupBonusIfNeeded(user.id)
        : null;

      return {
        ...session,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isNewUser: false,
        },
        signupBonusGranted: bonus?.granted ?? false,
        bonusAmount: bonus?.granted ? bonus.amount : 0,
      };
    }

    const username = await this.generateUniqueGoogleUsername(profile);
    const passwordHash = await bcrypt.hash(
      `google:${profile.sub}:${randomBytes(16).toString('hex')}`,
      10,
    );

    const created = this.usersRepo.create({
      username,
      email,
      passwordHash,
      googleId: profile.sub!,
      authProvider: 'google',
      emailVerified: true,
      emailVerificationCodeHash: null,
      emailVerificationExpiresAt: null,
      role: 'player',
      adminPasswordHash: null,
    });

    const saved = await this.usersRepo.save(created);
    const bonus = await this.economy.grantSignupBonusIfNeeded(saved.id);
    const session = await this.createPlayerSession(saved);

    return {
      ...session,
      user: {
        id: saved.id,
        username: saved.username,
        email: saved.email,
        isNewUser: true,
      },
      signupBonusGranted: bonus.granted,
      bonusAmount: bonus.granted ? bonus.amount : 0,
    };
  }

  async refreshSession(refreshToken: string) {
    const token = (refreshToken ?? '').trim();
    if (!token) {
      throw new UnauthorizedException('Session à renouveler.');
    }

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Session expirée.');
    }

    if (payload?.scope !== 'player_refresh' || !payload?.sub) {
      throw new UnauthorizedException('Session invalide.');
    }

    const user = await this.usersRepo.findOne({ where: { id: Number(payload.sub) } });
    if (!user) {
      throw new UnauthorizedException('Session invalide.');
    }

    this.assertUserCanUsePlayerSession(user);

    return this.createPlayerSession(user);
  }
}
