import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoosterOpening } from './booster-opening.entity';

@Injectable()
export class BoosterCleanupService {
  constructor(
    @InjectRepository(BoosterOpening)
    private readonly repo: Repository<BoosterOpening>,
  ) {}

  // Tous les jours à 3h du matin
  @Cron('0 3 * * *')
  async cleanupOldOpenings() {
    await this.repo
      .createQueryBuilder()
      .delete()
      .where('openedAt < NOW() - INTERVAL 30 DAY')
      .execute();

    console.log('🧹 Booster openings older than 30 days deleted');
  }
}
