import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EconomyDailyStats } from './economy-daily-stats.entity';
import { EconomyAnalyticsService } from './economy-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([EconomyDailyStats])],
  providers: [EconomyAnalyticsService],
  exports: [EconomyAnalyticsService],
})
export class EconomyAnalyticsModule {}