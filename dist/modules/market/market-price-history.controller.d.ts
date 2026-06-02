import { GetMarketPriceHistoryDto } from './dto/get-market-price-history.dto';
import { MarketPriceHistoryService } from './market-price-history.service';
export declare class MarketPriceHistoryController {
    private readonly marketPriceHistoryService;
    constructor(marketPriceHistoryService: MarketPriceHistoryService);
    getCardPriceHistory(cardId: number, query: GetMarketPriceHistoryDto): Promise<{
        cardId: number;
        range: "24H" | "7D" | "30D" | "6M" | "1Y";
        fallbackPrice: number;
        points: {
            timestamp: string;
            price: number;
        }[];
    }>;
}
