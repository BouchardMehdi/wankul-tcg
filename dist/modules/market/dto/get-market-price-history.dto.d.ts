export declare const MARKET_PRICE_HISTORY_RANGES: readonly ["24H", "7D", "30D", "6M", "1Y"];
export type MarketPriceHistoryRange = (typeof MARKET_PRICE_HISTORY_RANGES)[number];
export declare class GetMarketPriceHistoryDto {
    range?: string;
}
