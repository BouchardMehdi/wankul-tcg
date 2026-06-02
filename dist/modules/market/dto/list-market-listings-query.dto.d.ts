import { MarketListingMode } from '../market-listing-mode.enum';
import { MarketOfferType } from '../market-offer-type.enum';
export declare class ListMarketListingsQueryDto {
    search?: string;
    rarity?: string;
    season?: string;
    listingMode?: MarketListingMode;
    offerType?: MarketOfferType;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'createdAt' | 'priceCredits' | 'marketPriceSnapshot' | 'rarity' | 'cardName';
    sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    limit?: number;
}
