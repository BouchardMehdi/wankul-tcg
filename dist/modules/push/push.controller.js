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
exports.PushController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const push_service_1 = require("./push.service");
const create_push_subscription_dto_1 = require("./dto/create-push-subscription.dto");
const delete_push_subscription_dto_1 = require("./dto/delete-push-subscription.dto");
const update_push_preferences_dto_1 = require("./dto/update-push-preferences.dto");
const upsert_watchlist_item_dto_1 = require("./dto/upsert-watchlist-item.dto");
let PushController = class PushController {
    pushService;
    constructor(pushService) {
        this.pushService = pushService;
    }
    getPublicKey() {
        return this.pushService.getPublicConfig();
    }
    async getPreferences(user) {
        const userId = this.resolveUserId(user);
        return this.pushService.getPreferences(userId);
    }
    async updatePreferences(user, dto) {
        const userId = this.resolveUserId(user);
        return this.pushService.updatePreferences(userId, dto);
    }
    async getWatchlist(user) {
        const userId = this.resolveUserId(user);
        return this.pushService.getWatchlist(userId);
    }
    async getWatchlistItem(user, cardId) {
        const userId = this.resolveUserId(user);
        return this.pushService.getWatchlistItem(userId, cardId);
    }
    async upsertWatchlistItem(user, cardId, dto) {
        const userId = this.resolveUserId(user);
        return this.pushService.upsertWatchlistItem(userId, cardId, dto);
    }
    async deleteWatchlistItem(user, cardId) {
        const userId = this.resolveUserId(user);
        return this.pushService.deleteWatchlistItem(userId, cardId);
    }
    async createSubscription(user, dto, userAgent) {
        const userId = this.resolveUserId(user);
        return this.pushService.saveSubscription(userId, dto, userAgent);
    }
    async deleteSubscription(user, dto) {
        const userId = this.resolveUserId(user);
        return this.pushService.deleteSubscription(userId, dto.endpoint);
    }
    resolveUserId(user) {
        const userId = user?.sub ?? user?.userId ?? user?.id;
        if (!userId) {
            throw new common_1.UnauthorizedException('Unable to resolve current user id from JWT payload');
        }
        return userId;
    }
};
exports.PushController = PushController;
__decorate([
    (0, common_1.Get)('public-key'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PushController.prototype, "getPublicKey", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_push_preferences_dto_1.UpdatePushPreferencesDto]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('watchlist'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "getWatchlist", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('watchlist/card/:cardId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cardId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "getWatchlistItem", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)('watchlist/card/:cardId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cardId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, upsert_watchlist_item_dto_1.UpsertWatchlistItemDto]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "upsertWatchlistItem", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('watchlist/card/:cardId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cardId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "deleteWatchlistItem", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('subscriptions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_push_subscription_dto_1.CreatePushSubscriptionDto, String]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('subscriptions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delete_push_subscription_dto_1.DeletePushSubscriptionDto]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "deleteSubscription", null);
exports.PushController = PushController = __decorate([
    (0, common_1.Controller)('push'),
    __metadata("design:paramtypes", [push_service_1.PushService])
], PushController);
//# sourceMappingURL=push.controller.js.map