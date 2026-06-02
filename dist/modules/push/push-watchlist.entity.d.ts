import { User } from '../users/user.entity';
import { Card } from '../cards/card.entity';
export declare class PushWatchlistEntity {
    id: number;
    user: User;
    card: Card;
    targetPriceCredits: number;
    marketListingAlertEnabled: boolean;
    marketDealAlertEnabled: boolean;
    marketDealThresholdPercent: number;
    targetReachedNotified: boolean;
    lastTriggeredAt: Date | null;
    lastTriggeredPrice: number | null;
    lastListingNotifiedId: number | null;
    lastDealNotifiedId: number | null;
    createdAt: Date;
    updatedAt: Date;
}
