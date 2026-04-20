import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpsertWatchlistItemDto {
  @IsInt()
  @Min(1)
  targetPriceCredits!: number;

  @IsOptional()
  @IsBoolean()
  marketListingAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  marketDealAlertEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  marketDealThresholdPercent?: number;
}
