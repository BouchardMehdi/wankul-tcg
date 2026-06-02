import { Repository } from 'typeorm';
import { Card } from '../cards/card.entity';
import { UserCard } from '../users/user-card.entity';
import { MarketPriceHistory } from './market-price-history.entity';
export interface MarketRewardQuote {
    cardId: number;
    rarity: string;
    openingReferencePrice: number;
    duplicateRewardValue: number;
    newRewardValue: number;
    quickSellRate: number;
    quickSellUnitPrice: number;
}
export interface MarketPriceDetails extends MarketRewardQuote {
    cardKey: string;
    cardName: string;
    baseValue: number;
    ownersCount: number;
    totalCopies: number;
    ownershipRate: number;
    scarcityMultiplier: number;
    circulationMultiplier: number;
    floorPrice: number;
    ceilingPrice: number;
    rawInstantPrice: number;
    smoothedReferencePrice: number;
    previousReferencePrice: number | null;
    dailyMinPrice: number | null;
    dailyMaxPrice: number | null;
    finalPrice: number;
}
export declare class MarketPricingService {
    private readonly cardsRepository;
    private readonly userCardsRepository;
    private readonly marketPriceHistoryRepository;
    constructor(cardsRepository: Repository<Card>, userCardsRepository: Repository<UserCard>, marketPriceHistoryRepository: Repository<MarketPriceHistory>);
    getMarketPrice(cardId: number): Promise<MarketPriceDetails>;
    getRewardQuote(cardId: number): Promise<MarketRewardQuote>;
    private buildRewardQuote;
    private clamp;
    private clampInt;
}
