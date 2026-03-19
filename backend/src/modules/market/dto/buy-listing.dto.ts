import { IsInt, IsOptional, Min } from 'class-validator';

export class BuyListingDto {
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  offeredCardId?: number;
}