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
exports.MarketController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const market_service_1 = require("./market.service");
const quick_sell_dto_1 = require("./dto/quick-sell.dto");
const create_listing_dto_1 = require("./dto/create-listing.dto");
const buy_listing_dto_1 = require("./dto/buy-listing.dto");
const list_market_listings_query_dto_1 = require("./dto/list-market-listings-query.dto");
const get_market_price_history_dto_1 = require("./dto/get-market-price-history.dto");
const market_price_history_service_1 = require("./market-price-history.service");
let MarketController = class MarketController {
    marketService;
    marketPriceHistoryService;
    constructor(marketService, marketPriceHistoryService) {
        this.marketService = marketService;
        this.marketPriceHistoryService = marketPriceHistoryService;
    }
    async getMarketPrice(cardId) {
        return this.marketService.getMarketPrice(cardId);
    }
    async getCardPriceHistory(cardId, query) {
        return this.marketPriceHistoryService.getHistory(cardId, query);
    }
    async getMySellableCards(user) {
        const userId = this.resolveUserId(user);
        return this.marketService.getMySellableCards(userId);
    }
    async quickSell(user, dto) {
        const userId = this.resolveUserId(user);
        return this.marketService.quickSell(userId, dto.cardId, dto.quantity);
    }
    async getActiveListings(query) {
        return this.marketService.getActiveListings(query);
    }
    async getMyListings(user) {
        const userId = this.resolveUserId(user);
        return this.marketService.getMyListings(userId);
    }
    async getListingById(listingId) {
        return this.marketService.getListingById(listingId);
    }
    async createListing(user, dto) {
        const userId = this.resolveUserId(user);
        return this.marketService.createListing(userId, {
            cardId: dto.cardId,
            quantity: dto.quantity,
            listingMode: dto.listingMode,
            offerType: dto.offerType,
            priceCredits: dto.priceCredits,
            wantedCardId: dto.wantedCardId,
            wantedCardQuantity: dto.wantedCardQuantity,
        });
    }
    async buyListing(user, listingId, dto) {
        const userId = this.resolveUserId(user);
        return this.marketService.buyListing(userId, listingId, dto);
    }
    async cancelListing(user, listingId) {
        const userId = this.resolveUserId(user);
        return this.marketService.cancelListing(userId, listingId);
    }
    async claimTransactionReward(user, transactionId) {
        const userId = this.resolveUserId(user);
        return this.marketService.claimTransactionReward(userId, transactionId);
    }
    async getMyTransactions(user) {
        const userId = this.resolveUserId(user);
        return this.marketService.getMyTransactions(userId);
    }
    async getRecentSales(limit) {
        return this.marketService.getRecentSales(limit);
    }
    async getMyPurchases(user) {
        const userId = this.resolveUserId(user);
        return this.marketService.getMyPurchases(userId);
    }
    async getMySales(user) {
        const userId = this.resolveUserId(user);
        return this.marketService.getMySales(userId);
    }
    resolveUserId(user) {
        const userId = user?.sub ?? user?.userId ?? user?.id;
        if (!userId) {
            throw new common_1.UnauthorizedException('Unable to resolve current user id from JWT payload');
        }
        return userId;
    }
};
exports.MarketController = MarketController;
__decorate([
    (0, common_1.Get)('price/:cardId'),
    __param(0, (0, common_1.Param)('cardId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getMarketPrice", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('cards/:cardId/price-history'),
    __param(0, (0, common_1.Param)('cardId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, get_market_price_history_dto_1.GetMarketPriceHistoryDto]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getCardPriceHistory", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me/sellable-cards'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getMySellableCards", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('quick-sell'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, quick_sell_dto_1.QuickSellDto]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "quickSell", null);
__decorate([
    (0, common_1.Get)('listings'),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_market_listings_query_dto_1.ListMarketListingsQueryDto]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getActiveListings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('listings/me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getMyListings", null);
__decorate([
    (0, common_1.Get)('listings/:listingId'),
    __param(0, (0, common_1.Param)('listingId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getListingById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('listings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_listing_dto_1.CreateListingDto]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "createListing", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('listings/:listingId/buy'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('listingId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, buy_listing_dto_1.BuyListingDto]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "buyListing", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('listings/:listingId/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('listingId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "cancelListing", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('transactions/:transactionId/claim'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('transactionId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "claimTransactionReward", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('transactions/me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getMyTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('transactions/recent-sales'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getRecentSales", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('transactions/me/purchases'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getMyPurchases", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('transactions/me/sales'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getMySales", null);
exports.MarketController = MarketController = __decorate([
    (0, common_1.Controller)('market'),
    __metadata("design:paramtypes", [market_service_1.MarketService,
        market_price_history_service_1.MarketPriceHistoryService])
], MarketController);
//# sourceMappingURL=market.controller.js.map