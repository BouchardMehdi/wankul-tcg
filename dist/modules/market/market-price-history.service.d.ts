import { Repository } from 'typeorm';
import { MarketPriceHistory } from './market-price-history.entity';
import { MarketPricingService } from './market-pricing.service';
import { GetMarketPriceHistoryDto } from './dto/get-market-price-history.dto';
export declare class MarketPriceHistoryService {
    private readonly historyRepo;
    private readonly marketPricingService;
    constructor(historyRepo: Repository<MarketPriceHistory>, marketPricingService: MarketPricingService);
    recordSnapshot(cardId: number, price: number, sourceLabel?: string, recordedAt?: Date): Promise<MarketPriceHistory>;
    getHistory(cardId: number, query: GetMarketPriceHistoryDto): Promise<{
        cardId: number;
        range: "24H" | "7D" | "30D" | "6M" | "1Y";
        fallbackPrice: number;
        points: {
            timestamp: string;
            price: number;
        }[];
    }>;
    private normalizeRange;
    private ensureUsableSeries;
    private buildVirtualRow;
    private computeStartDate;
    private bucketRows;
    private getBucketSizeMs;
}
