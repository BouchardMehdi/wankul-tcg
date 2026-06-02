import { MarketListingMode } from '../market-listing-mode.enum';
import { MarketOfferType } from '../market-offer-type.enum';
export declare class CreateListingDto {
    cardId: number;
    quantity: number;
    listingMode: MarketListingMode;
    offerType: MarketOfferType;
    priceCredits: number;
    wantedCardId?: number;
    wantedCardQuantity?: number;
}
