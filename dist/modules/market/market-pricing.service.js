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
exports.MarketPricingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const card_entity_1 = require("../cards/card.entity");
const user_card_entity_1 = require("../users/user-card.entity");
const market_price_history_entity_1 = require("./market-price-history.entity");
const market_rarity_values_1 = require("./constants/market-rarity-values");
let MarketPricingService = class MarketPricingService {
    cardsRepository;
    userCardsRepository;
    marketPriceHistoryRepository;
    constructor(cardsRepository, userCardsRepository, marketPriceHistoryRepository) {
        this.cardsRepository = cardsRepository;
        this.userCardsRepository = userCardsRepository;
        this.marketPriceHistoryRepository = marketPriceHistoryRepository;
    }
    async getMarketPrice(cardId) {
        const card = await this.cardsRepository.findOne({ where: { id: cardId } });
        if (!card) {
            throw new common_1.NotFoundException(`Card ${cardId} not found`);
        }
        const rarity = (0, market_rarity_values_1.normalizeMarketRarity)(card.rarity);
        const rule = (0, market_rarity_values_1.getRarityEconomicRule)(rarity);
        const rawStats = await this.userCardsRepository
            .createQueryBuilder('uc')
            .select('COUNT(DISTINCT user_id)', 'ownersCount')
            .addSelect('COALESCE(SUM(quantity), 0)', 'totalCopies')
            .where('card_id = :cardId', { cardId })
            .andWhere('quantity > 0')
            .getRawOne();
        const rawUserCount = await this.userCardsRepository
            .createQueryBuilder('uc')
            .select('COUNT(DISTINCT user_id)', 'userCount')
            .getRawOne();
        const ownersCount = Number(rawStats?.ownersCount ?? 0);
        const totalCopies = Number(rawStats?.totalCopies ?? 0);
        const userCount = Math.max(Number(rawUserCount?.userCount ?? 0), 1);
        const ownershipRate = ownersCount / userCount;
        const scarcityMultiplier = this.clamp(1 + (1 - ownershipRate), 1, 2);
        const circulationPenalty = Math.min(totalCopies / 500, 0.3);
        const circulationMultiplier = 1 - circulationPenalty;
        const rawInstantPrice = Math.max(1, Math.round((rule.baseValue ?? market_rarity_values_1.DEFAULT_MARKET_BASE_VALUE) * scarcityMultiplier * circulationMultiplier));
        const boundedRawPrice = this.clampInt(rawInstantPrice, rule.floorPrice, rule.ceilingPrice);
        const historyRows = await this.marketPriceHistoryRepository.find({
            where: { cardId },
            order: { recordedAt: 'DESC' },
            take: market_rarity_values_1.MARKET_SMOOTHING_HISTORY_LIMIT,
        });
        const previousReferencePrice = historyRows[0]?.price ?? null;
        const historyAverage = historyRows.length
            ? historyRows.reduce((sum, row) => sum + row.price, 0) / historyRows.length
            : null;
        const smoothedReferencePrice = historyAverage === null
            ? boundedRawPrice
            : Math.round(boundedRawPrice * market_rarity_values_1.MARKET_PRICE_SMOOTHING_WEIGHT +
                historyAverage * (1 - market_rarity_values_1.MARKET_PRICE_SMOOTHING_WEIGHT));
        const dailyMinPrice = previousReferencePrice === null
            ? null
            : Math.max(rule.floorPrice, Math.floor(previousReferencePrice * (1 - market_rarity_values_1.MARKET_DAILY_MAX_DOWN_PCT)));
        const dailyMaxPrice = previousReferencePrice === null
            ? null
            : Math.min(rule.ceilingPrice, Math.ceil(previousReferencePrice * (1 + market_rarity_values_1.MARKET_DAILY_MAX_UP_PCT)));
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
    async getRewardQuote(cardId) {
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
    buildRewardQuote(cardId, rarity, referencePrice, rule = (0, market_rarity_values_1.getRarityEconomicRule)(rarity)) {
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
        const duplicateRewardValue = this.clampInt(Math.floor(referencePrice * rule.duplicateRewardRate), rule.duplicateRewardMin, rule.duplicateRewardMax);
        const newRewardValue = this.clampInt(Math.floor(referencePrice * rule.newRewardRate), rule.newRewardMin, rule.newRewardMax);
        const quickSellUnitPrice = Math.max(1, Math.round(referencePrice * rule.quickSellRate));
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
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    clampInt(value, min, max) {
        return Math.round(this.clamp(value, min, max));
    }
};
exports.MarketPricingService = MarketPricingService;
exports.MarketPricingService = MarketPricingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(card_entity_1.Card)),
    __param(1, (0, typeorm_1.InjectRepository)(user_card_entity_1.UserCard)),
    __param(2, (0, typeorm_1.InjectRepository)(market_price_history_entity_1.MarketPriceHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MarketPricingService);
//# sourceMappingURL=market-pricing.service.js.map