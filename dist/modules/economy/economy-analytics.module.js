"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomyAnalyticsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const economy_daily_stats_entity_1 = require("./economy-daily-stats.entity");
const economy_analytics_service_1 = require("./economy-analytics.service");
const booster_opening_entity_1 = require("../booster/booster-opening.entity");
const display_opening_entity_1 = require("../booster/display-opening.entity");
const market_listing_entity_1 = require("../market/market-listing.entity");
const market_price_history_entity_1 = require("../market/market-price-history.entity");
const market_transaction_entity_1 = require("../market/market-transaction.entity");
const user_economy_entity_1 = require("./user-economy.entity");
const user_entity_1 = require("../users/user.entity");
let EconomyAnalyticsModule = class EconomyAnalyticsModule {
};
exports.EconomyAnalyticsModule = EconomyAnalyticsModule;
exports.EconomyAnalyticsModule = EconomyAnalyticsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                economy_daily_stats_entity_1.EconomyDailyStats,
                booster_opening_entity_1.BoosterOpening,
                display_opening_entity_1.DisplayOpening,
                market_listing_entity_1.MarketListing,
                market_price_history_entity_1.MarketPriceHistory,
                market_transaction_entity_1.MarketTransaction,
                user_economy_entity_1.UserEconomy,
                user_entity_1.User,
            ]),
        ],
        providers: [economy_analytics_service_1.EconomyAnalyticsService],
        exports: [economy_analytics_service_1.EconomyAnalyticsService],
    })
], EconomyAnalyticsModule);
//# sourceMappingURL=economy-analytics.module.js.map