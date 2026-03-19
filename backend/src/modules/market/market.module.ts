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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      UserCard,
      UserEconomy,
      MarketListing,
      MarketTransaction,
    ]),
  ],
  controllers: [MarketController],
  providers: [MarketPricingService, MarketService],
  exports: [MarketPricingService, MarketService],
})
export class MarketModule {}