import { IsOptional, IsString, IsUrl } from 'class-validator';

export class DeletePushSubscriptionDto {
  @IsOptional()
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_tld: false,
    require_protocol: true,
  })
  endpoint?: string;
}
