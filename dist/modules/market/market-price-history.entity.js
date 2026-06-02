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
exports.MarketPriceHistory = void 0;
const typeorm_1 = require("typeorm");
const card_entity_1 = require("../cards/card.entity");
let MarketPriceHistory = class MarketPriceHistory {
    id;
    cardId;
    card;
    price;
    sourceLabel;
    recordedAt;
    createdAt;
};
exports.MarketPriceHistory = MarketPriceHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MarketPriceHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'card_id', type: 'int' }),
    __metadata("design:type", Number)
], MarketPriceHistory.prototype, "cardId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => card_entity_1.Card, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'card_id' }),
    __metadata("design:type", card_entity_1.Card)
], MarketPriceHistory.prototype, "card", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MarketPriceHistory.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'source_label',
        type: 'varchar',
        length: 40,
        default: 'market_snapshot',
    }),
    __metadata("design:type", String)
], MarketPriceHistory.prototype, "sourceLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recorded_at', type: 'datetime' }),
    __metadata("design:type", Date)
], MarketPriceHistory.prototype, "recordedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], MarketPriceHistory.prototype, "createdAt", void 0);
exports.MarketPriceHistory = MarketPriceHistory = __decorate([
    (0, typeorm_1.Entity)('market_price_history'),
    (0, typeorm_1.Index)('idx_market_price_history_card_recorded_at', ['cardId', 'recordedAt'])
], MarketPriceHistory);
//# sourceMappingURL=market-price-history.entity.js.map