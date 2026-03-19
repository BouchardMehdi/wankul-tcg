import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MarketListingMode } from '../market-listing-mode.enum';
import { MarketOfferType } from '../market-offer-type.enum';

function toOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : (value as any);
}

export class ListMarketListingsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  rarity?: string;

  @IsOptional()
  @IsString()
  season?: string;

  @IsOptional()
  @IsIn([MarketListingMode.UNIT, MarketListingMode.LOT])
  listingMode?: MarketListingMode;

  @IsOptional()
  @IsIn([
    MarketOfferType.CREDITS_ONLY,
    MarketOfferType.CARD_ONLY,
    MarketOfferType.CARD_AND_CREDITS,
  ])
  offerType?: MarketOfferType;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn([
    'createdAt',
    'priceCredits',
    'marketPriceSnapshot',
    'rarity',
    'cardName',
  ])
  sortBy?:
    | 'createdAt'
    | 'priceCredits'
    | 'marketPriceSnapshot'
    | 'rarity'
    | 'cardName';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}