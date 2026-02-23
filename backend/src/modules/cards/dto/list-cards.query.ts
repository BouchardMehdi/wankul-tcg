import { Transform } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const toInt = ({ value }: { value: any }) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
};

export class ListCardsQueryDto {
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(2000) // ✅ avant: 200
  limit?: number = 50;

  @IsOptional()
  @IsString()
  q?: string; // search name/key/artist

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(0)
  seasonNumber?: number;

  @IsOptional()
  @IsString()
  rarity?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  gameplayType?: string;

  @IsOptional()
  @IsBooleanString()
  specialEdition?: string; // "true" | "false"

  @IsOptional()
  @IsIn(['name', 'rarity', 'seasonNumber', 'number'])
  sort?: 'name' | 'rarity' | 'seasonNumber' | 'number' = 'seasonNumber';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'ASC';
}