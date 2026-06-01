import { IsString, MinLength } from 'class-validator';

export class AdminRefreshDto {
  @IsString()
  @MinLength(20)
  adminRefreshToken!: string;
}
