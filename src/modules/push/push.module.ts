import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PushScheduler } from './push.scheduler';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { UserEconomy } from '../economy/user-economy.entity';
import { PushNotificationPreferenceEntity } from './push-preference.entity';
import { PushWatchlistEntity } from './push-watchlist.entity';
import { PushDeliveryLogEntity } from './push-delivery-log.entity';
import { MarketListing } from '../market/market-listing.entity';
import { MarketTransaction } from '../market/market-transaction.entity';
import { Card } from '../cards/card.entity';
import { UserCard } from '../users/user-card.entity';
import { MarketPriceHistory } from '../market/market-price-history.entity';
import { EconomyDailyStats } from '../economy/economy-daily-stats.entity';
import { MarketPricingService } from '../market/market-pricing.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PushSubscriptionEntity,
      PushDeliveryLogEntity,
      UserEconomy,
      PushNotificationPreferenceEntity,
      PushWatchlistEntity,
      MarketListing,
      MarketTransaction,
      Card,
      UserCard,
      MarketPriceHistory,
      EconomyDailyStats,
    ]),
  ],
  controllers: [PushController],
  providers: [PushService, PushScheduler, MarketPricingService],
  exports: [PushService],
})
export class PushModule {}
