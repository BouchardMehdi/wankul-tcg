import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getProfile(user: {
        id: number;
    }): Promise<{
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
            tier: "gold" | "bronze" | "silver" | "rainbow";
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: {
                current: number;
                target: number;
                unlocked: boolean;
                label?: string;
            };
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
        newlyUnlocked: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: "gold" | "bronze" | "silver" | "rainbow";
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: {
                current: number;
                target: number;
                unlocked: boolean;
                label?: string;
            };
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
    }>;
    updateProfile(user: {
        id: number;
    }, dto: UpdateProfileDto): Promise<{
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
            tier: "gold" | "bronze" | "silver" | "rainbow";
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: {
                current: number;
                target: number;
                unlocked: boolean;
                label?: string;
            };
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
        newlyUnlocked: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: "gold" | "bronze" | "silver" | "rainbow";
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: {
                current: number;
                target: number;
                unlocked: boolean;
                label?: string;
            };
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
    }>;
    updateAvatar(user: {
        id: number;
    }, dto: UpdateAvatarDto): Promise<{
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
            tier: "gold" | "bronze" | "silver" | "rainbow";
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: {
                current: number;
                target: number;
                unlocked: boolean;
                label?: string;
            };
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
        newlyUnlocked: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: "gold" | "bronze" | "silver" | "rainbow";
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: {
                current: number;
                target: number;
                unlocked: boolean;
                label?: string;
            };
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
    }>;
    syncBadges(user: {
        id: number;
    }): Promise<{
        newlyUnlocked: {
            code: string;
            title: string;
            description: string;
            category: string;
            tier: "gold" | "bronze" | "silver" | "rainbow";
            reward: {
                credits: number;
                freeBoosters: number;
            };
            progress: {
                current: number;
                target: number;
                unlocked: boolean;
                label?: string;
            };
            unlocked: boolean;
            unlockedAt: Date | null;
        }[];
    }>;
}
