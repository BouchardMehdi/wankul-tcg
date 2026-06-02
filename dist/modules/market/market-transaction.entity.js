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
exports.MarketTransaction = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const card_entity_1 = require("../cards/card.entity");
const market_listing_entity_1 = require("./market-listing.entity");
const market_transaction_type_enum_1 = require("./market-transaction-type.enum");
const market_listing_mode_enum_1 = require("./market-listing-mode.enum");
const market_offer_type_enum_1 = require("./market-offer-type.enum");
let MarketTransaction = class MarketTransaction {
    id;
    listing;
    seller;
    buyer;
    card;
    listingMode;
    offerType;
    quantity;
    unitPriceCredits;
    totalPriceCredits;
    buyerOfferedCard;
    buyerOfferedCardQuantity;
    transactionType;
    createdAt;
    sellerRewardClaimedAt;
};
exports.MarketTransaction = MarketTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MarketTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => market_listing_entity_1.MarketListing, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'listing_id' }),
    __metadata("design:type", market_listing_entity_1.MarketListing)
], MarketTransaction.prototype, "listing", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'seller_id' }),
    __metadata("design:type", user_entity_1.User)
], MarketTransaction.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_id' }),
    __metadata("design:type", user_entity_1.User)
], MarketTransaction.prototype, "buyer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => card_entity_1.Card, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'card_id' }),
    __metadata("design:type", card_entity_1.Card)
], MarketTransaction.prototype, "card", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'listing_mode',
        type: 'varchar',
        length: 20,
        default: market_listing_mode_enum_1.MarketListingMode.UNIT,
    }),
    __metadata("design:type", String)
], MarketTransaction.prototype, "listingMode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'offer_type',
        type: 'varchar',
        length: 30,
        default: market_offer_type_enum_1.MarketOfferType.CREDITS_ONLY,
    }),
    __metadata("design:type", String)
], MarketTransaction.prototype, "offerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MarketTransaction.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_price_credits', type: 'int' }),
    __metadata("design:type", Number)
], MarketTransaction.prototype, "unitPriceCredits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_price_credits', type: 'int' }),
    __metadata("design:type", Number)
], MarketTransaction.prototype, "totalPriceCredits", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => card_entity_1.Card, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_offered_card_id' }),
    __metadata("design:type", Object)
], MarketTransaction.prototype, "buyerOfferedCard", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_offered_card_quantity', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MarketTransaction.prototype, "buyerOfferedCardQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'transaction_type',
        type: 'varchar',
        length: 30,
        default: market_transaction_type_enum_1.MarketTransactionType.CREDITS_SALE,
    }),
    __metadata("design:type", String)
], MarketTransaction.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], MarketTransaction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'seller_reward_claimed_at',
        type: 'datetime',
        nullable: true,
    }),
    __metadata("design:type", Object)
], MarketTransaction.prototype, "sellerRewardClaimedAt", void 0);
exports.MarketTransaction = MarketTransaction = __decorate([
    (0, typeorm_1.Entity)('market_transactions')
], MarketTransaction);
//# sourceMappingURL=market-transaction.entity.js.map