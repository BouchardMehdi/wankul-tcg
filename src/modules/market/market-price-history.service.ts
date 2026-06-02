import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { MarketPriceHistory } from './market-price-history.entity';
import { MarketPricingService } from './market-pricing.service';
import {
  GetMarketPriceHistoryDto,
  MarketPriceHistoryRange,
} from './dto/get-market-price-history.dto';

@Injectable()
export class MarketPriceHistoryService {
  constructor(
    @InjectRepository(MarketPriceHistory)
    private readonly historyRepo: Repository<MarketPriceHistory>,
    private readonly marketPricingService: MarketPricingService,
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
    const range = this.normalizeRange(query.range);
    const startDate = this.computeStartDate(range);
    const endDate = new Date();

    const rows = await this.historyRepo.find({
      where: {
        cardId,
        recordedAt: MoreThanOrEqual(startDate),
      },
      order: {
        recordedAt: 'ASC',
      },
    });

    const pricing = await this.marketPricingService.getMarketPrice(cardId);
    const fallbackPrice = Math.max(0, Math.round(pricing.finalPrice));

    const normalizedRows = this.ensureUsableSeries(rows, startDate, endDate, fallbackPrice);
    const bucketed = this.bucketRows(normalizedRows, range);
    const finalRows = this.ensureUsableSeries(bucketed, startDate, endDate, fallbackPrice);

    return {
      cardId,
      range,
      fallbackPrice,
      points: finalRows.map((row) => ({
        timestamp: row.recordedAt.toISOString(),
        price: row.price,
      })),
    };
  }

  private normalizeRange(range?: string): MarketPriceHistoryRange {
    switch ((range ?? '7D').toUpperCase()) {
      case '24H':
      case '1D':
        return '24H';
      case '7D':
        return '7D';
      case '30D':
      case '1M':
        return '30D';
      case '6M':
      case '180D':
        return '6M';
      case '1Y':
      case '12M':
        return '1Y';
      default:
        return '7D';
    }
  }


  private ensureUsableSeries(
    rows: MarketPriceHistory[],
    startDate: Date,
    endDate: Date,
    fallbackPrice: number,
  ): MarketPriceHistory[] {
    if (rows.length === 0) {
      return [
        this.buildVirtualRow(startDate, fallbackPrice, 'fallback_start'),
        this.buildVirtualRow(endDate, fallbackPrice, 'fallback_end'),
      ];
    }

    if (rows.length === 1) {
      return [
        this.buildVirtualRow(startDate, rows[0].price, rows[0].sourceLabel || 'fallback_start'),
        rows[0],
        this.buildVirtualRow(endDate, rows[0].price, rows[0].sourceLabel || 'fallback_end'),
      ].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    }

    const normalized = [...rows];
    const first = normalized[0];
    const last = normalized[normalized.length - 1];

    if (first.recordedAt.getTime() > startDate.getTime()) {
      normalized.unshift(
        this.buildVirtualRow(startDate, first.price ?? fallbackPrice, first.sourceLabel || 'fallback_start'),
      );
    }

    if (last.recordedAt.getTime() < endDate.getTime()) {
      normalized.push(
        this.buildVirtualRow(endDate, last.price ?? fallbackPrice, last.sourceLabel || 'fallback_end'),
      );
    }

    return normalized;
  }

  private buildVirtualRow(
    recordedAt: Date,
    price: number,
    sourceLabel = 'market_fallback',
  ): MarketPriceHistory {
    return this.historyRepo.create({
      cardId: 0,
      price: Math.max(0, Math.round(price)),
      sourceLabel,
      recordedAt,
    });
  }

  private computeStartDate(range: MarketPriceHistoryRange): Date {
    const now = new Date();
    const start = new Date(now);

    switch (range) {
      case '24H':
        start.setHours(start.getHours() - 24);
        break;
      case '7D':
        start.setDate(start.getDate() - 7);
        break;
      case '30D':
        start.setDate(start.getDate() - 30);
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
      case '24H':
        return 60 * 60 * 1000;
      case '7D':
        return 6 * 60 * 60 * 1000;
      case '30D':
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
