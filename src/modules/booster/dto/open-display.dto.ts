import { IsInt, Min } from 'class-validator';

export class OpenDisplayDto {
  @IsInt()
  @Min(1)
  seasonNumber!: number;
}