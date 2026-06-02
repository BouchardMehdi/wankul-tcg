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
exports.ListMarketListingsQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const market_listing_mode_enum_1 = require("../market-listing-mode.enum");
const market_offer_type_enum_1 = require("../market-offer-type.enum");
function toOptionalInt(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : value;
}
class ListMarketListingsQueryDto {
    search;
    rarity;
    season;
    listingMode;
    offerType;
    minPrice;
    maxPrice;
    sortBy;
    sortOrder;
    limit;
}
exports.ListMarketListingsQueryDto = ListMarketListingsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListMarketListingsQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListMarketListingsQueryDto.prototype, "rarity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListMarketListingsQueryDto.prototype, "season", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([market_listing_mode_enum_1.MarketListingMode.UNIT, market_listing_mode_enum_1.MarketListingMode.LOT]),
    __metadata("design:type", String)
], ListMarketListingsQueryDto.prototype, "listingMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([
        market_offer_type_enum_1.MarketOfferType.CREDITS_ONLY,
        market_offer_type_enum_1.MarketOfferType.CARD_ONLY,
        market_offer_type_enum_1.MarketOfferType.CARD_AND_CREDITS,
    ]),
    __metadata("design:type", String)
], ListMarketListingsQueryDto.prototype, "offerType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ListMarketListingsQueryDto.prototype, "minPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ListMarketListingsQueryDto.prototype, "maxPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([
        'createdAt',
        'priceCredits',
        'marketPriceSnapshot',
        'rarity',
        'cardName',
    ]),
    __metadata("design:type", String)
], ListMarketListingsQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ASC', 'DESC', 'asc', 'desc']),
    __metadata("design:type", String)
], ListMarketListingsQueryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(300),
    __metadata("design:type", Number)
], ListMarketListingsQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=list-market-listings-query.dto.js.map