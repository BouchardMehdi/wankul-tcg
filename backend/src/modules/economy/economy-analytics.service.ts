import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EconomyDailyStats } from './economy-daily-stats.entity';
import { BoosterOpening } from '../booster/booster-opening.entity';
import { DisplayOpening } from '../booster/display-opening.entity';
import { MarketListing } from '../market/market-listing.entity';
import { MarketListingStatus } from '../market/market-listing-status.enum';
import { MarketPriceHistory } from '../market/market-price-history.entity';
import { MarketTransaction } from '../market/market-transaction.entity';
import { User } from '../users/user.entity';
import { UserEconomy } from './user-economy.entity';

type RarityRewardAccumulator = {
  rarity: string;
  cardsOpened: number;
  estimatedOpeningRewards: number;
};

type SuspiciousUserAccumulator = {
  userId: number;
  username: string;
  salesCount: number;
  purchasesCount: number;
  soldVolume: number;
  boughtVolume: number;
  listingCount: number;
  cancelledListings: number;
  activeListings: number;
  openingCount: number;
  currentCredits: number;
  highDeviationTrades: number;
};

@Injectable()
export class EconomyAnalyticsService {
  constructor(
    @InjectRepository(EconomyDailyStats)
    private repo: Repository<EconomyDailyStats>,
    @InjectRepository(BoosterOpening)
    private boosterOpeningRepo: Repository<BoosterOpening>,
    @InjectRepository(DisplayOpening)
    private displayOpeningRepo: Repository<DisplayOpening>,
    @InjectRepository(MarketListing)
    private marketListingRepo: Repository<MarketListing>,
    @InjectRepository(MarketPriceHistory)
    private marketPriceHistoryRepo: Repository<MarketPriceHistory>,
    @InjectRepository(MarketTransaction)
    private marketTransactionRepo: Repository<MarketTransaction>,
    @InjectRepository(UserEconomy)
    private userEconomyRepo: Repository<UserEconomy>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
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

  private since(days: number) {
    const safeDays = Math.max(1, Math.min(90, Math.floor(days || 7)));
    return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  }

  private num(value: unknown) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private round(value: number, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private ratioPercent(numerator: number, denominator: number) {
    if (!denominator || denominator <= 0) return 0;
    return this.round((numerator / denominator) * 100, 1);
  }

  private normalizeRarity(value?: string | null) {
    return String(value ?? 'Inconnue').trim() || 'Inconnue';
  }

  private flattenOpeningCards(result: any): any[] {
    const cards: any[] = [];

    if (Array.isArray(result?.cards)) {
      cards.push(...result.cards);
    }

    if (Array.isArray(result?.boosters)) {
      for (const booster of result.boosters) {
        if (Array.isArray(booster)) {
          cards.push(...booster);
        } else if (Array.isArray(booster?.cards)) {
          cards.push(...booster.cards);
        }
      }
    }

    return cards;
  }

  private extractOpeningTotal(result: any) {
    const candidates = [
      result?.creditsEarnedTotal,
      result?.creditsEarned,
      result?.creditsGained,
      result?.totalCredits,
      result?.credits?.total,
      result?.credits?.display?.total,
      result?.breakdown?.total,
      result?.economy?.earnedCredits,
      result?.economy?.creditsEarned,
      result?.economy?.totalEarned,
    ];

    for (const value of candidates) {
      const n = this.num(value);
      if (n > 0) return n;
    }

    return 0;
  }

  private addUser(users: Map<number, SuspiciousUserAccumulator>, userId: number, username: string) {
    const id = this.num(userId);
    if (!id) return null;

    const existing = users.get(id);
    if (existing) {
      if (username && !existing.username) existing.username = username;
      return existing;
    }

    const created: SuspiciousUserAccumulator = {
      userId: id,
      username: username || `User #${id}`,
      salesCount: 0,
      purchasesCount: 0,
      soldVolume: 0,
      boughtVolume: 0,
      listingCount: 0,
      cancelledListings: 0,
      activeListings: 0,
      openingCount: 0,
      currentCredits: 0,
      highDeviationTrades: 0,
    };

    users.set(id, created);
    return created;
  }

  private scoreSuspiciousUser(user: SuspiciousUserAccumulator) {
    const totalTrades = user.salesCount + user.purchasesCount;
    const totalVolume = user.soldVolume + user.boughtVolume;
    const cancelRate = user.listingCount
      ? user.cancelledListings / user.listingCount
      : 0;

    let score = 0;
    const reasons: string[] = [];

    if (totalVolume >= 50000) {
      score += 30;
      reasons.push('Volume market très élevé');
    } else if (totalVolume >= 15000) {
      score += 16;
      reasons.push('Volume market élevé');
    }

    if (user.highDeviationTrades >= 3) {
      score += 22;
      reasons.push('Trades très éloignés du prix de marché');
    } else if (user.highDeviationTrades > 0) {
      score += 10;
      reasons.push('Quelques trades atypiques');
    }

    if (user.listingCount >= 6 && cancelRate >= 0.6) {
      score += 18;
      reasons.push('Beaucoup d’annonces annulées');
    }

    if (user.openingCount >= 80) {
      score += 14;
      reasons.push('Rythme d’opening très haut');
    }

    if (user.currentCredits >= 100000) {
      score += 14;
      reasons.push('Solde crédits très haut');
    }

    if (user.salesCount >= 12 && user.purchasesCount >= 12) {
      score += 10;
      reasons.push('Achete et revend beaucoup');
    }

    return {
      score: Math.min(100, score),
      reasons,
      totalTrades,
      totalVolume,
      cancelRatePercent: this.round(cancelRate * 100, 1),
    };
  }

  private async getRarityRewardEstimates(since: Date) {
    const [boosters, displays] = await Promise.all([
      this.boosterOpeningRepo
        .createQueryBuilder('opening')
        .where('opening.openedAt >= :since', { since })
        .select(['opening.resultJson'])
        .getMany(),
      this.displayOpeningRepo
        .createQueryBuilder('opening')
        .where('opening.openedAt >= :since', { since })
        .select(['opening.resultJson'])
        .getMany(),
    ]);

    const byRarity = new Map<string, RarityRewardAccumulator>();

    for (const row of [...boosters, ...displays]) {
      const result = row.resultJson ?? {};
      const cards = this.flattenOpeningCards(result);
      const total = this.extractOpeningTotal(result);
      if (!cards.length || total <= 0) continue;

      const perCardEstimate = total / cards.length;

      for (const card of cards) {
        const rarity = this.normalizeRarity(card?.rarity);
        const acc =
          byRarity.get(rarity) ??
          ({
            rarity,
            cardsOpened: 0,
            estimatedOpeningRewards: 0,
          } satisfies RarityRewardAccumulator);

        acc.cardsOpened += 1;
        acc.estimatedOpeningRewards += perCardEstimate;
        byRarity.set(rarity, acc);
      }
    }

    return byRarity;
  }

  private async buildAdvancedOverview(days: number, rows: EconomyDailyStats[]) {
    const since = this.since(days);

    const totals = rows.reduce(
      (acc, r) => {
        acc.creditsCreatedOpening += this.num(r.creditsEarnedOpening);
        acc.creditsCreatedQuickSell += this.num(r.creditsEarnedQuickSell);
        acc.creditsCreatedJackpot += this.num(r.creditsEarnedJackpot);
        acc.creditsDestroyedOpening += this.num(r.creditsSpent);
        acc.marketVolume += this.num(r.marketVolume);
        acc.boostersOpened += this.num(r.boostersOpened);
        acc.displaysOpened += this.num(r.displaysOpened);
        return acc;
      },
      {
        creditsCreatedOpening: 0,
        creditsCreatedQuickSell: 0,
        creditsCreatedJackpot: 0,
        creditsDestroyedOpening: 0,
        marketVolume: 0,
        boostersOpened: 0,
        displaysOpened: 0,
      },
    );

    const creditsCreated =
      totals.creditsCreatedOpening +
      totals.creditsCreatedQuickSell +
      totals.creditsCreatedJackpot;
    const creditsDestroyed = totals.creditsDestroyedOpening;
    const netInflation = creditsCreated - creditsDestroyed;
    const totalOpenings = totals.boostersOpened + totals.displaysOpened;
    const riskScore = Math.min(
      100,
      Math.round(
        Math.max(0, this.ratioPercent(netInflation, Math.max(1, creditsDestroyed))) * 0.7 +
          this.ratioPercent(totals.creditsCreatedQuickSell, Math.max(1, creditsCreated)) * 0.3,
      ),
    );

    const [rarityMarketRows, cardMarketRows, priceHistoryRows, sellerRows, buyerRows, listingRows, economyRows, users, openingRows] =
      await Promise.all([
        this.marketTransactionRepo
          .createQueryBuilder('tx')
          .innerJoin('tx.card', 'card')
          .leftJoin('tx.listing', 'listing')
          .select('card.rarity', 'rarity')
          .addSelect('COUNT(tx.id)', 'saleCount')
          .addSelect('SUM(tx.quantity)', 'quantitySold')
          .addSelect('SUM(tx.totalPriceCredits)', 'volume')
          .addSelect('AVG(tx.unitPriceCredits)', 'avgUnitPrice')
          .addSelect('AVG(NULLIF(listing.marketPriceSnapshot, 0))', 'avgMarketSnapshot')
          .where('tx.createdAt >= :since', { since })
          .andWhere('tx.totalPriceCredits > 0')
          .groupBy('card.rarity')
          .getRawMany(),
        this.marketTransactionRepo
          .createQueryBuilder('tx')
          .innerJoin('tx.card', 'card')
          .leftJoin('tx.listing', 'listing')
          .select('card.id', 'cardId')
          .addSelect('card.name', 'cardName')
          .addSelect('card.rarity', 'rarity')
          .addSelect('COUNT(tx.id)', 'saleCount')
          .addSelect('SUM(tx.quantity)', 'quantitySold')
          .addSelect('SUM(tx.totalPriceCredits)', 'volume')
          .addSelect('AVG(tx.unitPriceCredits)', 'avgUnitPrice')
          .addSelect('AVG(NULLIF(listing.marketPriceSnapshot, 0))', 'avgMarketSnapshot')
          .addSelect(
            'SUM(CASE WHEN listing.marketPriceSnapshot > 0 AND (tx.unitPriceCredits >= listing.marketPriceSnapshot * 1.75 OR tx.unitPriceCredits <= listing.marketPriceSnapshot * 0.55) THEN 1 ELSE 0 END)',
            'outlierTrades',
          )
          .addSelect('MAX(tx.createdAt)', 'lastSaleAt')
          .where('tx.createdAt >= :since', { since })
          .andWhere('tx.totalPriceCredits > 0')
          .groupBy('card.id')
          .addGroupBy('card.name')
          .addGroupBy('card.rarity')
          .getRawMany(),
        this.marketPriceHistoryRepo
          .createQueryBuilder('history')
          .innerJoin('history.card', 'card')
          .select('card.id', 'cardId')
          .addSelect('card.name', 'cardName')
          .addSelect('card.rarity', 'rarity')
          .addSelect('COUNT(history.id)', 'samples')
          .addSelect('MIN(history.price)', 'minPrice')
          .addSelect('MAX(history.price)', 'maxPrice')
          .addSelect('AVG(history.price)', 'avgPrice')
          .addSelect('MAX(history.recordedAt)', 'lastRecordedAt')
          .where('history.recordedAt >= :since', { since })
          .groupBy('card.id')
          .addGroupBy('card.name')
          .addGroupBy('card.rarity')
          .getRawMany(),
        this.marketTransactionRepo
          .createQueryBuilder('tx')
          .innerJoin('tx.seller', 'user')
          .leftJoin('tx.listing', 'listing')
          .select('user.id', 'userId')
          .addSelect('user.username', 'username')
          .addSelect('COUNT(tx.id)', 'salesCount')
          .addSelect('SUM(tx.totalPriceCredits)', 'soldVolume')
          .addSelect(
            'SUM(CASE WHEN listing.marketPriceSnapshot > 0 AND (tx.unitPriceCredits >= listing.marketPriceSnapshot * 1.75 OR tx.unitPriceCredits <= listing.marketPriceSnapshot * 0.55) THEN 1 ELSE 0 END)',
            'highDeviationTrades',
          )
          .where('tx.createdAt >= :since', { since })
          .groupBy('user.id')
          .addGroupBy('user.username')
          .getRawMany(),
        this.marketTransactionRepo
          .createQueryBuilder('tx')
          .innerJoin('tx.buyer', 'user')
          .leftJoin('tx.listing', 'listing')
          .select('user.id', 'userId')
          .addSelect('user.username', 'username')
          .addSelect('COUNT(tx.id)', 'purchasesCount')
          .addSelect('SUM(tx.totalPriceCredits)', 'boughtVolume')
          .addSelect(
            'SUM(CASE WHEN listing.marketPriceSnapshot > 0 AND (tx.unitPriceCredits >= listing.marketPriceSnapshot * 1.75 OR tx.unitPriceCredits <= listing.marketPriceSnapshot * 0.55) THEN 1 ELSE 0 END)',
            'highDeviationTrades',
          )
          .where('tx.createdAt >= :since', { since })
          .groupBy('user.id')
          .addGroupBy('user.username')
          .getRawMany(),
        this.marketListingRepo
          .createQueryBuilder('listing')
          .innerJoin('listing.seller', 'user')
          .select('user.id', 'userId')
          .addSelect('user.username', 'username')
          .addSelect('COUNT(listing.id)', 'listingCount')
          .addSelect(
            `SUM(CASE WHEN listing.status = '${MarketListingStatus.CANCELLED}' THEN 1 ELSE 0 END)`,
            'cancelledListings',
          )
          .addSelect(
            `SUM(CASE WHEN listing.status = '${MarketListingStatus.ACTIVE}' THEN 1 ELSE 0 END)`,
            'activeListings',
          )
          .where('listing.createdAt >= :since', { since })
          .groupBy('user.id')
          .addGroupBy('user.username')
          .getRawMany(),
        this.userEconomyRepo
          .createQueryBuilder('economy')
          .select('economy.userId', 'userId')
          .addSelect('economy.credits', 'credits')
          .getRawMany(),
        this.userRepo
          .createQueryBuilder('user')
          .select('user.id', 'userId')
          .addSelect('user.username', 'username')
          .getRawMany(),
        Promise.all([
          this.boosterOpeningRepo
            .createQueryBuilder('opening')
            .innerJoin('opening.user', 'user')
            .select('user.id', 'userId')
            .addSelect('user.username', 'username')
            .addSelect('COUNT(opening.id)', 'openingCount')
            .where('opening.openedAt >= :since', { since })
            .groupBy('user.id')
            .addGroupBy('user.username')
            .getRawMany(),
          this.displayOpeningRepo
            .createQueryBuilder('opening')
            .innerJoin('opening.user', 'user')
            .select('user.id', 'userId')
            .addSelect('user.username', 'username')
            .addSelect('COUNT(opening.id)', 'openingCount')
            .where('opening.openedAt >= :since', { since })
            .groupBy('user.id')
            .addGroupBy('user.username')
            .getRawMany(),
        ]),
      ]);

    const rewardEstimates = await this.getRarityRewardEstimates(since);

    const rarityProfitability = rarityMarketRows
      .map((row) => {
        const rarity = this.normalizeRarity(row.rarity);
        const saleCount = this.num(row.saleCount);
        const quantitySold = this.num(row.quantitySold);
        const marketVolume = this.num(row.volume);
        const avgUnitPrice = this.round(this.num(row.avgUnitPrice));
        const avgMarketSnapshot = this.round(this.num(row.avgMarketSnapshot));
        const avgVsMarketPercent = avgMarketSnapshot
          ? this.round((avgUnitPrice / avgMarketSnapshot - 1) * 100, 1)
          : 0;
        const reward = rewardEstimates.get(rarity);
        const estimatedRewardPerOpenedCard = reward?.cardsOpened
          ? this.round(reward.estimatedOpeningRewards / reward.cardsOpened, 1)
          : 0;

        const score =
          Math.abs(avgVsMarketPercent) +
          Math.min(35, saleCount * 2) +
          Math.min(35, marketVolume / 1000) +
          Math.min(20, estimatedRewardPerOpenedCard / 30);

        return {
          rarity,
          saleCount,
          quantitySold,
          marketVolume,
          avgUnitPrice,
          avgMarketSnapshot,
          avgVsMarketPercent,
          openedCardsCount: reward?.cardsOpened ?? 0,
          estimatedOpeningRewards: this.round(reward?.estimatedOpeningRewards ?? 0),
          estimatedRewardPerOpenedCard,
          score: this.round(score, 1),
          status:
            score >= 70 || avgVsMarketPercent >= 50
              ? 'danger'
              : score >= 40 || avgVsMarketPercent >= 25
                ? 'watch'
                : 'ok',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const historyByCard = new Map<number, any>();
    for (const row of priceHistoryRows) {
      historyByCard.set(this.num(row.cardId), row);
    }

    const tradedCardIds = new Set<number>();
    const tradedCardSignals = cardMarketRows
      .map((row) => {
        const cardId = this.num(row.cardId);
        tradedCardIds.add(cardId);
        const history = historyByCard.get(cardId);
        const avgUnitPrice = this.round(this.num(row.avgUnitPrice));
        const avgMarketSnapshot = this.round(this.num(row.avgMarketSnapshot));
        const avgVsMarketPercent = avgMarketSnapshot
          ? this.round((avgUnitPrice / avgMarketSnapshot - 1) * 100, 1)
          : 0;
        const minPrice = this.num(history?.minPrice);
        const maxPrice = this.num(history?.maxPrice);
        const avgHistoryPrice = this.num(history?.avgPrice);
        const volatilityPercent = avgHistoryPrice
          ? this.round(((maxPrice - minPrice) / avgHistoryPrice) * 100, 1)
          : 0;
        const outlierTrades = this.num(row.outlierTrades);
        const saleCount = this.num(row.saleCount);
        const score =
          Math.abs(avgVsMarketPercent) +
          volatilityPercent * 0.6 +
          outlierTrades * 18 +
          Math.min(20, saleCount * 2);

        return {
          cardId,
          cardName: row.cardName,
          rarity: this.normalizeRarity(row.rarity),
          saleCount,
          quantitySold: this.num(row.quantitySold),
          marketVolume: this.num(row.volume),
          avgUnitPrice,
          avgMarketSnapshot,
          avgVsMarketPercent,
          outlierTrades,
          volatilityPercent,
          minPrice,
          maxPrice,
          priceSamples: this.num(history?.samples),
          lastActivityAt: row.lastSaleAt ?? history?.lastRecordedAt ?? null,
          score: this.round(score, 1),
        };
      });

    const historyOnlySignals = priceHistoryRows
      .filter((row) => !tradedCardIds.has(this.num(row.cardId)))
      .map((row) => {
        const minPrice = this.num(row.minPrice);
        const maxPrice = this.num(row.maxPrice);
        const avgHistoryPrice = this.num(row.avgPrice);
        const volatilityPercent = avgHistoryPrice
          ? this.round(((maxPrice - minPrice) / avgHistoryPrice) * 100, 1)
          : 0;
        const samples = this.num(row.samples);
        const score = volatilityPercent * 0.7 + Math.min(20, samples * 1.5);

        return {
          cardId: this.num(row.cardId),
          cardName: row.cardName,
          rarity: this.normalizeRarity(row.rarity),
          saleCount: 0,
          quantitySold: 0,
          marketVolume: 0,
          avgUnitPrice: 0,
          avgMarketSnapshot: this.round(avgHistoryPrice),
          avgVsMarketPercent: 0,
          outlierTrades: 0,
          volatilityPercent,
          minPrice,
          maxPrice,
          priceSamples: samples,
          lastActivityAt: row.lastRecordedAt ?? null,
          score: this.round(score, 1),
        };
      });

    const manipulatedCards = [...tradedCardSignals, ...historyOnlySignals]
      .filter((row) => row.score >= 25 || row.outlierTrades > 0 || row.volatilityPercent >= 45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const usersById = new Map<number, SuspiciousUserAccumulator>();

    for (const row of users) {
      this.addUser(usersById, this.num(row.userId), row.username);
    }

    for (const row of sellerRows) {
      const user = this.addUser(usersById, this.num(row.userId), row.username);
      if (!user) continue;
      user.salesCount += this.num(row.salesCount);
      user.soldVolume += this.num(row.soldVolume);
      user.highDeviationTrades += this.num(row.highDeviationTrades);
    }

    for (const row of buyerRows) {
      const user = this.addUser(usersById, this.num(row.userId), row.username);
      if (!user) continue;
      user.purchasesCount += this.num(row.purchasesCount);
      user.boughtVolume += this.num(row.boughtVolume);
      user.highDeviationTrades += this.num(row.highDeviationTrades);
    }

    for (const row of listingRows) {
      const user = this.addUser(usersById, this.num(row.userId), row.username);
      if (!user) continue;
      user.listingCount += this.num(row.listingCount);
      user.cancelledListings += this.num(row.cancelledListings);
      user.activeListings += this.num(row.activeListings);
    }

    for (const row of economyRows) {
      const user = this.addUser(usersById, this.num(row.userId), '');
      if (!user) continue;
      user.currentCredits = this.num(row.credits);
    }

    for (const group of openingRows) {
      for (const row of group) {
        const user = this.addUser(usersById, this.num(row.userId), row.username);
        if (!user) continue;
        user.openingCount += this.num(row.openingCount);
      }
    }

    const suspiciousUsers = Array.from(usersById.values())
      .map((user) => {
        const scored = this.scoreSuspiciousUser(user);
        return {
          userId: user.userId,
          username: user.username,
          score: scored.score,
          reasons: scored.reasons,
          salesCount: user.salesCount,
          purchasesCount: user.purchasesCount,
          totalTrades: scored.totalTrades,
          soldVolume: user.soldVolume,
          boughtVolume: user.boughtVolume,
          totalVolume: scored.totalVolume,
          listingCount: user.listingCount,
          cancelledListings: user.cancelledListings,
          activeListings: user.activeListings,
          cancelRatePercent: scored.cancelRatePercent,
          openingCount: user.openingCount,
          currentCredits: user.currentCredits,
          highDeviationTrades: user.highDeviationTrades,
        };
      })
      .filter((user) => user.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      health: {
        creditsCreated,
        creditsCreatedOpening: totals.creditsCreatedOpening,
        creditsCreatedQuickSell: totals.creditsCreatedQuickSell,
        creditsCreatedJackpot: totals.creditsCreatedJackpot,
        creditsDestroyed,
        netInflation,
        inflationRatePercent: this.ratioPercent(netInflation, Math.max(1, creditsDestroyed)),
        marketVolume: totals.marketVolume,
        quickSellToMarketPercent: this.ratioPercent(
          totals.creditsCreatedQuickSell,
          Math.max(1, totals.marketVolume),
        ),
        quickSellShareOfCreatedPercent: this.ratioPercent(
          totals.creditsCreatedQuickSell,
          Math.max(1, creditsCreated),
        ),
        openingShareOfCreatedPercent: this.ratioPercent(
          totals.creditsCreatedOpening,
          Math.max(1, creditsCreated),
        ),
        riskScore,
        riskLevel: riskScore >= 70 ? 'danger' : riskScore >= 40 ? 'watch' : 'ok',
      },
      rarityProfitability,
      manipulatedCards,
      suspiciousUsers,
    };
  }

  async getOverview(days = 7) {
    const safeDays = Math.max(1, Math.min(90, Math.floor(days || 7)));
    const rows = await this.repo
      .createQueryBuilder('s')
      .orderBy('s.date', 'DESC')
      .limit(safeDays)
      .getMany();

    const total = rows.reduce(
      (acc, r) => {
        acc.creditsSpent += r.creditsSpent;
        acc.creditsEarned +=
          r.creditsEarnedOpening +
          r.creditsEarnedQuickSell +
          r.creditsEarnedJackpot;
        acc.creditsEarnedOpening += r.creditsEarnedOpening;
        acc.creditsEarnedQuickSell += r.creditsEarnedQuickSell;
        acc.creditsEarnedJackpot += r.creditsEarnedJackpot;
        acc.marketVolume += r.marketVolume;
        return acc;
      },
      {
        creditsSpent: 0,
        creditsEarned: 0,
        creditsEarnedOpening: 0,
        creditsEarnedQuickSell: 0,
        creditsEarnedJackpot: 0,
        marketVolume: 0,
      },
    );

    return {
      days: safeDays,
      rows,
      totals: total,
      inflation: total.creditsEarned - total.creditsSpent,
      advanced: await this.buildAdvancedOverview(safeDays, rows),
    };
  }
}
