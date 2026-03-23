import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReportBugDto {
  @IsString()
  @IsIn([
    'bug',
    'visual',
    'performance',
    'market',
    'opening',
    'collection',
    'auth',
    'other',
  ])
  category!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  page!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  feature!: string;

  @IsString()
  @IsIn(['minor', 'medium', 'high', 'blocking'])
  priority!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reproductionSteps?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  currentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  browserInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000000)
  screenshotDataUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  screenshotFilename?: string;
}