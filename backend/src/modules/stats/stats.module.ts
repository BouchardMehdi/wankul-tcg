import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

// Entities nécessaires au StatsService
import { Card } from '../cards/card.entity';
import { BoosterOpening } from '../booster/booster-opening.entity';
import { DisplayOpening } from '../booster/display-opening.entity';
import { UserCard } from '../users/user-card.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Card, BoosterOpening, DisplayOpening, UserCard]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
