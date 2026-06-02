export type UserRole = 'player' | 'admin';
export declare class User {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    emailVerified: boolean;
    emailVerificationCodeHash: string | null;
    emailVerificationExpiresAt: Date | null;
    passwordResetCodeHash: string | null;
    passwordResetExpiresAt: Date | null;
    role: UserRole;
    adminPasswordHash: string | null;
    suspendedUntil: Date | null;
    suspensionReason: string | null;
    marketBlockedUntil: Date | null;
    marketBlockReason: string | null;
}
