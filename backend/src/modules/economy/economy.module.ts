import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyService } from './economy.service';
import { EconomyController } from './economy.controller';
import { UserEconomy } from './user-economy.entity';
import { EconomyAnalyticsModule } from './economy-analytics.module';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEconomy]),
    EconomyAnalyticsModule,
    MarketModule,
  ],
  providers: [EconomyService],
  controllers: [EconomyController],
  exports: [EconomyService],
})
export class EconomyModule {}