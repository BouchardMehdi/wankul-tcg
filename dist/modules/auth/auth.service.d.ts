import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
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
export declare class AuthService {
    private readonly usersRepo;
    private readonly bugReportsRepo;
    private readonly bugReportHistoryRepo;
    private readonly jwt;
    private readonly config;
    private readonly mail;
    private readonly economy;
    constructor(usersRepo: Repository<User>, bugReportsRepo: Repository<BugReport>, bugReportHistoryRepo: Repository<BugReportStatusHistory>, jwt: JwtService, config: ConfigService, mail: MailService, economy: EconomyService);
    private findUserByUsernameOrEmail;
    private assertUserNotSuspended;
    private assertUserCanUsePlayerSession;
    private createPlayerSession;
    private saveScreenshotFromDataUrl;
    private appendBugReportHistory;
    private formatBugReport;
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    resendVerificationCode(username: string): Promise<{
        message: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
        signupBonusGranted?: undefined;
        bonusAmount?: undefined;
        currentCredits?: undefined;
    } | {
        message: string;
        signupBonusGranted: any;
        bonusAmount: any;
        currentCredits: any;
    } | {
        message: string;
        bonusAmount: number;
        signupBonusGranted?: undefined;
        currentCredits?: undefined;
    }>;
    forgotPassword(identifier: string): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    reportBug(userId: number, dto: ReportBugDto): Promise<{
        message: string;
        reportId: number;
    }>;
    getMyBugReports(userId: number, params?: {
        status?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        items: {
            id: number;
            category: string;
            page: string;
            feature: string;
            priority: string;
            description: string;
            reproductionSteps: string | null;
            currentUrl: string | null;
            browserInfo: string | null;
            screenshotUrl: string | null;
            status: BugReportStatus;
            resolutionNote: string | null;
            treatedAt: Date | null;
            treatedBy: string | null;
            fixedAt: Date | null;
            fixedBy: string | null;
            closedAt: Date | null;
            closedBy: string | null;
            lastStatusChangedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            histories: {
                id: number;
                fromStatus: string | null;
                toStatus: string;
                note: string | null;
                changedBy: string;
                changedAt: Date;
            }[];
        }[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
        filters: {
            status: string | null;
        };
        availableStatuses: {
            value: string;
            label: string;
        }[];
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        refresh_expires_in: StringValue;
    }>;
    refreshSession(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        refresh_expires_in: StringValue;
    }>;
}
