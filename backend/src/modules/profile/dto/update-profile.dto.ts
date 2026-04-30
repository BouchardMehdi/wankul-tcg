import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  featuredBadgeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  bio?: string;
}
