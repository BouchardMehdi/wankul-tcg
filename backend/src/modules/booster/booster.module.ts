import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BoosterController } from './booster.controller';
import { BoosterService } from './booster.service';
import { BoosterOpening } from './booster-opening.entity';
import { DisplayOpening } from './display-opening.entity';

import { Card } from '../cards/card.entity';
import { UsersModule } from '../users/users.module';
import { EconomyModule } from '../economy/economy.module';
import { EconomyAnalyticsModule } from '../economy/economy-analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Card, BoosterOpening, DisplayOpening]),
    UsersModule,
    EconomyModule,
    EconomyAnalyticsModule,
  ],
  controllers: [BoosterController],
  providers: [BoosterService],
  exports: [BoosterService],
})
export class BoosterModule {}