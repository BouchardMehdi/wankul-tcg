import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EconomyDailyStats } from './economy-daily-stats.entity';
import { EconomyAnalyticsService } from './economy-analytics.service';
import { BoosterOpening } from '../booster/booster-opening.entity';
import { DisplayOpening } from '../booster/display-opening.entity';
import { MarketListing } from '../market/market-listing.entity';
import { MarketPriceHistory } from '../market/market-price-history.entity';
import { MarketTransaction } from '../market/market-transaction.entity';
import { UserEconomy } from './user-economy.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EconomyDailyStats,
      BoosterOpening,
      DisplayOpening,
      MarketListing,
      MarketPriceHistory,
      MarketTransaction,
      UserEconomy,
      User,
    ]),
  ],
  providers: [EconomyAnalyticsService],
  exports: [EconomyAnalyticsService],
})
export class EconomyAnalyticsModule {}
