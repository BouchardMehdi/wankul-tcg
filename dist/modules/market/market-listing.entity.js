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
exports.MarketListing = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const card_entity_1 = require("../cards/card.entity");
const market_listing_status_enum_1 = require("./market-listing-status.enum");
const market_listing_mode_enum_1 = require("./market-listing-mode.enum");
const market_offer_type_enum_1 = require("./market-offer-type.enum");
let MarketListing = class MarketListing {
    id;
    seller;
    card;
    listingMode;
    offerType;
    quantity;
    remainingQuantity;
    priceCredits;
    wantedCard;
    wantedCardQuantity;
    wantedCardMarketPriceSnapshot;
    marketPriceSnapshot;
    status;
    createdAt;
    updatedAt;
    closedAt;
    stalePushSentAt;
};
exports.MarketListing = MarketListing;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MarketListing.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'seller_id' }),
    __metadata("design:type", user_entity_1.User)
], MarketListing.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => card_entity_1.Card, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'card_id' }),
    __metadata("design:type", card_entity_1.Card)
], MarketListing.prototype, "card", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'listing_mode',
        type: 'varchar',
        length: 20,
        default: market_listing_mode_enum_1.MarketListingMode.UNIT,
    }),
    __metadata("design:type", String)
], MarketListing.prototype, "listingMode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'offer_type',
        type: 'varchar',
        length: 30,
        default: market_offer_type_enum_1.MarketOfferType.CREDITS_ONLY,
    }),
    __metadata("design:type", String)
], MarketListing.prototype, "offerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MarketListing.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remaining_quantity', type: 'int' }),
    __metadata("design:type", Number)
], MarketListing.prototype, "remainingQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_credits', type: 'int' }),
    __metadata("design:type", Number)
], MarketListing.prototype, "priceCredits", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => card_entity_1.Card, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'wanted_card_id' }),
    __metadata("design:type", Object)
], MarketListing.prototype, "wantedCard", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wanted_card_quantity', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MarketListing.prototype, "wantedCardQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'wanted_card_market_price_snapshot',
        type: 'int',
        default: 0,
    }),
    __metadata("design:type", Number)
], MarketListing.prototype, "wantedCardMarketPriceSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'market_price_snapshot', type: 'int' }),
    __metadata("design:type", Number)
], MarketListing.prototype, "marketPriceSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        default: market_listing_status_enum_1.MarketListingStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], MarketListing.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], MarketListing.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], MarketListing.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], MarketListing.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stale_push_sent_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], MarketListing.prototype, "stalePushSentAt", void 0);
exports.MarketListing = MarketListing = __decorate([
    (0, typeorm_1.Entity)('market_listings'),
    (0, typeorm_1.Index)(['status'])
], MarketListing);
//# sourceMappingURL=market-listing.entity.js.map