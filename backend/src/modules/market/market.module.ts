import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { MarketPricingService } from './market-pricing.service';
import { MarketPriceHistoryService } from './market-price-history.service';

import { MarketListing } from './market-listing.entity';
import { MarketTransaction } from './market-transaction.entity';
import { MarketPriceHistory } from './market-price-history.entity';

import { UserCard } from '../users/user-card.entity';
import { UserEconomy } from '../economy/user-economy.entity';
import { Card } from '../cards/card.entity';

import { EconomyAnalyticsModule } from '../economy/economy-analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCard,
      UserEconomy,
      Card,
      MarketListing,
      MarketTransaction,
      MarketPriceHistory,
    ]),
    EconomyAnalyticsModule,
  ],
  controllers: [MarketController],
  providers: [
    MarketService,
    MarketPricingService,
    MarketPriceHistoryService,
  ],
  exports: [
    MarketService,
    MarketPricingService,
    MarketPriceHistoryService,
  ],
})
export class MarketModule {}