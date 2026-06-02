"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const admin_jwt_strategy_1 = require("./admin-jwt.strategy");
const user_entity_1 = require("../users/user.entity");
const bug_report_entity_1 = require("../report/bug-report.entity");
const bug_report_status_history_entity_1 = require("../report/bug-report-status-history.entity");
const economy_analytics_module_1 = require("../economy/economy-analytics.module");
const security_module_1 = require("../security/security.module");
const market_listing_entity_1 = require("../market/market-listing.entity");
const market_transaction_entity_1 = require("../market/market-transaction.entity");
const user_card_entity_1 = require("../users/user-card.entity");
const user_economy_entity_1 = require("../economy/user-economy.entity");
const card_entity_1 = require("../cards/card.entity");
const push_delivery_log_entity_1 = require("../push/push-delivery-log.entity");
const push_preference_entity_1 = require("../push/push-preference.entity");
const push_subscription_entity_1 = require("../push/push-subscription.entity");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                bug_report_entity_1.BugReport,
                bug_report_status_history_entity_1.BugReportStatusHistory,
                market_listing_entity_1.MarketListing,
                market_transaction_entity_1.MarketTransaction,
                user_card_entity_1.UserCard,
                user_economy_entity_1.UserEconomy,
                card_entity_1.Card,
                push_subscription_entity_1.PushSubscriptionEntity,
                push_preference_entity_1.PushNotificationPreferenceEntity,
                push_delivery_log_entity_1.PushDeliveryLogEntity,
            ]),
            economy_analytics_module_1.EconomyAnalyticsModule,
            security_module_1.SecurityModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const secret = config.get('ADMIN_JWT_SECRET');
                    if (!secret || !secret.trim()) {
                        throw new Error('ADMIN_JWT_SECRET is missing or empty in .env');
                    }
                    return {
                        secret: secret.trim(),
                        signOptions: {
                            expiresIn: (config.get('ADMIN_JWT_EXPIRES_IN') ??
                                '15m'),
                        },
                    };
                },
            }),
        ],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService, admin_jwt_strategy_1.AdminJwtStrategy],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map