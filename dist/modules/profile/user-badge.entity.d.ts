import { User } from '../users/user.entity';
export declare class UserBadge {
    id: number;
    userId: number;
    user: User;
    badgeCode: string;
    rewardCredits: number;
    rewardFreeBoosters: number;
    metadata: Record<string, unknown> | null;
    unlockedAt: Date;
}
