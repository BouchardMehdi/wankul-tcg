import { IsIn, IsOptional } from 'class-validator';

export const MARKET_PRICE_HISTORY_RANGES = ['24H', '7D', '30D', '6M', '1Y'] as const;

export type MarketPriceHistoryRange = (typeof MARKET_PRICE_HISTORY_RANGES)[number];

export class GetMarketPriceHistoryDto {
  @IsOptional()
  @IsIn(['24H', '1D', '7D', '30D', '1M', '6M', '180D', '1Y', '12M'])
  range?: string;
}
