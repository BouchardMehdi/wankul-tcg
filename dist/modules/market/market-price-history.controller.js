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
exports.MarketPriceHistoryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const get_market_price_history_dto_1 = require("./dto/get-market-price-history.dto");
const market_price_history_service_1 = require("./market-price-history.service");
let MarketPriceHistoryController = class MarketPriceHistoryController {
    marketPriceHistoryService;
    constructor(marketPriceHistoryService) {
        this.marketPriceHistoryService = marketPriceHistoryService;
    }
    async getCardPriceHistory(cardId, query) {
        return this.marketPriceHistoryService.getHistory(cardId, query);
    }
};
exports.MarketPriceHistoryController = MarketPriceHistoryController;
__decorate([
    (0, common_1.Get)(':cardId/price-history'),
    __param(0, (0, common_1.Param)('cardId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, get_market_price_history_dto_1.GetMarketPriceHistoryDto]),
    __metadata("design:returntype", Promise)
], MarketPriceHistoryController.prototype, "getCardPriceHistory", null);
exports.MarketPriceHistoryController = MarketPriceHistoryController = __decorate([
    (0, common_1.Controller)('market/cards'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [market_price_history_service_1.MarketPriceHistoryService])
], MarketPriceHistoryController);
//# sourceMappingURL=market-price-history.controller.js.map