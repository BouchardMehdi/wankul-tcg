import { IsIn } from 'class-validator';

export class OpenDisplayDto {
  @IsIn(['Origins', 'Campus', 'Battle', 'Stellar'])
  season: 'Origins' | 'Campus' | 'Battle' | 'Stellar';
}
