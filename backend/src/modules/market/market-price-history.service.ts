import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { MarketPriceHistory } from './market-price-history.entity';
import {
  GetMarketPriceHistoryDto,
  MarketPriceHistoryRange,
} from './dto/get-market-price-history.dto';

@Injectable()
export class MarketPriceHistoryService {
  constructor(
    @InjectRepository(MarketPriceHistory)
    private readonly historyRepo: Repository<MarketPriceHistory>,
  ) {}

  async recordSnapshot(
    cardId: number,
    price: number,
    sourceLabel = 'market_snapshot',
    recordedAt = new Date(),
  ): Promise<MarketPriceHistory> {
    const entity = this.historyRepo.create({
      cardId,
      price: Math.max(0, Math.round(price)),
      sourceLabel,
      recordedAt,
    });

    return this.historyRepo.save(entity);
  }

  async getHistory(cardId: number, query: GetMarketPriceHistoryDto) {
    const range = (query.range ?? '7D') as MarketPriceHistoryRange;
    const startDate = this.computeStartDate(range);

    const rows = await this.historyRepo.find({
      where: {
        cardId,
        recordedAt: MoreThanOrEqual(startDate),
      },
      order: {
        recordedAt: 'ASC',
      },
    });

    const bucketed = this.bucketRows(rows, range);

    return {
      cardId,
      range,
      points: bucketed.map((row) => ({
        timestamp: row.recordedAt.toISOString(),
        price: row.price,
      })),
    };
  }

  private computeStartDate(range: MarketPriceHistoryRange): Date {
    const now = new Date();
    const start = new Date(now);

    switch (range) {
      case '2H':
        start.setHours(start.getHours() - 2);
        break;
      case '7D':
        start.setDate(start.getDate() - 7);
        break;
      case '1M':
        start.setMonth(start.getMonth() - 1);
        break;
      case '6M':
        start.setMonth(start.getMonth() - 6);
        break;
      case '1Y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 7);
        break;
    }

    return start;
  }

  private bucketRows(
    rows: MarketPriceHistory[],
    range: MarketPriceHistoryRange,
  ): MarketPriceHistory[] {
    if (rows.length <= 1) return rows;

    const bucketMs = this.getBucketSizeMs(range);
    const map = new Map<number, MarketPriceHistory>();

    for (const row of rows) {
      const ts = row.recordedAt.getTime();
      const bucket = Math.floor(ts / bucketMs) * bucketMs;
      map.set(bucket, row);
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, row]) => row);
  }

  private getBucketSizeMs(range: MarketPriceHistoryRange): number {
    switch (range) {
      case '2H':
        return 5 * 60 * 1000;
      case '7D':
        return 6 * 60 * 60 * 1000;
      case '1M':
        return 24 * 60 * 60 * 1000;
      case '6M':
        return 7 * 24 * 60 * 60 * 1000;
      case '1Y':
        return 14 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}