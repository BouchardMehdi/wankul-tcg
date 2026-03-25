import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EconomyDailyStats } from './economy-daily-stats.entity';

@Injectable()
export class EconomyAnalyticsService {
  constructor(
    @InjectRepository(EconomyDailyStats)
    private repo: Repository<EconomyDailyStats>,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async getTodayRow() {
    const date = this.today();
    let row = await this.repo.findOne({ where: { date } });

    if (!row) {
      row = this.repo.create({ date });
      await this.repo.save(row);
    }

    return row;
  }

  async addCreditsSpent(amount: number) {
    const row = await this.getTodayRow();
    row.creditsSpent += amount;
    await this.repo.save(row);
  }

  async addOpeningReward(amount: number) {
    const row = await this.getTodayRow();
    row.creditsEarnedOpening += amount;
    await this.repo.save(row);
  }

  async addQuickSell(amount: number) {
    const row = await this.getTodayRow();
    row.creditsEarnedQuickSell += amount;
    await this.repo.save(row);
  }

  async addMarketVolume(amount: number) {
    const row = await this.getTodayRow();
    row.marketVolume += amount;
    await this.repo.save(row);
  }

  async incrementBooster() {
    const row = await this.getTodayRow();
    row.boostersOpened += 1;
    await this.repo.save(row);
  }

  async incrementDisplay() {
    const row = await this.getTodayRow();
    row.displaysOpened += 1;
    await this.repo.save(row);
  }

  async getOverview(days = 7) {
    const rows = await this.repo
      .createQueryBuilder('s')
      .orderBy('s.date', 'DESC')
      .limit(days)
      .getMany();

    const total = rows.reduce(
      (acc, r) => {
        acc.creditsSpent += r.creditsSpent;
        acc.creditsEarned +=
          r.creditsEarnedOpening + r.creditsEarnedQuickSell;
        return acc;
      },
      { creditsSpent: 0, creditsEarned: 0 },
    );

    return {
      days,
      rows,
      totals: total,
      inflation: total.creditsEarned - total.creditsSpent,
    };
  }
}