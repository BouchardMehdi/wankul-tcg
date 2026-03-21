import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Card } from '../cards/card.entity';
import { UserCard } from '../users/user-card.entity';
import { UserEconomy } from '../economy/user-economy.entity';
import { MarketController } from './market.controller';
import { MarketPricingService } from './market-pricing.service';
import { MarketService } from './market.service';
import { MarketListing } from './market-listing.entity';
import { MarketTransaction } from './market-transaction.entity';
import { MarketPriceHistory } from './market-price-history.entity';
import { MarketPriceHistoryService } from './market-price-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      UserCard,
      UserEconomy,
      MarketListing,
      MarketTransaction,
      MarketPriceHistory,
    ]),
  ],
  controllers: [MarketController],
  providers: [MarketPricingService, MarketPriceHistoryService, MarketService],
  exports: [MarketPricingService, MarketPriceHistoryService, MarketService],
})
export class MarketModule {}