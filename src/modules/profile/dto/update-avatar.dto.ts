import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  @IsIn(['default', 'upload'])
  mode!: 'default' | 'upload';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultAvatarId?: string;

  @IsOptional()
  @IsString()
  imageDataUrl?: string;
}
