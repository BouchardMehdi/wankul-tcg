import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PushService } from './push.service';

@Injectable()
export class PushScheduler {
  private readonly logger = new Logger(PushScheduler.name);

  constructor(private readonly pushService: PushService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRealtimeNotificationCron() {
    try {
      await this.pushService.processFreeOpeningsReadyNotifications();
      await this.pushService.processFreeOpeningsSoonNotifications();
      await this.pushService.processWatchlistPriceAlerts();
      await this.pushService.processWatchlistListingAlerts();
      await this.pushService.processStaleListingAlerts();
    } catch (error: any) {
      this.logger.warn(
        `Realtime push scan failed: ${error?.message ?? 'unknown error'}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleDailyRecapCron() {
    try {
      await this.pushService.processDailyMarketRecaps();
    } catch (error: any) {
      this.logger.warn(
        `Daily recap push scan failed: ${error?.message ?? 'unknown error'}`,
      );
    }
  }
}
