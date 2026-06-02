"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoosterModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const booster_controller_1 = require("./booster.controller");
const booster_service_1 = require("./booster.service");
const booster_opening_entity_1 = require("./booster-opening.entity");
const display_opening_entity_1 = require("./display-opening.entity");
const card_entity_1 = require("../cards/card.entity");
const users_module_1 = require("../users/users.module");
const economy_module_1 = require("../economy/economy.module");
const economy_analytics_module_1 = require("../economy/economy-analytics.module");
const security_module_1 = require("../security/security.module");
const profile_module_1 = require("../profile/profile.module");
let BoosterModule = class BoosterModule {
};
exports.BoosterModule = BoosterModule;
exports.BoosterModule = BoosterModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([card_entity_1.Card, booster_opening_entity_1.BoosterOpening, display_opening_entity_1.DisplayOpening]),
            users_module_1.UsersModule,
            economy_module_1.EconomyModule,
            economy_analytics_module_1.EconomyAnalyticsModule,
            security_module_1.SecurityModule,
            profile_module_1.ProfileModule,
        ],
        controllers: [booster_controller_1.BoosterController],
        providers: [booster_service_1.BoosterService],
        exports: [booster_service_1.BoosterService],
    })
], BoosterModule);
//# sourceMappingURL=booster.module.js.map