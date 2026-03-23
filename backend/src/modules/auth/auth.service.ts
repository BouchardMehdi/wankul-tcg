import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import { EconomyService } from '../economy/economy.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ReportBugDto } from '../report/dto/report-bug.dto';
import { BugReport, BugReportStatus } from '../report/bug-report.entity';
import { BugReportStatusHistory } from '../report/bug-report-status-history.entity';
import { UpdateBugReportStatusDto } from '../report/dto/update-bug-report-status.dto';

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const SIGNUP_BONUS = 1500;
const CODE_EXPIRATION_MINUTES = 15;

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

  private async saveScreenshotFromDataUrl(
    screenshotDataUrl?: string,
    screenshotFilename?: string,
  ): Promise<string | null> {
    if (!screenshotDataUrl?.trim()) return null;

    const match = screenshotDataUrl.match(
      /^data:(image\/png|image\/jpeg|image\/jpg|image\/webp);base64,(.+)$/i,
    );

    if (!match) {
      throw new BadRequestException('Invalid screenshot format');
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
      fixedAt: report.fixedAt,
      closedAt: report.closedAt,
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
      throw new BadRequestException('Email already verified');
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
      return { message: 'Email already verified.' };
    }

    if (!user.emailVerificationCodeHash) {
      throw new BadRequestException('No verification code found. Please resend.');
    }

    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Verification code expired. Please resend.');
    }

    const isValid = await bcrypt.compare(code, user.emailVerificationCodeHash);
    if (!isValid) throw new BadRequestException('Invalid verification code');

    user.emailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;

    await this.usersRepo.save(user);

    if (typeof (this.economy as any).grantSignupBonusIfNeeded === 'function') {
      const bonus = await (this.economy as any).grantSignupBonusIfNeeded(user.id);
      return {
        message: 'Email verified. Welcome credits granted.',
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
      message: 'Email verified. Welcome credits granted.',
      bonusAmount: SIGNUP_BONUS,
    };
  }

  async forgotPassword(identifier: string) {
    const user = await this.findUserByUsernameOrEmail(identifier);

    if (!user || !user.emailVerified) {
      return {
        message:
          'If an account matches this identifier, a password reset code has been sent.',
      };
    }

    const code = generate6DigitCode();
    (user as any).passwordResetCodeHash = await bcrypt.hash(code, 10);
    (user as any).passwordResetExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    await this.usersRepo.save(user);

    await this.mail.sendPasswordResetCode(user.email, user.username, code);

    return {
      message:
        'If an account matches this identifier, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const identifier = dto.identifier.trim();
    const code = dto.code.trim();
    const newPassword = dto.newPassword;

    const user = await this.findUserByUsernameOrEmail(identifier);
    if (!user) throw new BadRequestException('Invalid reset request');

    if (!(user as any).passwordResetCodeHash || !(user as any).passwordResetExpiresAt) {
      throw new BadRequestException('No password reset request found');
    }

    if ((user as any).passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Password reset code expired');
    }

    const isValid = await bcrypt.compare(code, (user as any).passwordResetCodeHash);
    if (!isValid) throw new BadRequestException('Invalid reset code');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    (user as any).passwordResetCodeHash = null;
    (user as any).passwordResetExpiresAt = null;

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
      fixedAt: null,
      closedAt: null,
    });

    const saved = await this.bugReportsRepo.save(report);

    await this.appendBugReportHistory({
      reportId: saved.id,
      fromStatus: null,
      toStatus: 'open',
      note: 'Ticket créé',
      changedBy: 'system',
    });

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

    return {
      message: 'Merci, ton signalement a bien été envoyé.',
      reportId: saved.id,
    };
  }

  async getMyBugReports(userId: number) {
    const reports = await this.bugReportsRepo.find({
      where: { userId },
      relations: ['histories'],
      order: { createdAt: 'DESC', histories: { changedAt: 'DESC' } as any },
    });

    return {
      items: reports.map((report) => this.formatBugReport(report)),
    };
  }

  async updateBugReportStatus(
    reportId: number,
    adminKey: string | undefined,
    dto: UpdateBugReportStatusDto,
  ) {
    const expectedKey = this.config.get<string>('SUPPORT_ADMIN_KEY');

    if (!expectedKey || adminKey !== expectedKey) {
      throw new ForbiddenException('Invalid admin key');
    }

    const report = await this.bugReportsRepo.findOne({
      where: { id: reportId },
      relations: ['histories'],
    });

    if (!report) {
      throw new NotFoundException('Bug report not found');
    }

    const previousStatus = report.status;
    const nextStatus = dto.status;
    const note = dto.note?.trim() || null;
    const changedBy = dto.changedBy?.trim() || 'support';
    const now = new Date();

    report.status = nextStatus;
    report.resolutionNote = note;

    if ((nextStatus === 'investigating' || nextStatus === 'planned') && !report.treatedAt) {
      report.treatedAt = now;
    }

    if (nextStatus === 'fixed') {
      if (!report.treatedAt) report.treatedAt = now;
      report.fixedAt = now;
    }

    if (nextStatus === 'closed' || nextStatus === 'rejected') {
      if (!report.treatedAt) report.treatedAt = now;
      report.closedAt = now;
    }

    if (nextStatus === 'open') {
      report.closedAt = null;
      report.fixedAt = null;
    }

    const saved = await this.bugReportsRepo.save(report);

    await this.appendBugReportHistory({
      reportId: saved.id,
      fromStatus: previousStatus,
      toStatus: nextStatus,
      note,
      changedBy,
    });

    const refreshed = await this.bugReportsRepo.findOne({
      where: { id: saved.id },
      relations: ['histories'],
    });

    if (!refreshed) throw new NotFoundException('Bug report not found after update');

    return {
      message: 'Bug report status updated.',
      item: this.formatBugReport(refreshed),
    };
  }

  async login(dto: LoginDto) {
    const username = dto.username.trim();
    const password = dto.password;

    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new ForbiddenException('Invalid credentials');

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new ForbiddenException('Invalid credentials');

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET missing');

    const payload = { sub: user.id, username: user.username };
    const access_token = await this.jwt.signAsync(payload);

    return { access_token };
  }
}