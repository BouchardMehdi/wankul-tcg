import { User } from '../users/user.entity';
export declare class PushSubscriptionEntity {
    id: number;
    user: User;
    endpoint: string;
    endpointHash: string;
    p256dhKey: string;
    authKey: string;
    expirationTime: string | null;
    userAgent: string | null;
    lastSuccessfulPushAt: Date | null;
    lastFailureAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
