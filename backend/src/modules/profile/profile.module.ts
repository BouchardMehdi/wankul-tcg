import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BoosterOpening } from '../booster/booster-opening.entity';
import { DisplayOpening } from '../booster/display-opening.entity';
import { Card } from '../cards/card.entity';
import { EconomyModule } from '../economy/economy.module';
import { MarketTransaction } from '../market/market-transaction.entity';
import { UserCard } from '../users/user-card.entity';
import { User } from '../users/user.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserBadge } from './user-badge.entity';
import { UserProfile } from './user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      UserBadge,
      UserCard,
      Card,
      BoosterOpening,
      DisplayOpening,
      MarketTransaction,
    ]),
    EconomyModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
