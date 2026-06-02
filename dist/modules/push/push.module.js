"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const push_controller_1 = require("./push.controller");
const push_service_1 = require("./push.service");
const push_scheduler_1 = require("./push.scheduler");
const push_subscription_entity_1 = require("./push-subscription.entity");
const user_economy_entity_1 = require("../economy/user-economy.entity");
const push_preference_entity_1 = require("./push-preference.entity");
const push_watchlist_entity_1 = require("./push-watchlist.entity");
const push_delivery_log_entity_1 = require("./push-delivery-log.entity");
const market_listing_entity_1 = require("../market/market-listing.entity");
const market_transaction_entity_1 = require("../market/market-transaction.entity");
const card_entity_1 = require("../cards/card.entity");
const user_card_entity_1 = require("../users/user-card.entity");
const market_price_history_entity_1 = require("../market/market-price-history.entity");
const economy_daily_stats_entity_1 = require("../economy/economy-daily-stats.entity");
const market_pricing_service_1 = require("../market/market-pricing.service");
let PushModule = class PushModule {
};
exports.PushModule = PushModule;
exports.PushModule = PushModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([
                push_subscription_entity_1.PushSubscriptionEntity,
                push_delivery_log_entity_1.PushDeliveryLogEntity,
                user_economy_entity_1.UserEconomy,
                push_preference_entity_1.PushNotificationPreferenceEntity,
                push_watchlist_entity_1.PushWatchlistEntity,
                market_listing_entity_1.MarketListing,
                market_transaction_entity_1.MarketTransaction,
                card_entity_1.Card,
                user_card_entity_1.UserCard,
                market_price_history_entity_1.MarketPriceHistory,
                economy_daily_stats_entity_1.EconomyDailyStats,
            ]),
        ],
        controllers: [push_controller_1.PushController],
        providers: [push_service_1.PushService, push_scheduler_1.PushScheduler, market_pricing_service_1.MarketPricingService],
        exports: [push_service_1.PushService],
    })
], PushModule);
//# sourceMappingURL=push.module.js.map