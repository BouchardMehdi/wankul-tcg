"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const economic_action_log_entity_1 = require("./economic-action-log.entity");
const anti_abuse_service_1 = require("./anti-abuse.service");
const market_transaction_entity_1 = require("../market/market-transaction.entity");
const user_entity_1 = require("../users/user.entity");
const card_entity_1 = require("../cards/card.entity");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([economic_action_log_entity_1.EconomicActionLog, market_transaction_entity_1.MarketTransaction, user_entity_1.User, card_entity_1.Card])],
        providers: [anti_abuse_service_1.AntiAbuseService],
        exports: [anti_abuse_service_1.AntiAbuseService],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map