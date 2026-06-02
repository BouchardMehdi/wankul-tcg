import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Card } from '../cards/card.entity';
import { UserCard } from '../users/user-card.entity';
import { MarketPriceHistory } from './market-price-history.entity';
import {
  DEFAULT_MARKET_BASE_VALUE,
  MARKET_DAILY_MAX_DOWN_PCT,
  MARKET_DAILY_MAX_UP_PCT,
  MARKET_PRICE_SMOOTHING_WEIGHT,
  MARKET_SMOOTHING_HISTORY_LIMIT,
  getRarityEconomicRule,
  normalizeMarketRarity,
} from './constants/market-rarity-values';

export interface MarketRewardQuote {
  cardId: number;
  rarity: string;
  openingReferencePrice: number;
  duplicateRewardValue: number;
  newRewardValue: number;
  quickSellRate: number;
  quickSellUnitPrice: number;
}

export interface MarketPriceDetails extends MarketRewardQuote {
  cardKey: string;
  cardName: string;
  baseValue: number;
  ownersCount: number;
  totalCopies: number;
  ownershipRate: number;
  scarcityMultiplier: number;
  circulationMultiplier: number;
  floorPrice: number;
  ceilingPrice: number;
  rawInstantPrice: number;
  smoothedReferencePrice: number;
  previousReferencePrice: number | null;
  dailyMinPrice: number | null;
  dailyMaxPrice: number | null;
  finalPrice: number;
}

@Injectable()
export class MarketPricingService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @InjectRepository(UserCard)
    private readonly userCardsRepository: Repository<UserCard>,
    @InjectRepository(MarketPriceHistory)
    private readonly marketPriceHistoryRepository: Repository<MarketPriceHistory>,
  ) {}

  async getMarketPrice(cardId: number): Promise<MarketPriceDetails> {
    const card = await this.cardsRepository.findOne({ where: { id: cardId } });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    const rarity = normalizeMarketRarity(card.rarity);
    const rule = getRarityEconomicRule(rarity);

    const rawStats = await this.userCardsRepository
      .createQueryBuilder('uc')
      .select('COUNT(DISTINCT user_id)', 'ownersCount')
      .addSelect('COALESCE(SUM(quantity), 0)', 'totalCopies')
      .where('card_id = :cardId', { cardId })
      .andWhere('quantity > 0')
      .getRawOne<{ ownersCount: string; totalCopies: string }>();

    const rawUserCount = await this.userCardsRepository
      .createQueryBuilder('uc')
      .select('COUNT(DISTINCT user_id)', 'userCount')
      .getRawOne<{ userCount: string }>();

    const ownersCount = Number(rawStats?.ownersCount ?? 0);
    const totalCopies = Number(rawStats?.totalCopies ?? 0);
    const userCount = Math.max(Number(rawUserCount?.userCount ?? 0), 1);

    const ownershipRate = ownersCount / userCount;
    const scarcityMultiplier = this.clamp(1 + (1 - ownershipRate), 1, 2);
    const circulationPenalty = Math.min(totalCopies / 500, 0.3);
    const circulationMultiplier = 1 - circulationPenalty;

    const rawInstantPrice = Math.max(
      1,
      Math.round((rule.baseValue ?? DEFAULT_MARKET_BASE_VALUE) * scarcityMultiplier * circulationMultiplier),
    );

    const boundedRawPrice = this.clampInt(rawInstantPrice, rule.floorPrice, rule.ceilingPrice);

    const historyRows = await this.marketPriceHistoryRepository.find({
      where: { cardId },
      order: { recordedAt: 'DESC' },
      take: MARKET_SMOOTHING_HISTORY_LIMIT,
    });

    const previousReferencePrice = historyRows[0]?.price ?? null;
    const historyAverage = historyRows.length
      ? historyRows.reduce((sum, row) => sum + row.price, 0) / historyRows.length
      : null;

    const smoothedReferencePrice = historyAverage === null
      ? boundedRawPrice
      : Math.round(
          boundedRawPrice * MARKET_PRICE_SMOOTHING_WEIGHT +
            historyAverage * (1 - MARKET_PRICE_SMOOTHING_WEIGHT),
        );

    const dailyMinPrice = previousReferencePrice === null
      ? null
      : Math.max(rule.floorPrice, Math.floor(previousReferencePrice * (1 - MARKET_DAILY_MAX_DOWN_PCT)));

    const dailyMaxPrice = previousReferencePrice === null
      ? null
      : Math.min(rule.ceilingPrice, Math.ceil(previousReferencePrice * (1 + MARKET_DAILY_MAX_UP_PCT)));

    let finalPrice = this.clampInt(smoothedReferencePrice, rule.floorPrice, rule.ceilingPrice);

    if (dailyMinPrice !== null && dailyMaxPrice !== null) {
      finalPrice = this.clampInt(finalPrice, dailyMinPrice, dailyMaxPrice);
    }

    const quote = this.buildRewardQuote(card.id, rarity, finalPrice, rule);

    return {
      cardKey: card.key,
      cardName: card.name,
      baseValue: rule.baseValue,
      ownersCount,
      totalCopies,
      ownershipRate,
      scarcityMultiplier,
      circulationMultiplier,
      floorPrice: rule.floorPrice,
      ceilingPrice: rule.ceilingPrice,
      rawInstantPrice,
      smoothedReferencePrice,
      previousReferencePrice,
      dailyMinPrice,
      dailyMaxPrice,
      finalPrice,
      ...quote,
    };
  }

  async getRewardQuote(cardId: number): Promise<MarketRewardQuote> {
    const pricing = await this.getMarketPrice(cardId);
    return {
      cardId: pricing.cardId,
      rarity: pricing.rarity,
      openingReferencePrice: pricing.openingReferencePrice,
      duplicateRewardValue: pricing.duplicateRewardValue,
      newRewardValue: pricing.newRewardValue,
      quickSellRate: pricing.quickSellRate,
      quickSellUnitPrice: pricing.quickSellUnitPrice,
    };
  }

  private buildRewardQuote(cardId: number, rarity: string, referencePrice: number, rule = getRarityEconomicRule(rarity)): MarketRewardQuote {
    if (rarity === 'Terrain') {
      return {
        cardId,
        rarity,
        openingReferencePrice: referencePrice,
        duplicateRewardValue: 0,
        newRewardValue: 6,
        quickSellRate: 0,
        quickSellUnitPrice: 0,
      };
    }

    if (rarity === "Ticket d'or") {
      return {
        cardId,
        rarity,
        openingReferencePrice: referencePrice,
        duplicateRewardValue: 0,
        newRewardValue: 0,
        quickSellRate: 0,
        quickSellUnitPrice: 0,
      };
    }

    const duplicateRewardValue = this.clampInt(
      Math.floor(referencePrice * rule.duplicateRewardRate),
      rule.duplicateRewardMin,
      rule.duplicateRewardMax,
    );

    const newRewardValue = this.clampInt(
      Math.floor(referencePrice * rule.newRewardRate),
      rule.newRewardMin,
      rule.newRewardMax,
    );

    const quickSellUnitPrice = Math.max(
      1,
      Math.round(referencePrice * rule.quickSellRate),
    );

    return {
      cardId,
      rarity,
      openingReferencePrice: referencePrice,
      duplicateRewardValue,
      newRewardValue,
      quickSellRate: rule.quickSellRate,
      quickSellUnitPrice,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private clampInt(value: number, min: number, max: number): number {
    return Math.round(this.clamp(value, min, max));
  }
}
