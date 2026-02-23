import { IsString } from 'class-validator';

export class ResendCodeDto {
  @IsString()
  username!: string;
}
