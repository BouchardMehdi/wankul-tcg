import { IsInt, Min } from 'class-validator';

export class UpsertWatchlistItemDto {
  @IsInt()
  @Min(1)
  targetPriceCredits!: number;
}
