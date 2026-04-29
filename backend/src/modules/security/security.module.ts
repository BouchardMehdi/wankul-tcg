import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomicActionLog } from './economic-action-log.entity';
import { AntiAbuseService } from './anti-abuse.service';
import { MarketTransaction } from '../market/market-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EconomicActionLog, MarketTransaction])],
  providers: [AntiAbuseService],
  exports: [AntiAbuseService],
})
export class SecurityModule {}
