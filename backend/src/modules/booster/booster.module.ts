import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoosterController } from './booster.controller';
import { BoosterService } from './booster.service';
import { Card } from '../cards/card.entity';
import { BoosterOpening } from './booster-opening.entity';
import { DisplayOpening } from './display-opening.entity';
import { UsersModule } from '../users/users.module';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Card, BoosterOpening, DisplayOpening]),
    UsersModule,
    EconomyModule, // ✅ IMPORTANT : rend EconomyService injectable dans BoosterService
  ],
  controllers: [BoosterController],
  providers: [BoosterService],
  exports: [BoosterService],
})
export class BoosterModule {}
