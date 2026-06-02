import { PushService } from './push.service';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { DeletePushSubscriptionDto } from './dto/delete-push-subscription.dto';
import { UpdatePushPreferencesDto } from './dto/update-push-preferences.dto';
import { UpsertWatchlistItemDto } from './dto/upsert-watchlist-item.dto';
type CurrentAuthUser = {
    sub?: number;
    userId?: number;
    id?: number;
};
export declare class PushController {
    private readonly pushService;
    constructor(pushService: PushService);
    getPublicKey(): {
        enabled: boolean;
        publicKey: string | null;
    };
    getPreferences(user: CurrentAuthUser): Promise<{
        saleRewardEnabled: boolean;
        freeOpeningsReadyEnabled: boolean;
        freeOpeningsSoonEnabled: boolean;
        freeOpeningsSoonMinutes: number;
        watchlistPriceAlertEnabled: boolean;
        staleListingAlertEnabled: boolean;
        staleListingHours: number;
        dailyMarketRecapEnabled: boolean;
    }>;
    updatePreferences(user: CurrentAuthUser, dto: UpdatePushPreferencesDto): Promise<{
        saleRewardEnabled: boolean;
        freeOpeningsReadyEnabled: boolean;
        freeOpeningsSoonEnabled: boolean;
        freeOpeningsSoonMinutes: number;
        watchlistPriceAlertEnabled: boolean;
        staleListingAlertEnabled: boolean;
        staleListingHours: number;
        dailyMarketRecapEnabled: boolean;
    }>;
    getWatchlist(user: CurrentAuthUser): Promise<{
        id: number;
        cardId: number;
        cardKey: string;
        cardName: string;
        rarity: string;
        targetPriceCredits: number;
        marketListingAlertEnabled: boolean;
        marketDealAlertEnabled: boolean;
        marketDealThresholdPercent: number;
        currentMarketPrice: number | null;
        targetReachedNotified: boolean;
        lastTriggeredAt: Date | null;
        lastTriggeredPrice: number | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getWatchlistItem(user: CurrentAuthUser, cardId: number): Promise<{
        id: number;
        cardId: number;
        cardKey: string;
        cardName: string;
        rarity: string;
        targetPriceCredits: number;
        marketListingAlertEnabled: boolean;
        marketDealAlertEnabled: boolean;
        marketDealThresholdPercent: number;
        currentMarketPrice: number | null;
        targetReachedNotified: boolean;
        lastTriggeredAt: Date | null;
        lastTriggeredPrice: number | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    upsertWatchlistItem(user: CurrentAuthUser, cardId: number, dto: UpsertWatchlistItemDto): Promise<{
        id: number;
        cardId: number;
        cardKey: string;
        cardName: string;
        rarity: string;
        targetPriceCredits: number;
        marketListingAlertEnabled: boolean;
        marketDealAlertEnabled: boolean;
        marketDealThresholdPercent: number;
        currentMarketPrice: number | null;
        targetReachedNotified: boolean;
        lastTriggeredAt: Date | null;
        lastTriggeredPrice: number | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    deleteWatchlistItem(user: CurrentAuthUser, cardId: number): Promise<{
        success: boolean;
        removed: number;
    }>;
    createSubscription(user: CurrentAuthUser, dto: CreatePushSubscriptionDto, userAgent?: string): Promise<{
        success: boolean;
        subscriptionId: number;
    }>;
    deleteSubscription(user: CurrentAuthUser, dto: DeletePushSubscriptionDto): Promise<{
        success: boolean;
        removed: number;
    }>;
    private resolveUserId;
}
export {};
