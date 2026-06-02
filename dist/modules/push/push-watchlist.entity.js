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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushWatchlistEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const card_entity_1 = require("../cards/card.entity");
let PushWatchlistEntity = class PushWatchlistEntity {
    id;
    user;
    card;
    targetPriceCredits;
    marketListingAlertEnabled;
    marketDealAlertEnabled;
    marketDealThresholdPercent;
    targetReachedNotified;
    lastTriggeredAt;
    lastTriggeredPrice;
    lastListingNotifiedId;
    lastDealNotifiedId;
    createdAt;
    updatedAt;
};
exports.PushWatchlistEntity = PushWatchlistEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PushWatchlistEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], PushWatchlistEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => card_entity_1.Card, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'card_id' }),
    __metadata("design:type", card_entity_1.Card)
], PushWatchlistEntity.prototype, "card", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_price_credits', type: 'int' }),
    __metadata("design:type", Number)
], PushWatchlistEntity.prototype, "targetPriceCredits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'market_listing_alert_enabled', type: 'tinyint', default: 1 }),
    __metadata("design:type", Boolean)
], PushWatchlistEntity.prototype, "marketListingAlertEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'market_deal_alert_enabled', type: 'tinyint', default: 1 }),
    __metadata("design:type", Boolean)
], PushWatchlistEntity.prototype, "marketDealAlertEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'market_deal_threshold_percent', type: 'int', default: 15 }),
    __metadata("design:type", Number)
], PushWatchlistEntity.prototype, "marketDealThresholdPercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_reached_notified', type: 'tinyint', default: 0 }),
    __metadata("design:type", Boolean)
], PushWatchlistEntity.prototype, "targetReachedNotified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_triggered_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PushWatchlistEntity.prototype, "lastTriggeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_triggered_price', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PushWatchlistEntity.prototype, "lastTriggeredPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_listing_notified_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PushWatchlistEntity.prototype, "lastListingNotifiedId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_deal_notified_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PushWatchlistEntity.prototype, "lastDealNotifiedId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PushWatchlistEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PushWatchlistEntity.prototype, "updatedAt", void 0);
exports.PushWatchlistEntity = PushWatchlistEntity = __decorate([
    (0, typeorm_1.Entity)('push_watchlist'),
    (0, typeorm_1.Index)(['user', 'card'], { unique: true })
], PushWatchlistEntity);
//# sourceMappingURL=push-watchlist.entity.js.map