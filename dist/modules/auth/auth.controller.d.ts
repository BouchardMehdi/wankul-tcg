import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ReportBugDto } from '../report/dto/report-bug.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<{
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
    resendVerification(dto: ResendCodeDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        refresh_expires_in: import("ms").StringValue;
    }>;
    refreshSession(dto: RefreshTokenDto): Promise<{
        access_token: string;
        refresh_token: string;
        refresh_expires_in: import("ms").StringValue;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    reportBug(currentUser: {
        id: number;
        username: string;
    }, dto: ReportBugDto): Promise<{
        message: string;
        reportId: number;
    }>;
    getMyBugReports(currentUser: {
        id: number;
        username: string;
    }, status?: string, page?: string, pageSize?: string): Promise<{
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
            status: import("../report/bug-report.entity").BugReportStatus;
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
}
