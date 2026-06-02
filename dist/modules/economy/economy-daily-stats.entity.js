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
exports.EconomyDailyStats = void 0;
const typeorm_1 = require("typeorm");
let EconomyDailyStats = class EconomyDailyStats {
    id;
    date;
    boostersOpened;
    displaysOpened;
    creditsSpent;
    creditsEarnedOpening;
    creditsEarnedQuickSell;
    creditsEarnedJackpot;
    marketVolume;
    createdAt;
};
exports.EconomyDailyStats = EconomyDailyStats;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', unique: true }),
    __metadata("design:type", String)
], EconomyDailyStats.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "boostersOpened", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "displaysOpened", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "creditsSpent", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "creditsEarnedOpening", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "creditsEarnedQuickSell", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "creditsEarnedJackpot", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EconomyDailyStats.prototype, "marketVolume", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], EconomyDailyStats.prototype, "createdAt", void 0);
exports.EconomyDailyStats = EconomyDailyStats = __decorate([
    (0, typeorm_1.Entity)('economy_daily_stats')
], EconomyDailyStats);
//# sourceMappingURL=economy-daily-stats.entity.js.map