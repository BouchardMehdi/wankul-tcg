import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import {
  EconomicActionLog,
  EconomicActionSeverity,
  EconomicActionStatus,
} from './economic-action-log.entity';
import { MarketTransaction } from '../market/market-transaction.entity';

export type EconomicAction =
  | 'OPEN_BOOSTER'
  | 'OPEN_DISPLAY'
  | 'QUICK_SELL'
  | 'MARKET_LISTING_CREATE'
  | 'MARKET_LISTING_CANCEL'
  | 'MARKET_BUY'
  | 'MARKET_REWARD_CLAIM';

type RateLimitRule = {
  windowMs: number;
  max: number;
};

type LogActionInput = {
  userId?: number | null;
  action: EconomicAction | string;
  status?: EconomicActionStatus;
  severity?: EconomicActionSeverity;
  targetType?: string | null;
  targetId?: number | null;
  valueCredits?: number;
  reason?: string | null;
  metadata?: Record<string, any> | null;
};

type PriceGuardInput = {
  userId: number;
  action: EconomicAction;
  cardId: number;
  referenceValue: number;
  requestedValue: number;
  quantity: number;
  metadata?: Record<string, any>;
};

type PurchaseRiskInput = {
  buyerId: number;
  sellerId: number;
  listingId: number;
  cardId: number;
  quantity: number;
  referenceValue: number;
  requestedValue: number;
  totalPriceCredits: number;
};

export type AbuseDecision = {
  status: EconomicActionStatus;
  severity: EconomicActionSeverity;
  reasons: string[];
  ratioPercent: number | null;
  referenceValue: number;
  requestedValue: number;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const ACTION_RATE_LIMITS: Record<EconomicAction, RateLimitRule[]> = {
  OPEN_BOOSTER: [
    { windowMs: 15 * SECOND, max: 8 },
    { windowMs: MINUTE, max: 24 },
  ],
  OPEN_DISPLAY: [
    { windowMs: 30 * SECOND, max: 3 },
    { windowMs: 5 * MINUTE, max: 10 },
  ],
  QUICK_SELL: [
    { windowMs: 10 * SECOND, max: 8 },
    { windowMs: MINUTE, max: 30 },
  ],
  MARKET_LISTING_CREATE: [
    { windowMs: MINUTE, max: 20 },
    { windowMs: 10 * MINUTE, max: 80 },
  ],
  MARKET_LISTING_CANCEL: [
    { windowMs: MINUTE, max: 25 },
    { windowMs: 10 * MINUTE, max: 100 },
  ],
  MARKET_BUY: [
    { windowMs: 10 * SECOND, max: 6 },
    { windowMs: MINUTE, max: 30 },
  ],
  MARKET_REWARD_CLAIM: [
    { windowMs: MINUTE, max: 40 },
    { windowMs: 10 * MINUTE, max: 150 },
  ],
};

@Injectable()
export class AntiAbuseService {
  private readonly buckets = new Map<string, number[]>();

  constructor(
    @InjectRepository(EconomicActionLog)
    private readonly logRepo: Repository<EconomicActionLog>,
    @InjectRepository(MarketTransaction)
    private readonly transactionRepo: Repository<MarketTransaction>,
  ) {}

  async assertRateLimit(userId: number, action: EconomicAction) {
    const rules = ACTION_RATE_LIMITS[action];
    const now = Date.now();

    for (const rule of rules) {
      const key = `${userId}:${action}:${rule.windowMs}`;
      const hits = (this.buckets.get(key) ?? []).filter(
        (timestamp) => now - timestamp < rule.windowMs,
      );

      if (hits.length >= rule.max) {
        await this.logAction({
          userId,
          action,
          status: 'blocked',
          severity: 'danger',
          reason: 'RATE_LIMIT',
          metadata: {
            windowMs: rule.windowMs,
            max: rule.max,
            hits: hits.length,
          },
        });

        throw new HttpException(
          'Trop d’actions en peu de temps. Attends un instant avant de recommencer.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      hits.push(now);
      this.buckets.set(key, hits);
    }
  }

  async assertListingPriceGuard(input: PriceGuardInput) {
    const decision = this.evaluatePriceGuard(input);

    if (decision.status === 'blocked') {
      await this.logAction({
        userId: input.userId,
        action: input.action,
        status: 'blocked',
        severity: 'danger',
        targetType: 'card',
        targetId: input.cardId,
        valueCredits: Math.round(input.requestedValue),
        reason: decision.reasons.join(', '),
        metadata: {
          ...input.metadata,
          decision,
        },
      });

      throw new BadRequestException(
        'Prix refusé: l’annonce est trop éloignée de la valeur marché actuelle.',
      );
    }

    if (decision.status === 'flagged') {
      await this.logAction({
        userId: input.userId,
        action: input.action,
        status: 'flagged',
        severity: decision.severity,
        targetType: 'card',
        targetId: input.cardId,
        valueCredits: Math.round(input.requestedValue),
        reason: decision.reasons.join(', '),
        metadata: {
          ...input.metadata,
          decision,
        },
      });
    }

    return decision;
  }

  async assertPurchaseRisk(input: PurchaseRiskInput) {
    const decision = this.evaluatePriceGuard({
      userId: input.buyerId,
      action: 'MARKET_BUY',
      cardId: input.cardId,
      referenceValue: input.referenceValue,
      requestedValue: input.requestedValue,
      quantity: input.quantity,
    });

    const [pairStats, buyerStats] = await Promise.all([
      this.getPairStats(input.buyerId, input.sellerId, 60 * MINUTE),
      this.getBuyerStats(input.buyerId, 10 * MINUTE),
    ]);

    if (pairStats.count >= 8) {
      decision.reasons.push('Echanges repetes entre les deux memes comptes');
      decision.status = decision.status === 'blocked' ? 'blocked' : 'flagged';
      decision.severity = pairStats.count >= 18 ? 'danger' : 'watch';
    }

    if (buyerStats.count >= 18 || buyerStats.volume >= 25000) {
      decision.reasons.push('Rythme achat très haut sur une courte fenêtre');
      decision.status = decision.status === 'blocked' ? 'blocked' : 'flagged';
      decision.severity = 'danger';
    }

    const shouldBlock =
      decision.status === 'blocked' ||
      pairStats.count >= 24 ||
      buyerStats.count >= 35;

    if (shouldBlock) {
      await this.logAction({
        userId: input.buyerId,
        action: 'MARKET_BUY',
        status: 'blocked',
        severity: 'danger',
        targetType: 'listing',
        targetId: input.listingId,
        valueCredits: input.totalPriceCredits,
        reason: decision.reasons.join(', '),
        metadata: {
          ...input,
          pairStats,
          buyerStats,
          decision,
        },
      });

      throw new BadRequestException(
        'Achat refusé: cette transaction ressemble trop à une manipulation de marché.',
      );
    }

    if (decision.status === 'flagged') {
      await this.logAction({
        userId: input.buyerId,
        action: 'MARKET_BUY',
        status: 'flagged',
        severity: decision.severity,
        targetType: 'listing',
        targetId: input.listingId,
        valueCredits: input.totalPriceCredits,
        reason: decision.reasons.join(', '),
        metadata: {
          ...input,
          pairStats,
          buyerStats,
          decision,
        },
      });
    }

    return decision;
  }

  async logAction(input: LogActionInput) {
    try {
      await this.logRepo.save(
        this.logRepo.create({
          userId: input.userId ?? null,
          action: input.action,
          status: input.status ?? 'allowed',
          severity: input.severity ?? 'info',
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          valueCredits: Math.max(0, Math.round(input.valueCredits ?? 0)),
          reason: input.reason?.slice(0, 255) ?? null,
          metadata: input.metadata ?? null,
        }),
      );
    } catch {
      // Le journal anti-abus ne doit jamais casser une action joueur valide.
    }
  }

  async getOverview(days = 7) {
    const safeDays = Math.min(90, Math.max(1, Number(days) || 7));
    const since = new Date();
    since.setDate(since.getDate() - safeDays);

    const [summaryRows, recentRows] = await Promise.all([
      this.logRepo
        .createQueryBuilder('log')
        .select('log.action', 'action')
        .addSelect('log.status', 'status')
        .addSelect('log.severity', 'severity')
        .addSelect('COUNT(log.id)', 'count')
        .where('log.createdAt >= :since', { since })
        .groupBy('log.action')
        .addGroupBy('log.status')
        .addGroupBy('log.severity')
        .getRawMany<{
          action: string;
          status: EconomicActionStatus;
          severity: EconomicActionSeverity;
          count: string;
        }>(),
      this.logRepo.find({
        where: { createdAt: MoreThanOrEqual(since) },
        order: { createdAt: 'DESC' },
        take: 12,
      }),
    ]);

    const totals = {
      allowed: 0,
      flagged: 0,
      blocked: 0,
      danger: 0,
    };

    const byAction = summaryRows.map((row) => {
      const count = Number(row.count ?? 0);
      totals[row.status] += count;
      if (row.severity === 'danger') totals.danger += count;

      return {
        action: row.action,
        status: row.status,
        severity: row.severity,
        count,
      };
    });

    return {
      totals,
      byAction,
      recentEvents: recentRows.map((row) => ({
        id: row.id,
        userId: row.userId,
        action: row.action,
        status: row.status,
        severity: row.severity,
        targetType: row.targetType,
        targetId: row.targetId,
        valueCredits: row.valueCredits,
        reason: row.reason,
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
    };
  }

  async getLogs(params: {
    days?: number;
    page?: number;
    pageSize?: number;
    action?: string;
    status?: EconomicActionStatus | '';
    severity?: EconomicActionSeverity | '';
    userId?: number;
  } = {}) {
    const safeDays = Math.min(180, Math.max(1, Number(params.days) || 7));
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 25) || 25));
    const since = new Date();
    since.setDate(since.getDate() - safeDays);

    const qb = this.logRepo
      .createQueryBuilder('log')
      .where('log.createdAt >= :since', { since });

    if (params.action?.trim()) {
      qb.andWhere('log.action = :action', { action: params.action.trim() });
    }

    if (params.status) {
      qb.andWhere('log.status = :status', { status: params.status });
    }

    if (params.severity) {
      qb.andWhere('log.severity = :severity', { severity: params.severity });
    }

    if (params.userId) {
      qb.andWhere('log.userId = :userId', { userId: Number(params.userId) });
    }

    const [rows, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        action: row.action,
        status: row.status,
        severity: row.severity,
        targetType: row.targetType,
        targetId: row.targetId,
        valueCredits: row.valueCredits,
        reason: row.reason,
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      filters: {
        days: safeDays,
        action: params.action?.trim() || null,
        status: params.status || null,
        severity: params.severity || null,
        userId: params.userId || null,
      },
    };
  }

  private evaluatePriceGuard(input: PriceGuardInput): AbuseDecision {
    const referenceValue = Math.max(1, Math.round(input.referenceValue));
    const requestedValue = Math.max(0, Math.round(input.requestedValue));
    const ratio = requestedValue / referenceValue;
    const ratioPercent = Number((ratio * 100).toFixed(2));
    const reasons: string[] = [];

    let status: EconomicActionStatus = 'allowed';
    let severity: EconomicActionSeverity = 'info';

    if (requestedValue <= 0) {
      reasons.push('Valeur demandée nulle');
      status = 'blocked';
      severity = 'danger';
    } else if (ratio > 3 || ratio < 0.05) {
      reasons.push('Prix extrême vs marché');
      status = 'blocked';
      severity = 'danger';
    } else if (ratio > 1.75 || ratio < 0.45) {
      reasons.push('Prix très éloigné du marché');
      status = 'flagged';
      severity = ratio > 2.35 || ratio < 0.2 ? 'danger' : 'watch';
    }

    return {
      status,
      severity,
      reasons,
      ratioPercent,
      referenceValue,
      requestedValue,
    };
  }

  private async getPairStats(buyerId: number, sellerId: number, windowMs: number) {
    const since = new Date(Date.now() - windowMs);
    const row = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('COUNT(tx.id)', 'count')
      .addSelect('COALESCE(SUM(tx.totalPriceCredits), 0)', 'volume')
      .where('tx.createdAt >= :since', { since })
      .andWhere(
        '((tx.buyer_id = :buyerId AND tx.seller_id = :sellerId) OR (tx.buyer_id = :sellerId AND tx.seller_id = :buyerId))',
        { buyerId, sellerId },
      )
      .getRawOne<{ count: string; volume: string }>();

    return {
      count: Number(row?.count ?? 0),
      volume: Number(row?.volume ?? 0),
    };
  }

  private async getBuyerStats(buyerId: number, windowMs: number) {
    const since = new Date(Date.now() - windowMs);
    const row = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('COUNT(tx.id)', 'count')
      .addSelect('COALESCE(SUM(tx.totalPriceCredits), 0)', 'volume')
      .where('tx.createdAt >= :since', { since })
      .andWhere('tx.buyer_id = :buyerId', { buyerId })
      .getRawOne<{ count: string; volume: string }>();

    return {
      count: Number(row?.count ?? 0),
      volume: Number(row?.volume ?? 0),
    };
  }
}
