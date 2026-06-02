"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiAbuseService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const economic_action_log_entity_1 = require("./economic-action-log.entity");
const market_transaction_entity_1 = require("../market/market-transaction.entity");
const user_entity_1 = require("../users/user.entity");
const card_entity_1 = require("../cards/card.entity");
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const ANTI_ABUSE_ALERT_ACTIONS = [
    'ANTI_ABUSE_OPENING_SPIKE',
    'ANTI_ABUSE_PAIR_TRADING',
    'ANTI_ABUSE_PRICE_OUTLIER',
    'ANTI_ABUSE_FAST_ENRICHMENT',
];
const OPENING_ACTIONS = ['OPEN_BOOSTER', 'OPEN_DISPLAY'];
const CREDIT_GAIN_ACTIONS = [
    'OPEN_BOOSTER',
    'OPEN_DISPLAY',
    'QUICK_SELL',
    'MARKET_SALE',
    'MARKET_REWARD_CLAIM',
    'BADGE_REWARD',
    'SIGNUP_BONUS',
    'ECONOMY_CREDITS_ADD',
];
const ACTION_RATE_LIMITS = {
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
let AntiAbuseService = class AntiAbuseService {
    logRepo;
    transactionRepo;
    userRepo;
    cardRepo;
    buckets = new Map();
    constructor(logRepo, transactionRepo, userRepo, cardRepo) {
        this.logRepo = logRepo;
        this.transactionRepo = transactionRepo;
        this.userRepo = userRepo;
        this.cardRepo = cardRepo;
    }
    async assertRateLimit(userId, action) {
        const rules = ACTION_RATE_LIMITS[action] ?? [];
        const now = Date.now();
        for (const rule of rules) {
            const key = `${userId}:${action}:${rule.windowMs}`;
            const hits = (this.buckets.get(key) ?? []).filter((timestamp) => now - timestamp < rule.windowMs);
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
                throw new common_1.HttpException('Trop d’actions en peu de temps. Attends un instant avant de recommencer.', common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            hits.push(now);
            this.buckets.set(key, hits);
        }
    }
    async assertListingPriceGuard(input) {
        const decision = this.evaluatePriceGuard(input);
        if (decision.status === 'blocked') {
            await this.logAction({
                userId: input.userId,
                cardId: input.cardId,
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
            throw new common_1.BadRequestException('Prix refusé: l’annonce est trop éloignée de la valeur marché actuelle.');
        }
        if (decision.status === 'flagged') {
            await this.logAction({
                userId: input.userId,
                cardId: input.cardId,
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
    async assertPurchaseRisk(input) {
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
        const shouldBlock = decision.status === 'blocked' ||
            pairStats.count >= 24 ||
            buyerStats.count >= 35;
        if (shouldBlock) {
            await this.logAction({
                userId: input.buyerId,
                relatedUserId: input.sellerId,
                cardId: input.cardId,
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
            throw new common_1.BadRequestException('Achat refusé: cette transaction ressemble trop à une manipulation de marché.');
        }
        if (decision.status === 'flagged') {
            await this.logAction({
                userId: input.buyerId,
                relatedUserId: input.sellerId,
                cardId: input.cardId,
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
    async logAction(input) {
        try {
            const savedLog = await this.logRepo.save(this.logRepo.create({
                userId: input.userId ?? null,
                relatedUserId: input.relatedUserId ?? null,
                cardId: input.cardId ?? null,
                action: input.action,
                status: input.status ?? 'allowed',
                severity: input.severity ?? 'info',
                targetType: input.targetType ?? null,
                targetId: input.targetId ?? null,
                valueCredits: Math.max(0, Math.round(input.valueCredits ?? 0)),
                reason: input.reason?.slice(0, 255) ?? null,
                metadata: input.metadata ?? null,
            }));
            await this.detectAutomatedAlerts(input, savedLog);
        }
        catch {
        }
    }
    async getOverview(days = 7) {
        const safeDays = Math.min(90, Math.max(1, Number(days) || 7));
        const since = new Date();
        since.setDate(since.getDate() - safeDays);
        const [summaryRows, recentRows, alertRows] = await Promise.all([
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
                .getRawMany(),
            this.logRepo.find({
                where: { createdAt: (0, typeorm_2.MoreThanOrEqual)(since) },
                order: { createdAt: 'DESC' },
                take: 12,
            }),
            this.logRepo.find({
                where: {
                    action: (0, typeorm_2.In)(ANTI_ABUSE_ALERT_ACTIONS),
                    createdAt: (0, typeorm_2.MoreThanOrEqual)(since),
                },
                order: { createdAt: 'DESC' },
                take: 8,
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
            if (row.severity === 'danger')
                totals.danger += count;
            return {
                action: row.action,
                status: row.status,
                severity: row.severity,
                count,
            };
        });
        const [recentEvents, alerts] = await Promise.all([
            this.enrichLogRows(recentRows),
            this.enrichLogRows(alertRows),
        ]);
        return {
            totals,
            byAction,
            recentEvents,
            alerts,
        };
    }
    async getLogs(params = {}) {
        const { safeDays, from, to } = this.resolveLogDateRange(params);
        const page = Math.max(1, Number(params.page ?? 1) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 25) || 25));
        const qb = this.logRepo
            .createQueryBuilder('log')
            .where('log.createdAt >= :from', { from })
            .andWhere('log.createdAt <= :to', { to });
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
            const userId = Number(params.userId);
            qb.andWhere(new typeorm_2.Brackets((subQb) => {
                subQb
                    .where('log.userId = :userId', { userId })
                    .orWhere('log.relatedUserId = :userId', { userId })
                    .orWhere("JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.sellerId')) = :userIdText", {
                    userIdText: String(userId),
                })
                    .orWhere("JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.buyerId')) = :userIdText", {
                    userIdText: String(userId),
                });
            }));
        }
        if (params.cardId) {
            const cardId = Number(params.cardId);
            qb.andWhere(new typeorm_2.Brackets((subQb) => {
                subQb
                    .where('log.cardId = :cardId', { cardId })
                    .orWhere("(log.targetType = 'card' AND log.targetId = :cardId)", { cardId })
                    .orWhere("JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.cardId')) = :cardIdText", {
                    cardIdText: String(cardId),
                })
                    .orWhere("JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.wantedCardId')) = :cardIdText", {
                    cardIdText: String(cardId),
                })
                    .orWhere("JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.offeredCardId')) = :cardIdText", {
                    cardIdText: String(cardId),
                })
                    .orWhere("JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.rewards.cardId')) = :cardIdText", {
                    cardIdText: String(cardId),
                })
                    .orWhere('log.metadata LIKE :cardIdArrayLike', {
                    cardIdArrayLike: `%"cardIds":[%${cardId}%]%`,
                });
            }));
        }
        if (params.targetType?.trim()) {
            qb.andWhere('log.targetType = :targetType', {
                targetType: params.targetType.trim(),
            });
        }
        const [rows, total] = await qb
            .orderBy('log.createdAt', 'DESC')
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();
        const items = await this.enrichLogRows(rows);
        return {
            items,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / pageSize)),
            },
            filters: {
                days: safeDays,
                from: from.toISOString(),
                to: to.toISOString(),
                action: params.action?.trim() || null,
                status: params.status || null,
                severity: params.severity || null,
                userId: params.userId || null,
                cardId: params.cardId || null,
                targetType: params.targetType?.trim() || null,
            },
        };
    }
    async hasActionLog(action, targetType, targetId) {
        const count = await this.logRepo.count({
            where: {
                action,
                targetType,
                targetId,
            },
        });
        return count > 0;
    }
    async detectAutomatedAlerts(input, sourceLog) {
        const action = String(input.action);
        if (ANTI_ABUSE_ALERT_ACTIONS.includes(action))
            return;
        const tasks = [];
        if (input.userId && OPENING_ACTIONS.includes(action)) {
            tasks.push(this.detectOpeningSpikeAlert(input, sourceLog));
        }
        if (input.userId &&
            input.relatedUserId &&
            (action === 'MARKET_BUY' || action === 'MARKET_SALE')) {
            tasks.push(this.detectPairTradingAlert(input, sourceLog));
        }
        if (input.userId &&
            (action === 'MARKET_LISTING_CREATE' || action === 'MARKET_BUY')) {
            tasks.push(this.detectPriceOutlierAlert(input, sourceLog));
        }
        if (input.userId &&
            CREDIT_GAIN_ACTIONS.includes(action) &&
            Number(input.valueCredits ?? 0) > 0) {
            tasks.push(this.detectFastEnrichmentAlert(input, sourceLog));
        }
        await Promise.all(tasks);
    }
    async detectOpeningSpikeAlert(input, sourceLog) {
        if (!input.userId)
            return;
        const windowMs = 10 * MINUTE;
        const since = new Date(Date.now() - windowMs);
        const rows = await this.logRepo
            .createQueryBuilder('log')
            .select('log.action', 'action')
            .addSelect('COUNT(log.id)', 'count')
            .where('log.userId = :userId', { userId: input.userId })
            .andWhere('log.createdAt >= :since', { since })
            .andWhere('log.action IN (:...actions)', { actions: OPENING_ACTIONS })
            .andWhere("log.status != 'blocked'")
            .groupBy('log.action')
            .getRawMany();
        const boosterCount = this.readActionCount(rows, 'OPEN_BOOSTER');
        const displayCount = this.readActionCount(rows, 'OPEN_DISPLAY');
        const totalOpenings = boosterCount + displayCount;
        const weightedOpenings = boosterCount + displayCount * 10;
        const severity = weightedOpenings >= 60 || displayCount >= 5 || totalOpenings >= 45
            ? 'danger'
            : weightedOpenings >= 25 || displayCount >= 2 || totalOpenings >= 18
                ? 'watch'
                : null;
        if (!severity)
            return;
        await this.logAlertOnce({
            userId: input.userId,
            action: 'ANTI_ABUSE_OPENING_SPIKE',
            status: 'flagged',
            severity,
            targetType: 'user',
            targetId: input.userId,
            valueCredits: input.valueCredits,
            reason: severity === 'danger'
                ? "Pic d'openings très élevé"
                : "Rythme d'openings inhabituel",
            metadata: {
                sourceAction: input.action,
                sourceLogId: sourceLog.id,
                windowMinutes: Math.round(windowMs / MINUTE),
                boosterCount,
                displayCount,
                totalOpenings,
                weightedOpenings,
            },
            dedupeWindowMs: 15 * MINUTE,
        });
    }
    async detectPairTradingAlert(input, sourceLog) {
        if (!input.userId || !input.relatedUserId)
            return;
        const [pairStats1h, pairStats24h] = await Promise.all([
            this.getPairStats(input.userId, input.relatedUserId, HOUR),
            this.getPairStats(input.userId, input.relatedUserId, DAY),
        ]);
        const severity = pairStats24h.count >= 12 ||
            pairStats24h.volume >= 50000 ||
            pairStats1h.count >= 8
            ? 'danger'
            : pairStats24h.count >= 6 ||
                pairStats24h.volume >= 15000 ||
                pairStats1h.count >= 4
                ? 'watch'
                : null;
        if (!severity)
            return;
        const pairUserA = Math.min(input.userId, input.relatedUserId);
        const pairUserB = Math.max(input.userId, input.relatedUserId);
        await this.logAlertOnce({
            userId: pairUserA,
            relatedUserId: pairUserB,
            action: 'ANTI_ABUSE_PAIR_TRADING',
            status: 'flagged',
            severity,
            targetType: 'user_pair',
            valueCredits: pairStats24h.volume,
            reason: severity === 'danger'
                ? 'Échanges répétés très suspects entre deux comptes'
                : 'Échanges répétés entre deux comptes',
            metadata: {
                sourceAction: input.action,
                sourceLogId: sourceLog.id,
                sourceUserId: input.userId,
                sourceRelatedUserId: input.relatedUserId,
                sourceCardId: input.cardId ?? null,
                sourceTargetType: input.targetType ?? null,
                sourceTargetId: input.targetId ?? null,
                pairStats1h,
                pairStats24h,
            },
            dedupeWindowMs: 4 * HOUR,
        });
    }
    async detectPriceOutlierAlert(input, sourceLog) {
        const metadata = input.metadata ?? {};
        const decision = metadata.decision ?? metadata.priceDecision ?? metadata.abuseDecision ?? null;
        if (!decision || typeof decision !== 'object')
            return;
        const ratioPercent = this.toFiniteNumber(decision.ratioPercent);
        const referenceValue = this.toFiniteNumber(decision.referenceValue ?? metadata.referenceListedValue);
        const requestedValue = this.toFiniteNumber(decision.requestedValue ??
            metadata.referenceRequestedValue ??
            input.valueCredits);
        const isOutlier = input.status === 'flagged' ||
            input.status === 'blocked' ||
            ratioPercent >= 175 ||
            (ratioPercent > 0 && ratioPercent <= 45);
        if (!isOutlier)
            return;
        const severity = input.status === 'blocked' ||
            input.severity === 'danger' ||
            ratioPercent >= 300 ||
            (ratioPercent > 0 && ratioPercent <= 5)
            ? 'danger'
            : 'watch';
        await this.logAlertOnce({
            userId: input.userId,
            relatedUserId: input.relatedUserId,
            cardId: input.cardId,
            action: 'ANTI_ABUSE_PRICE_OUTLIER',
            status: 'flagged',
            severity,
            targetType: input.targetType ?? 'card',
            targetId: input.targetId ?? input.cardId ?? null,
            valueCredits: Math.round(requestedValue || input.valueCredits || 0),
            reason: ratioPercent > 100
                ? 'Prix anormalement haut par rapport au marché'
                : 'Prix anormalement bas par rapport au marché',
            metadata: {
                sourceAction: input.action,
                sourceLogId: sourceLog.id,
                ratioPercent,
                referenceValue,
                requestedValue,
                decision,
            },
            dedupeWindowMs: HOUR,
        });
    }
    async detectFastEnrichmentAlert(input, sourceLog) {
        if (!input.userId)
            return;
        const [stats30m, stats24h] = await Promise.all([
            this.getCreditGainStats(input.userId, 30 * MINUTE),
            this.getCreditGainStats(input.userId, DAY),
        ]);
        const severity = stats30m.volume >= 75000 || stats24h.volume >= 200000
            ? 'danger'
            : stats30m.volume >= 25000 || stats24h.volume >= 75000
                ? 'watch'
                : null;
        if (!severity)
            return;
        await this.logAlertOnce({
            userId: input.userId,
            action: 'ANTI_ABUSE_FAST_ENRICHMENT',
            status: 'flagged',
            severity,
            targetType: 'user',
            targetId: input.userId,
            valueCredits: stats30m.volume,
            reason: severity === 'danger'
                ? 'Enrichissement très rapide'
                : 'Enrichissement rapide à surveiller',
            metadata: {
                sourceAction: input.action,
                sourceLogId: sourceLog.id,
                stats30m,
                stats24h,
            },
            dedupeWindowMs: HOUR,
        });
    }
    async logAlertOnce(input) {
        const since = new Date(Date.now() - (input.dedupeWindowMs ?? HOUR));
        const qb = this.logRepo
            .createQueryBuilder('log')
            .where('log.action = :action', { action: input.action })
            .andWhere('log.createdAt >= :since', { since });
        if (input.userId !== undefined && input.userId !== null) {
            qb.andWhere('log.userId = :userId', { userId: input.userId });
        }
        if (input.relatedUserId !== undefined && input.relatedUserId !== null) {
            qb.andWhere('log.relatedUserId = :relatedUserId', {
                relatedUserId: input.relatedUserId,
            });
        }
        if (input.cardId !== undefined && input.cardId !== null) {
            qb.andWhere('log.cardId = :cardId', { cardId: input.cardId });
        }
        if (input.targetType) {
            qb.andWhere('log.targetType = :targetType', {
                targetType: input.targetType,
            });
        }
        if (input.targetId !== undefined && input.targetId !== null) {
            qb.andWhere('log.targetId = :targetId', { targetId: input.targetId });
        }
        const existing = await qb.getCount();
        if (existing > 0)
            return;
        await this.logRepo.save(this.logRepo.create({
            userId: input.userId ?? null,
            relatedUserId: input.relatedUserId ?? null,
            cardId: input.cardId ?? null,
            action: input.action,
            status: input.status ?? 'flagged',
            severity: input.severity ?? 'watch',
            targetType: input.targetType ?? null,
            targetId: input.targetId ?? null,
            valueCredits: Math.max(0, Math.round(input.valueCredits ?? 0)),
            reason: input.reason?.slice(0, 255) ?? null,
            metadata: input.metadata ?? null,
        }));
    }
    async getCreditGainStats(userId, windowMs) {
        const since = new Date(Date.now() - windowMs);
        const row = await this.logRepo
            .createQueryBuilder('log')
            .select('COUNT(log.id)', 'count')
            .addSelect('COALESCE(SUM(log.valueCredits), 0)', 'volume')
            .where('log.userId = :userId', { userId })
            .andWhere('log.createdAt >= :since', { since })
            .andWhere('log.action IN (:...actions)', { actions: CREDIT_GAIN_ACTIONS })
            .andWhere("log.status != 'blocked'")
            .getRawOne();
        return {
            count: Number(row?.count ?? 0),
            volume: Number(row?.volume ?? 0),
            windowMinutes: Math.round(windowMs / MINUTE),
        };
    }
    readActionCount(rows, action) {
        const row = rows.find((item) => item.action === action);
        return Number(row?.count ?? 0);
    }
    toFiniteNumber(value) {
        const num = Number(value ?? 0);
        return Number.isFinite(num) ? num : 0;
    }
    resolveLogDateRange(params) {
        const safeDays = Math.min(180, Math.max(1, Number(params.days) || 7));
        const fallbackFrom = new Date();
        fallbackFrom.setDate(fallbackFrom.getDate() - safeDays);
        const parsedFrom = params.from ? new Date(`${params.from}T00:00:00`) : null;
        const parsedTo = params.to ? new Date(`${params.to}T23:59:59.999`) : null;
        const from = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : fallbackFrom;
        const to = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : new Date();
        if (from.getTime() > to.getTime()) {
            return {
                safeDays,
                from: to,
                to: from,
            };
        }
        return {
            safeDays,
            from,
            to,
        };
    }
    async enrichLogRows(rows) {
        const userIds = new Set();
        const cardIds = new Set();
        for (const row of rows) {
            const primaryUserId = row.userId ?? null;
            const relatedUserId = this.getRelatedUserId(row);
            const cardId = this.getPrimaryCardId(row);
            if (primaryUserId)
                userIds.add(primaryUserId);
            if (relatedUserId)
                userIds.add(relatedUserId);
            if (cardId)
                cardIds.add(cardId);
        }
        const [users, cards] = await Promise.all([
            userIds.size
                ? this.userRepo
                    .createQueryBuilder('user')
                    .where('user.id IN (:...ids)', { ids: Array.from(userIds) })
                    .getMany()
                : Promise.resolve([]),
            cardIds.size
                ? this.cardRepo
                    .createQueryBuilder('card')
                    .where('card.id IN (:...ids)', { ids: Array.from(cardIds) })
                    .getMany()
                : Promise.resolve([]),
        ]);
        const usersById = new Map(users.map((user) => [user.id, user]));
        const cardsById = new Map(cards.map((card) => [card.id, card]));
        return rows.map((row) => {
            const relatedUserId = this.getRelatedUserId(row);
            const cardId = this.getPrimaryCardId(row);
            const user = row.userId ? usersById.get(row.userId) : null;
            const relatedUser = relatedUserId ? usersById.get(relatedUserId) : null;
            const card = cardId ? cardsById.get(cardId) : null;
            return {
                id: row.id,
                userId: row.userId,
                username: user?.username ?? null,
                relatedUserId,
                relatedUsername: relatedUser?.username ?? null,
                cardId,
                cardKey: card?.key ?? null,
                cardName: card?.name ?? null,
                cardRarity: card?.rarity ?? null,
                action: row.action,
                status: row.status,
                severity: row.severity,
                targetType: row.targetType,
                targetId: row.targetId,
                valueCredits: row.valueCredits,
                reason: row.reason,
                metadata: row.metadata,
                createdAt: row.createdAt,
            };
        });
    }
    getRelatedUserId(row) {
        return (row.relatedUserId ??
            this.getMetadataNumber(row.metadata, 'relatedUserId') ??
            this.getMetadataNumber(row.metadata, 'sellerId') ??
            this.getMetadataNumber(row.metadata, 'buyerId') ??
            null);
    }
    getPrimaryCardId(row) {
        if (row.cardId)
            return row.cardId;
        if (row.targetType === 'card' && row.targetId)
            return row.targetId;
        return (this.getMetadataNumber(row.metadata, 'cardId') ??
            this.getMetadataNumber(row.metadata, 'soldCardId') ??
            this.getMetadataNumber(row.metadata, 'wantedCardId') ??
            this.getMetadataNumber(row.metadata, 'offeredCardId') ??
            this.getMetadataNumber(row.metadata, 'rewards.cardId') ??
            this.getFirstMetadataArrayNumber(row.metadata, 'hitCardIds') ??
            this.getFirstMetadataArrayNumber(row.metadata, 'newCardIds') ??
            this.getFirstMetadataArrayNumber(row.metadata, 'cardIds') ??
            null);
    }
    getMetadataNumber(metadata, path) {
        if (!metadata)
            return null;
        const value = path
            .split('.')
            .reduce((cursor, key) => (cursor && typeof cursor === 'object' ? cursor[key] : undefined), metadata);
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : null;
    }
    getFirstMetadataArrayNumber(metadata, key) {
        const value = metadata?.[key];
        if (!Array.isArray(value))
            return null;
        for (const item of value) {
            const num = Number(item);
            if (Number.isFinite(num) && num > 0)
                return num;
        }
        return null;
    }
    evaluatePriceGuard(input) {
        const referenceValue = Math.max(1, Math.round(input.referenceValue));
        const requestedValue = Math.max(0, Math.round(input.requestedValue));
        const ratio = requestedValue / referenceValue;
        const ratioPercent = Number((ratio * 100).toFixed(2));
        const reasons = [];
        let status = 'allowed';
        let severity = 'info';
        if (requestedValue <= 0) {
            reasons.push('Valeur demandée nulle');
            status = 'blocked';
            severity = 'danger';
        }
        else if (ratio > 3 || ratio < 0.05) {
            reasons.push('Prix extrême vs marché');
            status = 'blocked';
            severity = 'danger';
        }
        else if (ratio > 1.75 || ratio < 0.45) {
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
    async getPairStats(buyerId, sellerId, windowMs) {
        const since = new Date(Date.now() - windowMs);
        const row = await this.transactionRepo
            .createQueryBuilder('tx')
            .select('COUNT(tx.id)', 'count')
            .addSelect('COALESCE(SUM(tx.totalPriceCredits), 0)', 'volume')
            .where('tx.createdAt >= :since', { since })
            .andWhere('((tx.buyer_id = :buyerId AND tx.seller_id = :sellerId) OR (tx.buyer_id = :sellerId AND tx.seller_id = :buyerId))', { buyerId, sellerId })
            .getRawOne();
        return {
            count: Number(row?.count ?? 0),
            volume: Number(row?.volume ?? 0),
        };
    }
    async getBuyerStats(buyerId, windowMs) {
        const since = new Date(Date.now() - windowMs);
        const row = await this.transactionRepo
            .createQueryBuilder('tx')
            .select('COUNT(tx.id)', 'count')
            .addSelect('COALESCE(SUM(tx.totalPriceCredits), 0)', 'volume')
            .where('tx.createdAt >= :since', { since })
            .andWhere('tx.buyer_id = :buyerId', { buyerId })
            .getRawOne();
        return {
            count: Number(row?.count ?? 0),
            volume: Number(row?.volume ?? 0),
        };
    }
};
exports.AntiAbuseService = AntiAbuseService;
exports.AntiAbuseService = AntiAbuseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(economic_action_log_entity_1.EconomicActionLog)),
    __param(1, (0, typeorm_1.InjectRepository)(market_transaction_entity_1.MarketTransaction)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(card_entity_1.Card)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AntiAbuseService);
//# sourceMappingURL=anti-abuse.service.js.map