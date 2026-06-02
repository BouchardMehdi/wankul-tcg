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
exports.BoosterController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const booster_service_1 = require("./booster.service");
const open_booster_dto_1 = require("./dto/open-booster.dto");
const open_display_dto_1 = require("./dto/open-display.dto");
let BoosterController = class BoosterController {
    booster;
    constructor(booster) {
        this.booster = booster;
    }
    getSeasons() {
        return this.booster.getAvailableSeasons();
    }
    getOpeningHistory(user, limit, page, perPage) {
        return this.booster.getOpeningHistory(user.id, page, perPage, limit);
    }
    getOpeningReplay(user, kind, id) {
        return this.booster.getOpeningReplay(user.id, kind, id);
    }
    open(user, dto) {
        return this.booster.openBooster(user.id, dto.seasonNumber);
    }
    openDisplay(user, dto) {
        return this.booster.openDisplay(user.id, dto.seasonNumber);
    }
};
exports.BoosterController = BoosterController;
__decorate([
    (0, common_1.Get)('seasons'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BoosterController.prototype, "getSeasons", null);
__decorate([
    (0, common_1.Get)('openings/history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('perPage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], BoosterController.prototype, "getOpeningHistory", null);
__decorate([
    (0, common_1.Get)('openings/:kind/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BoosterController.prototype, "getOpeningReplay", null);
__decorate([
    (0, common_1.Post)('open'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, open_booster_dto_1.OpenBoosterDto]),
    __metadata("design:returntype", void 0)
], BoosterController.prototype, "open", null);
__decorate([
    (0, common_1.Post)('open-display'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, open_display_dto_1.OpenDisplayDto]),
    __metadata("design:returntype", void 0)
], BoosterController.prototype, "openDisplay", null);
exports.BoosterController = BoosterController = __decorate([
    (0, common_1.Controller)('booster'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [booster_service_1.BoosterService])
], BoosterController);
//# sourceMappingURL=booster.controller.js.map