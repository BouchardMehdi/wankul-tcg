import { User } from '../users/user.entity';
import { Card } from '../cards/card.entity';
import { MarketListingStatus } from './market-listing-status.enum';
import { MarketListingMode } from './market-listing-mode.enum';
import { MarketOfferType } from './market-offer-type.enum';
export declare class MarketListing {
    id: number;
    seller: User;
    card: Card;
    listingMode: MarketListingMode;
    offerType: MarketOfferType;
    quantity: number;
    remainingQuantity: number;
    priceCredits: number;
    wantedCard: Card | null;
    wantedCardQuantity: number;
    wantedCardMarketPriceSnapshot: number;
    marketPriceSnapshot: number;
    status: MarketListingStatus;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    stalePushSentAt: Date | null;
}
