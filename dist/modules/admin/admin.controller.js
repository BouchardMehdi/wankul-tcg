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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const admin_login_dto_1 = require("./dto/admin-login.dto");
const admin_refresh_dto_1 = require("./dto/admin-refresh.dto");
const update_ticket_status_dto_1 = require("./dto/update-ticket-status.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const admin_jwt_auth_guard_1 = require("./admin-jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async adminLogin(currentUser, dto) {
        return this.adminService.adminLogin(currentUser.id, dto.adminPassword);
    }
    async refreshAdminSession(dto) {
        return this.adminService.refreshAdminSession(dto.adminRefreshToken);
    }
    async getAllTickets(status, handledBy, page, pageSize) {
        return this.adminService.getAllTickets({
            status: status ?? '',
            handledBy,
            page: Number(page ?? 1),
            pageSize: Number(pageSize ?? 5),
        });
    }
    async updateTicketStatus(currentUser, id, dto) {
        return this.adminService.updateTicketStatus(id, currentUser.username, dto.status, dto.note);
    }
    async getEconomyOverview(days) {
        return this.adminService.getEconomyOverview(Number(days ?? 7) || 7);
    }
    async getSeasonCardsOverview() {
        return this.adminService.getSeasonCardsOverview();
    }
    async getPwaMonitoring(days) {
        return this.adminService.getPwaMonitoring(Number(days ?? 30) || 30);
    }
    async getModerationOverview() {
        return this.adminService.getModerationOverview();
    }
    async suspendUser(currentUser, id, body) {
        return this.adminService.suspendUser(currentUser, id, body);
    }
    async clearUserSuspension(currentUser, id, body) {
        return this.adminService.clearUserSuspension(currentUser, id, body.reason);
    }
    async blockUserMarket(currentUser, id, body) {
        return this.adminService.blockUserMarket(currentUser, id, body);
    }
    async clearUserMarketBlock(currentUser, id, body) {
        return this.adminService.clearUserMarketBlock(currentUser, id, body.reason);
    }
    async hideMarketListing(currentUser, id, body) {
        return this.adminService.hideMarketListing(currentUser, id, body.reason);
    }
    async getEconomyLogs(days, page, pageSize, action, status, severity, userId, cardId, targetType, from, to) {
        return this.adminService.getEconomyLogs({
            days: Number(days ?? 7) || 7,
            from,
            to,
            page: Number(page ?? 1) || 1,
            pageSize: Number(pageSize ?? 25) || 25,
            action,
            status: status ?? '',
            severity: severity ?? '',
            userId: userId ? Number(userId) : undefined,
            cardId: cardId ? Number(cardId) : undefined,
            targetType,
        });
    }
    async exportEconomy(days, format, res) {
        const exportData = await this.adminService.getEconomyExport(Number(days ?? 30) || 30);
        const safeDate = new Date().toISOString().slice(0, 10);
        const safeDays = exportData.days;
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="wankul-economy-${safeDate}-${safeDays}d.csv"`);
            return this.adminService.buildEconomyExportCsv(exportData);
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="wankul-economy-${safeDate}-${safeDays}d.json"`);
        return exportData;
    }
    async exportBackup(scope, days, format, res) {
        const exportData = await this.adminService.getBackupExport(scope, Number(days ?? 30) || 30);
        const safeDate = new Date().toISOString().slice(0, 10);
        const safeScope = exportData.scope;
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="wankul-backup-${safeScope}-${safeDate}.csv"`);
            return this.adminService.buildBackupExportCsv(exportData);
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="wankul-backup-${safeScope}-${safeDate}.json"`);
        return exportData;
    }
    async cancelMarketTransaction(currentUser, body) {
        return this.adminService.cancelMarketTransaction(currentUser, Number(body.transactionId), body.reason);
    }
    async disableMarketListing(currentUser, id, body) {
        return this.adminService.disableMarketListing(currentUser, id, body.reason);
    }
    async adjustMarketListingPrice(currentUser, id, body) {
        return this.adminService.adjustMarketListingPrice(currentUser, id, Number(body.priceCredits), body.reason);
    }
    async refundPlayer(currentUser, body) {
        return this.adminService.refundPlayer(currentUser, Number(body.userId), Number(body.amount), body.reason);
    }
    async removeBuggedReward(currentUser, body) {
        return this.adminService.removeBuggedReward(currentUser, {
            userId: Number(body.userId),
            credits: body.credits === undefined ? undefined : Number(body.credits),
            cardId: body.cardId === undefined ? undefined : Number(body.cardId),
            cardQuantity: body.cardQuantity === undefined ? undefined : Number(body.cardQuantity),
            reason: body.reason,
        });
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('session/login'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_login_dto_1.AdminLoginDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "adminLogin", null);
__decorate([
    (0, common_1.Post)('session/refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_refresh_dto_1.AdminRefreshDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "refreshAdminSession", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('tickets'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('handledBy')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllTickets", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Patch)('tickets/:id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, update_ticket_status_dto_1.UpdateTicketStatusDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateTicketStatus", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('economy/overview'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getEconomyOverview", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('seasons/cards'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSeasonCardsOverview", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('pwa/monitoring'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPwaMonitoring", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('moderation/overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getModerationOverview", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Post)('moderation/users/:id/suspend'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Patch)('moderation/users/:id/suspension/clear'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "clearUserSuspension", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Post)('moderation/users/:id/market-block'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "blockUserMarket", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Patch)('moderation/users/:id/market-block/clear'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "clearUserMarketBlock", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Patch)('moderation/listings/:id/hide'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "hideMarketListing", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('economy/logs'),
    __param(0, (0, common_1.Query)('days')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __param(3, (0, common_1.Query)('action')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('severity')),
    __param(6, (0, common_1.Query)('userId')),
    __param(7, (0, common_1.Query)('cardId')),
    __param(8, (0, common_1.Query)('targetType')),
    __param(9, (0, common_1.Query)('from')),
    __param(10, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getEconomyLogs", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('economy/export'),
    __param(0, (0, common_1.Query)('days')),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportEconomy", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Get)('backup/export'),
    __param(0, (0, common_1.Query)('scope')),
    __param(1, (0, common_1.Query)('days')),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportBackup", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Post)('economy/corrections/cancel-transaction'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "cancelMarketTransaction", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Patch)('economy/corrections/listings/:id/disable'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "disableMarketListing", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Patch)('economy/corrections/listings/:id/price'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "adjustMarketListingPrice", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Post)('economy/corrections/refund-player'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "refundPlayer", null);
__decorate([
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.Post)('economy/corrections/remove-reward'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "removeBuggedReward", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map