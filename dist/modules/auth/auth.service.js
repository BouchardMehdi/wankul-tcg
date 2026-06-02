"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const user_entity_1 = require("../users/user.entity");
const mail_service_1 = require("../mail/mail.service");
const economy_service_1 = require("../economy/economy.service");
const bug_report_entity_1 = require("../report/bug-report.entity");
const bug_report_status_history_entity_1 = require("../report/bug-report-status-history.entity");
function generate6DigitCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
const SIGNUP_BONUS = 1500;
const CODE_EXPIRATION_MINUTES = 15;
const PLAYER_REPORT_PAGE_SIZE = 5;
const PLAYER_REFRESH_DEFAULT_EXPIRES_IN = '30d';
const PLAYER_DEFAULT_VISIBLE_STATUSES = [
    'open',
    'investigating',
    'planned',
    'closed',
];
let AuthService = class AuthService {
    usersRepo;
    bugReportsRepo;
    bugReportHistoryRepo;
    jwt;
    config;
    mail;
    economy;
    constructor(usersRepo, bugReportsRepo, bugReportHistoryRepo, jwt, config, mail, economy) {
        this.usersRepo = usersRepo;
        this.bugReportsRepo = bugReportsRepo;
        this.bugReportHistoryRepo = bugReportHistoryRepo;
        this.jwt = jwt;
        this.config = config;
        this.mail = mail;
        this.economy = economy;
    }
    async findUserByUsernameOrEmail(identifier) {
        const normalized = identifier.trim();
        const lower = normalized.toLowerCase();
        return this.usersRepo.findOne({
            where: [{ username: normalized }, { email: lower }],
        });
    }
    assertUserNotSuspended(user) {
        if (!user.suspendedUntil)
            return;
        const suspendedUntil = new Date(user.suspendedUntil);
        if (Number.isNaN(suspendedUntil.getTime()) || suspendedUntil.getTime() <= Date.now()) {
            return;
        }
        throw new common_1.ForbiddenException(`Compte suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`);
    }
    assertUserCanUsePlayerSession(user) {
        this.assertUserNotSuspended(user);
        if (!user.emailVerified) {
            throw new common_1.ForbiddenException('Email non vérifié');
        }
    }
    async createPlayerSession(user) {
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
            scope: 'player',
        };
        const access_token = await this.jwt.signAsync(payload);
        const refreshExpiresIn = (this.config.get('JWT_REFRESH_EXPIRES_IN') ??
            PLAYER_REFRESH_DEFAULT_EXPIRES_IN);
        const refresh_token = await this.jwt.signAsync({
            sub: user.id,
            username: user.username,
            role: user.role,
            scope: 'player_refresh',
        }, { expiresIn: refreshExpiresIn });
        return {
            access_token,
            refresh_token,
            refresh_expires_in: refreshExpiresIn,
        };
    }
    async saveScreenshotFromDataUrl(screenshotDataUrl, screenshotFilename) {
        if (!screenshotDataUrl?.trim())
            return null;
        const match = screenshotDataUrl.match(/^data:(image\/png|image\/jpeg|image\/jpg|image\/webp);base64,(.+)$/i);
        if (!match) {
            throw new common_1.BadRequestException('Format de capture invalide');
        }
        const mimeType = match[1].toLowerCase();
        const base64 = match[2];
        const ext = mimeType === 'image/png'
            ? 'png'
            : mimeType === 'image/webp'
                ? 'webp'
                : 'jpg';
        const buffer = Buffer.from(base64, 'base64');
        const maxSize = 4 * 1024 * 1024;
        if (buffer.length > maxSize) {
            throw new common_1.BadRequestException('Screenshot too large (max 4 MB)');
        }
        const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads', 'bug-reports');
        await (0, promises_1.mkdir)(uploadsDir, { recursive: true });
        const baseName = sanitizeFilename(screenshotFilename?.trim() || `bug-report-${Date.now()}.${ext}`);
        const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${baseName}`;
        const filePath = (0, path_1.join)(uploadsDir, finalName);
        await (0, promises_1.writeFile)(filePath, buffer);
        return `/uploads/bug-reports/${finalName}`;
    }
    async appendBugReportHistory(params) {
        const history = this.bugReportHistoryRepo.create({
            reportId: params.reportId,
            fromStatus: params.fromStatus,
            toStatus: params.toStatus,
            note: params.note?.trim() || null,
            changedBy: params.changedBy?.trim() || 'system',
        });
        await this.bugReportHistoryRepo.save(history);
    }
    formatBugReport(report) {
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
    async register(dto) {
        const username = dto.username.trim();
        const email = dto.email.trim().toLowerCase();
        const password = dto.password;
        const existingUsername = await this.usersRepo.findOne({ where: { username } });
        if (existingUsername)
            throw new common_1.BadRequestException('Username already used');
        const existingEmail = await this.usersRepo.findOne({ where: { email } });
        if (existingEmail)
            throw new common_1.BadRequestException('Email already used');
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
    async resendVerificationCode(username) {
        const normalizedUsername = username.trim();
        const user = await this.usersRepo.findOne({ where: { username: normalizedUsername } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.emailVerified) {
            throw new common_1.BadRequestException('Email déjà vérifié');
        }
        const code = generate6DigitCode();
        user.emailVerificationCodeHash = await bcrypt.hash(code, 10);
        user.emailVerificationExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);
        await this.usersRepo.save(user);
        await this.mail.sendVerificationCode(user.email, user.username, code);
        return { message: 'Verification code resent.' };
    }
    async verifyEmail(dto) {
        const username = dto.username.trim();
        const code = dto.code.trim();
        const user = await this.usersRepo.findOne({ where: { username } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.emailVerified) {
            return { message: 'Email déjà vérifié.' };
        }
        if (!user.emailVerificationCodeHash) {
            throw new common_1.BadRequestException('Aucun code de vérification trouvé. Demande un nouveau code.');
        }
        if (user.emailVerificationExpiresAt &&
            user.emailVerificationExpiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Code de vérification expiré. Demande un nouveau code.');
        }
        const isValid = await bcrypt.compare(code, user.emailVerificationCodeHash);
        if (!isValid)
            throw new common_1.BadRequestException('Code de vérification invalide');
        user.emailVerified = true;
        user.emailVerificationCodeHash = null;
        user.emailVerificationExpiresAt = null;
        await this.usersRepo.save(user);
        if (typeof this.economy.grantSignupBonusIfNeeded === 'function') {
            const bonus = await this.economy.grantSignupBonusIfNeeded(user.id);
            return {
                message: 'Email vérifié. WunkulCoins de bienvenue ajoutés.',
                signupBonusGranted: bonus.granted,
                bonusAmount: bonus.amount,
                currentCredits: bonus.credits,
            };
        }
        if (typeof this.economy.addCredits === 'function') {
            await this.economy.addCredits(user.id, SIGNUP_BONUS, {
                reason: 'signup_verified',
            });
        }
        return {
            message: 'Email vérifié. WunkulCoins de bienvenue ajoutés.',
            bonusAmount: SIGNUP_BONUS,
        };
    }
    async forgotPassword(identifier) {
        const user = await this.findUserByUsernameOrEmail(identifier);
        if (!user || !user.emailVerified) {
            return {
                message: 'Si un compte correspond à cet identifiant, un code de réinitialisation a été envoyé.',
            };
        }
        const code = generate6DigitCode();
        user.passwordResetCodeHash = await bcrypt.hash(code, 10);
        user.passwordResetExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);
        await this.usersRepo.save(user);
        await this.mail.sendPasswordResetCode(user.email, user.username, code);
        return {
            message: 'Si un compte correspond à cet identifiant, un code de réinitialisation a été envoyé.',
        };
    }
    async resetPassword(dto) {
        const identifier = dto.identifier.trim();
        const code = dto.code.trim();
        const newPassword = dto.newPassword;
        const user = await this.findUserByUsernameOrEmail(identifier);
        if (!user)
            throw new common_1.BadRequestException('Demande de réinitialisation invalide');
        if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
            throw new common_1.BadRequestException('No password reset request found');
        }
        if (user.passwordResetExpiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Password reset code expired');
        }
        const isValid = await bcrypt.compare(code, user.passwordResetCodeHash);
        if (!isValid)
            throw new common_1.BadRequestException('Code de réinitialisation invalide');
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        user.passwordResetCodeHash = null;
        user.passwordResetExpiresAt = null;
        await this.usersRepo.save(user);
        return { message: 'Password updated successfully.' };
    }
    async reportBug(userId, dto) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const screenshotUrl = await this.saveScreenshotFromDataUrl(dto.screenshotDataUrl, dto.screenshotFilename);
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
        }
        catch (error) {
            console.error('Failed to send bug report email', error);
        }
        return {
            message: 'Merci, ton signalement a bien été envoyé.',
            reportId: saved.id,
        };
    }
    async getMyBugReports(userId, params) {
        const rawStatus = (params?.status ?? '').trim();
        const page = Math.max(1, Number(params?.page ?? 1) || 1);
        const pageSize = Math.min(PLAYER_REPORT_PAGE_SIZE, Math.max(1, Number(params?.pageSize ?? PLAYER_REPORT_PAGE_SIZE) || PLAYER_REPORT_PAGE_SIZE));
        const allowedStatuses = [
            'open',
            'investigating',
            'planned',
            'fixed',
            'closed',
            'rejected',
        ];
        const statuses = rawStatus && allowedStatuses.includes(rawStatus)
            ? [rawStatus]
            : PLAYER_DEFAULT_VISIBLE_STATUSES;
        const [reports, total] = await this.bugReportsRepo.findAndCount({
            where: {
                userId,
                status: (0, typeorm_2.In)(statuses),
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
    async login(dto) {
        const username = dto.username.trim();
        const password = dto.password;
        const user = await this.usersRepo.findOne({ where: { username } });
        if (!user)
            throw new common_1.ForbiddenException('Identifiants invalides');
        this.assertUserCanUsePlayerSession(user);
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch)
            throw new common_1.ForbiddenException('Identifiants invalides');
        return this.createPlayerSession(user);
    }
    async refreshSession(refreshToken) {
        const token = (refreshToken ?? '').trim();
        if (!token) {
            throw new common_1.UnauthorizedException('Session à renouveler.');
        }
        let payload;
        try {
            payload = await this.jwt.verifyAsync(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Session expirée.');
        }
        if (payload?.scope !== 'player_refresh' || !payload?.sub) {
            throw new common_1.UnauthorizedException('Session invalide.');
        }
        const user = await this.usersRepo.findOne({ where: { id: Number(payload.sub) } });
        if (!user) {
            throw new common_1.UnauthorizedException('Session invalide.');
        }
        this.assertUserCanUsePlayerSession(user);
        return this.createPlayerSession(user);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(bug_report_entity_1.BugReport)),
    __param(2, (0, typeorm_1.InjectRepository)(bug_report_status_history_entity_1.BugReportStatusHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService,
        economy_service_1.EconomyService])
], AuthService);
//# sourceMappingURL=auth.service.js.map