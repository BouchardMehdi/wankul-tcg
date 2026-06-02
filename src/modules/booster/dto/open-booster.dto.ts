import { IsInt, Min } from 'class-validator';

export class OpenBoosterDto {
  @IsInt()
  @Min(1)
  seasonNumber!: number;
}