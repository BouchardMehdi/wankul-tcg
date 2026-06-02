import { User } from '../users/user.entity';
export declare class PushNotificationPreferenceEntity {
    id: number;
    user: User;
    saleRewardEnabled: boolean;
    freeOpeningsReadyEnabled: boolean;
    freeOpeningsSoonEnabled: boolean;
    freeOpeningsSoonMinutes: number;
    watchlistPriceAlertEnabled: boolean;
    staleListingAlertEnabled: boolean;
    staleListingHours: number;
    dailyMarketRecapEnabled: boolean;
    lastDailyMarketRecapSentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
