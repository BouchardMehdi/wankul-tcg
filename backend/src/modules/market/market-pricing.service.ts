import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Card } from '../cards/card.entity';
import { UserCard } from '../users/user-card.entity';
import {
  DEFAULT_MARKET_BASE_VALUE,
  MARKET_RARITY_BASE_VALUES,
} from './constants/market-rarity-values';

export interface MarketPriceDetails {
  cardId: number;
  cardKey: string;
  cardName: string;
  rarity: string;
  baseValue: number;
  ownersCount: number;
  totalCopies: number;
  ownershipRate: number;
  scarcityMultiplier: number;
  circulationMultiplier: number;
  finalPrice: number;
}

@Injectable()
export class MarketPricingService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @InjectRepository(UserCard)
    private readonly userCardsRepository: Repository<UserCard>,
  ) {}

  async getMarketPrice(cardId: number): Promise<MarketPriceDetails> {
    const card = await this.cardsRepository.findOne({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    const baseValue =
      MARKET_RARITY_BASE_VALUES[card.rarity] ?? DEFAULT_MARKET_BASE_VALUE;

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

    const finalPrice = Math.max(
      1,
      Math.round(baseValue * scarcityMultiplier * circulationMultiplier),
    );

    return {
      cardId: card.id,
      cardKey: card.key,
      cardName: card.name,
      rarity: card.rarity,
      baseValue,
      ownersCount,
      totalCopies,
      ownershipRate,
      scarcityMultiplier,
      circulationMultiplier,
      finalPrice,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}