"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomyModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const economy_service_1 = require("./economy.service");
const economy_controller_1 = require("./economy.controller");
const user_economy_entity_1 = require("./user-economy.entity");
const economy_analytics_module_1 = require("./economy-analytics.module");
const market_module_1 = require("../market/market.module");
const security_module_1 = require("../security/security.module");
let EconomyModule = class EconomyModule {
};
exports.EconomyModule = EconomyModule;
exports.EconomyModule = EconomyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_economy_entity_1.UserEconomy]),
            economy_analytics_module_1.EconomyAnalyticsModule,
            market_module_1.MarketModule,
            security_module_1.SecurityModule,
        ],
        providers: [economy_service_1.EconomyService],
        controllers: [economy_controller_1.EconomyController],
        exports: [economy_service_1.EconomyService],
    })
], EconomyModule);
//# sourceMappingURL=economy.module.js.map