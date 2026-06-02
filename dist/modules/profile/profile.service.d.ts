import { Repository } from 'typeorm';
import { BoosterOpening } from '../booster/booster-opening.entity';
import { DisplayOpening } from '../booster/display-opening.entity';
import { Card } from '../cards/card.entity';
import { EconomyService } from '../economy/economy.service';
import { MarketTransaction } from '../market/market-transaction.entity';
import { UserCard } from '../users/user-card.entity';
import { User } from '../users/user.entity';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserBadge } from './user-badge.entity';
import { UserProfile } from './user-profile.entity';
type BadgeTier = 'bronze' | 'silver' | 'gold' | 'rainbow';
type BadgeProgress = {
    current: number;
    target: number;
    unlocked: boolean;
    label?: string;
};
export declare class ProfileService {
    private readonly userRepo;
    private readonly profileRepo;
    private readonly badgeRepo;
    private readonly userCardRepo;
    private readonly cardRepo;
    private readonly boosterOpeningRepo;
    private readonly displayOpeningRepo;
    private readonly marketTransactionRepo;
    private readonly economy;
    constructor(userRepo: Repository<User>, profileRepo: Repository<UserProfile>, badgeRepo: Repository<UserBadge>, userCardRepo: Repository<UserCard>, cardRepo: Repository<Card>, boosterOpeningRepo: Repository<BoosterOpening>, displayOpeningRepo: Repository<DisplayOpening>, marketTransactionRepo: Repository<MarketTransaction>, economy: EconomyService);
    getDefaultAvatars(): {
        id: string;
        label: string;
        url: string;
    }[];
    getAvatarFrames(): {
        id: string;
        label: string;
        cssValue: string;
    }[];
    getAvatarBackgrounds(): {
        id: string;
        label: string;
        cssValue: string;
    }[];
    getProfile(userId: number): Promise<{
        user: {
            id: number;
            username: string;
            email: string;
            createdAt: Date;
        };
        profile: {
            avatarUrl: string;
            avatarSource: string;
            avatarFrameId: string;
            avatarBackgroundId: string;
            featuredBadgeCode: string | null;
            bio: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        defaultAvatars: {
            id: string;
            label: string;
            url: string;
        }[];
        avatarFrames: {
            id: string;
            label: string;
            cssValue: string;
        }[];
        avatarBackgrounds: {
            id: string;
            label: string;
            cssValue: string;
        }[];
        summary: {
            unlockedBadges: number;
            totalBadges: number;
            collectionPercent: number;
            uniqueCards: number;
            totalCards: number;
            boostersOpened: number;
            displaysOpened: number;
        };
        badges: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: BadgeTier;
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: BadgeProgress;
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
        newlyUnlocked: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: BadgeTier;
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: BadgeProgress;
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
    }>;
    updateProfile(userId: number, dto: UpdateProfileDto): Promise<{
        user: {
            id: number;
            username: string;
            email: string;
            createdAt: Date;
        };
        profile: {
            avatarUrl: string;
            avatarSource: string;
            avatarFrameId: string;
            avatarBackgroundId: string;
            featuredBadgeCode: string | null;
            bio: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        defaultAvatars: {
            id: string;
            label: string;
            url: string;
        }[];
        avatarFrames: {
            id: string;
            label: string;
            cssValue: string;
        }[];
        avatarBackgrounds: {
            id: string;
            label: string;
            cssValue: string;
        }[];
        summary: {
            unlockedBadges: number;
            totalBadges: number;
            collectionPercent: number;
            uniqueCards: number;
            totalCards: number;
            boostersOpened: number;
            displaysOpened: number;
        };
        badges: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: BadgeTier;
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: BadgeProgress;
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
        newlyUnlocked: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: BadgeTier;
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: BadgeProgress;
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
    }>;
    updateAvatar(userId: number, dto: UpdateAvatarDto): Promise<{
        user: {
            id: number;
            username: string;
            email: string;
            createdAt: Date;
        };
        profile: {
            avatarUrl: string;
            avatarSource: string;
            avatarFrameId: string;
            avatarBackgroundId: string;
            featuredBadgeCode: string | null;
            bio: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        defaultAvatars: {
            id: string;
            label: string;
            url: string;
        }[];
        avatarFrames: {
            id: string;
            label: string;
            cssValue: string;
        }[];
        avatarBackgrounds: {
            id: string;
            label: string;
            cssValue: string;
        }[];
        summary: {
            unlockedBadges: number;
            totalBadges: number;
            collectionPercent: number;
            uniqueCards: number;
            totalCards: number;
            boostersOpened: number;
            displaysOpened: number;
        };
        badges: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: BadgeTier;
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: BadgeProgress;
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
        newlyUnlocked: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: BadgeTier;
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: BadgeProgress;
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
    }>;
    evaluateAndGrantBadges(userId: number): Promise<{
        code: string;
        title: string;
        description: string;
        category: string;
        tier: BadgeTier;
        reward: {
            credits: number;
            freeBoosters: number;
        };
        progress: BadgeProgress;
        unlocked: boolean;
        unlockedAt: Date | null;
    }[]>;
    private findUser;
    private ensureProfile;
    private buildBadgeContext;
    private grantReward;
    private buildSummary;
    private mapProfile;
    private mapBadges;
    private mapBadge;
}
export {};
