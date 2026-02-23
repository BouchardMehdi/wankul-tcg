import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  username!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
