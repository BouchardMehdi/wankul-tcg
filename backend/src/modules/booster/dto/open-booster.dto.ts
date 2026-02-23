import { IsIn } from 'class-validator';

export class OpenBoosterDto {
  // on pilote le booster par "saison" (= extension) : Origins/Campus/Battle/Stellar
  @IsIn(['Origins', 'Campus', 'Battle', 'Stellar'])
  season: 'Origins' | 'Campus' | 'Battle' | 'Stellar';
}
