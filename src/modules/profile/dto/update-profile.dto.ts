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

  @IsOptional()
  @IsString()
  @MaxLength(40)
  avatarFrameId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  avatarBackgroundId?: string;
}
