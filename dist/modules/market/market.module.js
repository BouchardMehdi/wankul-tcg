"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const market_controller_1 = require("./market.controller");
const market_service_1 = require("./market.service");
const market_pricing_service_1 = require("./market-pricing.service");
const market_price_history_service_1 = require("./market-price-history.service");
const market_listing_entity_1 = require("./market-listing.entity");
const market_transaction_entity_1 = require("./market-transaction.entity");
const market_price_history_entity_1 = require("./market-price-history.entity");
const user_card_entity_1 = require("../users/user-card.entity");
const user_economy_entity_1 = require("../economy/user-economy.entity");
const card_entity_1 = require("../cards/card.entity");
const user_entity_1 = require("../users/user.entity");
const economy_analytics_module_1 = require("../economy/economy-analytics.module");
const push_module_1 = require("../push/push.module");
const security_module_1 = require("../security/security.module");
let MarketModule = class MarketModule {
};
exports.MarketModule = MarketModule;
exports.MarketModule = MarketModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_card_entity_1.UserCard,
                user_economy_entity_1.UserEconomy,
                card_entity_1.Card,
                user_entity_1.User,
                market_listing_entity_1.MarketListing,
                market_transaction_entity_1.MarketTransaction,
                market_price_history_entity_1.MarketPriceHistory,
            ]),
            economy_analytics_module_1.EconomyAnalyticsModule,
            push_module_1.PushModule,
            security_module_1.SecurityModule,
        ],
        controllers: [market_controller_1.MarketController],
        providers: [
            market_service_1.MarketService,
            market_pricing_service_1.MarketPricingService,
            market_price_history_service_1.MarketPriceHistoryService,
        ],
        exports: [
            market_service_1.MarketService,
            market_pricing_service_1.MarketPricingService,
            market_price_history_service_1.MarketPriceHistoryService,
        ],
    })
], MarketModule);
//# sourceMappingURL=market.module.js.map