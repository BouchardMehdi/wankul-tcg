import { User } from '../users/user.entity';
import { Card } from '../cards/card.entity';
import { MarketListing } from './market-listing.entity';
import { MarketTransactionType } from './market-transaction-type.enum';
import { MarketListingMode } from './market-listing-mode.enum';
import { MarketOfferType } from './market-offer-type.enum';
export declare class MarketTransaction {
    id: number;
    listing: MarketListing;
    seller: User;
    buyer: User;
    card: Card;
    listingMode: MarketListingMode;
    offerType: MarketOfferType;
    quantity: number;
    unitPriceCredits: number;
    totalPriceCredits: number;
    buyerOfferedCard: Card | null;
    buyerOfferedCardQuantity: number;
    transactionType: MarketTransactionType;
    createdAt: Date;
    sellerRewardClaimedAt: Date | null;
}
