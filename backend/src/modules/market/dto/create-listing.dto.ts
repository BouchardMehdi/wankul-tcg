import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MarketListingMode } from '../market-listing-mode.enum';
import { MarketOfferType } from '../market-offer-type.enum';

export class CreateListingDto {
  @IsInt()
  @Min(1)
  cardId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsEnum(MarketListingMode)
  listingMode!: MarketListingMode;

  @IsEnum(MarketOfferType)
  offerType!: MarketOfferType;

  @IsInt()
  @Min(0)
  priceCredits!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  wantedCardId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  wantedCardQuantity?: number;
}