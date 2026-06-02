import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBugReportStatusDto {
  @IsString()
  @IsIn(['open', 'investigating', 'planned', 'fixed', 'closed', 'rejected'])
  status!: 'open' | 'investigating' | 'planned' | 'fixed' | 'closed' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  changedBy?: string;
}