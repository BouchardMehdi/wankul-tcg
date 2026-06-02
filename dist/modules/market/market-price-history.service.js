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
exports.MarketPriceHistoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const market_price_history_entity_1 = require("./market-price-history.entity");
const market_pricing_service_1 = require("./market-pricing.service");
let MarketPriceHistoryService = class MarketPriceHistoryService {
    historyRepo;
    marketPricingService;
    constructor(historyRepo, marketPricingService) {
        this.historyRepo = historyRepo;
        this.marketPricingService = marketPricingService;
    }
    async recordSnapshot(cardId, price, sourceLabel = 'market_snapshot', recordedAt = new Date()) {
        const entity = this.historyRepo.create({
            cardId,
            price: Math.max(0, Math.round(price)),
            sourceLabel,
            recordedAt,
        });
        return this.historyRepo.save(entity);
    }
    async getHistory(cardId, query) {
        const range = this.normalizeRange(query.range);
        const startDate = this.computeStartDate(range);
        const endDate = new Date();
        const rows = await this.historyRepo.find({
            where: {
                cardId,
                recordedAt: (0, typeorm_2.MoreThanOrEqual)(startDate),
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
    normalizeRange(range) {
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
    ensureUsableSeries(rows, startDate, endDate, fallbackPrice) {
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
            normalized.unshift(this.buildVirtualRow(startDate, first.price ?? fallbackPrice, first.sourceLabel || 'fallback_start'));
        }
        if (last.recordedAt.getTime() < endDate.getTime()) {
            normalized.push(this.buildVirtualRow(endDate, last.price ?? fallbackPrice, last.sourceLabel || 'fallback_end'));
        }
        return normalized;
    }
    buildVirtualRow(recordedAt, price, sourceLabel = 'market_fallback') {
        return this.historyRepo.create({
            cardId: 0,
            price: Math.max(0, Math.round(price)),
            sourceLabel,
            recordedAt,
        });
    }
    computeStartDate(range) {
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
    bucketRows(rows, range) {
        if (rows.length <= 1)
            return rows;
        const bucketMs = this.getBucketSizeMs(range);
        const map = new Map();
        for (const row of rows) {
            const ts = row.recordedAt.getTime();
            const bucket = Math.floor(ts / bucketMs) * bucketMs;
            map.set(bucket, row);
        }
        return Array.from(map.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, row]) => row);
    }
    getBucketSizeMs(range) {
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
};
exports.MarketPriceHistoryService = MarketPriceHistoryService;
exports.MarketPriceHistoryService = MarketPriceHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(market_price_history_entity_1.MarketPriceHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        market_pricing_service_1.MarketPricingService])
], MarketPriceHistoryService);
//# sourceMappingURL=market-price-history.service.js.map