import { User } from '../users/user.entity';
export declare class UserProfile {
    userId: number;
    user: User;
    avatarUrl: string;
    avatarSource: string;
    avatarFrameId: string;
    avatarBackgroundId: string;
    featuredBadgeCode: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
}
