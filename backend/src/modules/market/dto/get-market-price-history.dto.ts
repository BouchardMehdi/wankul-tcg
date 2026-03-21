import { IsIn, IsOptional } from 'class-validator';

export const MARKET_PRICE_HISTORY_RANGES = ['2H', '7D', '1M', '6M', '1Y'] as const;
export type MarketPriceHistoryRange = (typeof MARKET_PRICE_HISTORY_RANGES)[number];

export class GetMarketPriceHistoryDto {
  @IsOptional()
  @IsIn(MARKET_PRICE_HISTORY_RANGES)
  range?: MarketPriceHistoryRange = '7D';
}