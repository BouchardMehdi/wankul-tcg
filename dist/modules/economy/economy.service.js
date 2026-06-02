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
exports.EconomyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_economy_entity_1 = require("./user-economy.entity");
const market_pricing_service_1 = require("../market/market-pricing.service");
const economy_constants_1 = require("./economy.constants");
const economy_utils_1 = require("./economy.utils");
const anti_abuse_service_1 = require("../security/anti-abuse.service");
let EconomyService = class EconomyService {
    economyRepo;
    marketPricingService;
    antiAbuseService;
    constructor(economyRepo, marketPricingService, antiAbuseService) {
        this.economyRepo = economyRepo;
        this.marketPricingService = marketPricingService;
        this.antiAbuseService = antiAbuseService;
    }
    getCosts() {
        return economy_constants_1.ECONOMY_RULES.cost;
    }
    async ensure(userId) {
        let row = await this.economyRepo.findOne({ where: { userId } });
        if (!row) {
            const now = new Date();
            row = this.economyRepo.create({
                userId,
                user: { id: userId },
                credits: 0,
                signupBonusGranted: 0,
                freeBoosterCharges: economy_constants_1.ECONOMY_RULES.charges.booster.cap,
                freeDisplayCharges: economy_constants_1.ECONOMY_RULES.charges.display.cap,
                boosterRechargeAt: now,
                displayRechargeAt: now,
                lastFreeOpeningsPushAt: null,
            });
        }
        (0, economy_utils_1.ensureRechargeDates)(row, new Date());
        return await this.economyRepo.save(row);
    }
    async getSnapshot(userId) {
        const row = await this.ensure(userId);
        (0, economy_utils_1.applyEconomyRecharge)(row);
        await this.economyRepo.save(row);
        return {
            credits: row.credits,
            freeBoosterCharges: row.freeBoosterCharges,
            freeDisplayCharges: row.freeDisplayCharges,
            costs: this.getCosts(),
        };
    }
    async consumeOpen(userId, kind) {
        const row = await this.ensure(userId);
        (0, economy_utils_1.applyEconomyRecharge)(row);
        const cost = economy_constants_1.ECONOMY_RULES.cost[kind];
        if (kind === 'booster') {
            if (row.freeBoosterCharges > 0) {
                row.freeBoosterCharges -= 1;
                await this.economyRepo.save(row);
                return { kind, usedFree: true, cost: 0 };
            }
        }
        else {
            if (row.freeDisplayCharges > 0) {
                row.freeDisplayCharges -= 1;
                await this.economyRepo.save(row);
                return { kind, usedFree: true, cost: 0 };
            }
        }
        if (row.credits < cost)
            throw new common_1.ForbiddenException('WunkulCoins insuffisants');
        row.credits -= cost;
        await this.economyRepo.save(row);
        return { kind, usedFree: false, cost };
    }
    async computeBoosterCredits(args) {
        const { cards, newCardIds, gtoPresent, ticketOrPresent, ticketOrIsNew } = args;
        const uniqueCardIds = Array.from(new Set(cards.map((card) => card.id)));
        const pricingEntries = await Promise.all(uniqueCardIds.map(async (cardId) => [cardId, await this.marketPricingService.getRewardQuote(cardId)]));
        const pricingByCardId = new Map(pricingEntries);
        let duplicateTotal = 0;
        for (const card of cards) {
            const quote = pricingByCardId.get(card.id);
            if (!quote)
                continue;
            duplicateTotal += quote.duplicateRewardValue;
        }
        let duplicatePartToRemoveForNewCards = 0;
        let newCardsTotal = 0;
        for (const cardId of Array.from(new Set(newCardIds))) {
            const quote = pricingByCardId.get(cardId);
            if (!quote)
                continue;
            duplicatePartToRemoveForNewCards += quote.duplicateRewardValue;
            newCardsTotal += quote.newRewardValue;
        }
        const base = Math.max(0, duplicateTotal - duplicatePartToRemoveForNewCards);
        const newBonus = newCardsTotal;
        let subtotal = base + newBonus;
        const boosterMult = gtoPresent ? economy_constants_1.ECONOMY_RULES.multipliers.gtoBooster : 1;
        subtotal = Math.floor(subtotal * boosterMult);
        const jackpot = ticketOrPresent && ticketOrIsNew ? economy_constants_1.ECONOMY_RULES.jackpotTicketOr : 0;
        return {
            base,
            newCardBonus: newBonus,
            boosterMultiplierApplied: gtoPresent ? boosterMult : undefined,
            ticketGoldJackpot: jackpot || undefined,
            total: subtotal + jackpot,
        };
    }
    computeDisplayCredits(args) {
        let base = 0;
        let newBonus = 0;
        let jackpot = 0;
        let subtotalNoJackpot = 0;
        for (const b of args.boosterBreakdowns) {
            base += b.base;
            newBonus += b.newCardBonus;
            jackpot += b.ticketGoldJackpot ?? 0;
            subtotalNoJackpot += b.total - (b.ticketGoldJackpot ?? 0);
        }
        const displayMult = args.goldMultiplier
            ? economy_constants_1.ECONOMY_RULES.multipliers.goldDisplay
            : 1;
        const after = Math.floor(subtotalNoJackpot * displayMult);
        return {
            base,
            newCardBonus: newBonus,
            displayMultiplierApplied: args.goldMultiplier ? displayMult : undefined,
            ticketGoldJackpot: jackpot || undefined,
            total: after + jackpot,
        };
    }
    async addCredits(userId, amount, options = {}) {
        if (!amount)
            return;
        const row = await this.ensure(userId);
        row.credits += amount;
        await this.economyRepo.save(row);
        if (!options.skipLog) {
            await this.antiAbuseService.logAction({
                userId,
                relatedUserId: options.relatedUserId ?? null,
                cardId: options.cardId ?? null,
                action: options.source ??
                    (options.reason === 'signup_verified'
                        ? 'SIGNUP_BONUS'
                        : 'ECONOMY_CREDITS_ADD'),
                status: 'allowed',
                severity: 'info',
                targetType: options.targetType ?? null,
                targetId: options.targetId ?? null,
                valueCredits: amount,
                reason: options.reason ?? null,
                metadata: {
                    ...(options.metadata ?? {}),
                    amount,
                    balanceAfter: row.credits,
                },
            });
        }
    }
    async addFreeBoosters(userId, amount, options = {}) {
        if (!amount)
            return;
        const row = await this.ensure(userId);
        row.freeBoosterCharges = Math.min(127, row.freeBoosterCharges + amount);
        await this.economyRepo.save(row);
        if (!options.skipLog) {
            await this.antiAbuseService.logAction({
                userId,
                relatedUserId: options.relatedUserId ?? null,
                cardId: options.cardId ?? null,
                action: options.source ?? 'ECONOMY_FREE_BOOSTER_ADD',
                status: 'allowed',
                severity: 'info',
                targetType: options.targetType ?? null,
                targetId: options.targetId ?? null,
                valueCredits: 0,
                reason: options.reason ?? null,
                metadata: {
                    ...(options.metadata ?? {}),
                    freeBoosters: amount,
                    balanceAfter: row.freeBoosterCharges,
                },
            });
        }
    }
};
exports.EconomyService = EconomyService;
exports.EconomyService = EconomyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_economy_entity_1.UserEconomy)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        market_pricing_service_1.MarketPricingService,
        anti_abuse_service_1.AntiAbuseService])
], EconomyService);
//# sourceMappingURL=economy.service.js.map