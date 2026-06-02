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
var PushScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const push_service_1 = require("./push.service");
let PushScheduler = PushScheduler_1 = class PushScheduler {
    pushService;
    logger = new common_1.Logger(PushScheduler_1.name);
    constructor(pushService) {
        this.pushService = pushService;
    }
    async handleRealtimeNotificationCron() {
        try {
            await this.pushService.processFreeOpeningsReadyNotifications();
            await this.pushService.processFreeOpeningsSoonNotifications();
            await this.pushService.processWatchlistPriceAlerts();
            await this.pushService.processWatchlistListingAlerts();
            await this.pushService.processStaleListingAlerts();
        }
        catch (error) {
            this.logger.warn(`Realtime push scan failed: ${error?.message ?? 'unknown error'}`);
        }
    }
    async handleDailyRecapCron() {
        try {
            await this.pushService.processDailyMarketRecaps();
        }
        catch (error) {
            this.logger.warn(`Daily recap push scan failed: ${error?.message ?? 'unknown error'}`);
        }
    }
};
exports.PushScheduler = PushScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PushScheduler.prototype, "handleRealtimeNotificationCron", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PushScheduler.prototype, "handleDailyRecapCron", null);
exports.PushScheduler = PushScheduler = PushScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [push_service_1.PushService])
], PushScheduler);
//# sourceMappingURL=push.scheduler.js.map