declare class PushSubscriptionKeysDto {
    p256dh: string;
    auth: string;
}
export declare class CreatePushSubscriptionDto {
    endpoint: string;
    expirationTime: number | null;
    keys: PushSubscriptionKeysDto;
}
export {};
