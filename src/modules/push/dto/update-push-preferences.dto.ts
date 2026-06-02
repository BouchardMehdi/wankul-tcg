import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdatePushPreferencesDto {
  @IsOptional()
  @IsBoolean()
  saleRewardEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  freeOpeningsReadyEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  freeOpeningsSoonEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  freeOpeningsSoonMinutes?: number;

  @IsOptional()
  @IsBoolean()
  watchlistPriceAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  staleListingAlertEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(336)
  staleListingHours?: number;

  @IsOptional()
  @IsBoolean()
  dailyMarketRecapEnabled?: boolean;
}
