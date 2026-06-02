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
exports.PushNotificationPreferenceEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let PushNotificationPreferenceEntity = class PushNotificationPreferenceEntity {
    id;
    user;
    saleRewardEnabled;
    freeOpeningsReadyEnabled;
    freeOpeningsSoonEnabled;
    freeOpeningsSoonMinutes;
    watchlistPriceAlertEnabled;
    staleListingAlertEnabled;
    staleListingHours;
    dailyMarketRecapEnabled;
    lastDailyMarketRecapSentAt;
    createdAt;
    updatedAt;
};
exports.PushNotificationPreferenceEntity = PushNotificationPreferenceEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PushNotificationPreferenceEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], PushNotificationPreferenceEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_reward_enabled', type: 'tinyint', default: 1 }),
    __metadata("design:type", Boolean)
], PushNotificationPreferenceEntity.prototype, "saleRewardEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'free_openings_ready_enabled', type: 'tinyint', default: 1 }),
    __metadata("design:type", Boolean)
], PushNotificationPreferenceEntity.prototype, "freeOpeningsReadyEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'free_openings_soon_enabled', type: 'tinyint', default: 1 }),
    __metadata("design:type", Boolean)
], PushNotificationPreferenceEntity.prototype, "freeOpeningsSoonEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'free_openings_soon_minutes', type: 'int', default: 15 }),
    __metadata("design:type", Number)
], PushNotificationPreferenceEntity.prototype, "freeOpeningsSoonMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'watchlist_price_alert_enabled', type: 'tinyint', default: 1 }),
    __metadata("design:type", Boolean)
], PushNotificationPreferenceEntity.prototype, "watchlistPriceAlertEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stale_listing_alert_enabled', type: 'tinyint', default: 1 }),
    __metadata("design:type", Boolean)
], PushNotificationPreferenceEntity.prototype, "staleListingAlertEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stale_listing_hours', type: 'int', default: 24 }),
    __metadata("design:type", Number)
], PushNotificationPreferenceEntity.prototype, "staleListingHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'daily_market_recap_enabled', type: 'tinyint', default: 0 }),
    __metadata("design:type", Boolean)
], PushNotificationPreferenceEntity.prototype, "dailyMarketRecapEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_daily_market_recap_sent_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PushNotificationPreferenceEntity.prototype, "lastDailyMarketRecapSentAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PushNotificationPreferenceEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PushNotificationPreferenceEntity.prototype, "updatedAt", void 0);
exports.PushNotificationPreferenceEntity = PushNotificationPreferenceEntity = __decorate([
    (0, typeorm_1.Entity)('push_notification_preferences'),
    (0, typeorm_1.Index)(['user'], { unique: true })
], PushNotificationPreferenceEntity);
//# sourceMappingURL=push-preference.entity.js.map