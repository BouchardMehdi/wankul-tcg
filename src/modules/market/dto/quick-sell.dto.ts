import { IsInt, Min } from 'class-validator';

export class QuickSellDto {
  @IsInt()
  @Min(1)
  cardId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}