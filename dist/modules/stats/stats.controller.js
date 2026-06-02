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
exports.StatsController = void 0;
const common_1 = require("@nestjs/common");
const stats_service_1 = require("./stats.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let StatsController = class StatsController {
    stats;
    constructor(stats) {
        this.stats = stats;
    }
    me(user) {
        return this.stats.getMyStats(user.id);
    }
    dropRates(mode, days, season, includeGold) {
        const d = days ? Math.max(1, Math.min(365, Number(days))) : 30;
        const m = (mode ?? 'global').toLowerCase();
        const ig = (includeGold ?? 'false').toLowerCase() === 'true';
        if (!['unit', 'display', 'global'].includes(m)) {
            return {
                message: 'Invalid mode. Use unit|display|global',
                provided: mode ?? null,
            };
        }
        return this.stats.getDropRates({
            mode: m,
            days: d,
            season: season,
            includeGold: ig,
        });
    }
};
exports.StatsController = StatsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StatsController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('drop-rates'),
    __param(0, (0, common_1.Query)('mode')),
    __param(1, (0, common_1.Query)('days')),
    __param(2, (0, common_1.Query)('season')),
    __param(3, (0, common_1.Query)('includeGold')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], StatsController.prototype, "dropRates", null);
exports.StatsController = StatsController = __decorate([
    (0, common_1.Controller)('stats'),
    __metadata("design:paramtypes", [stats_service_1.StatsService])
], StatsController);
//# sourceMappingURL=stats.controller.js.map