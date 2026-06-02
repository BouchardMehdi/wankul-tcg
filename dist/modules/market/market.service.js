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
exports.MarketService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_card_entity_1 = require("../users/user-card.entity");
const user_economy_entity_1 = require("../economy/user-economy.entity");
const card_entity_1 = require("../cards/card.entity");
const market_pricing_service_1 = require("./market-pricing.service");
const market_price_history_service_1 = require("./market-price-history.service");
const market_rarity_values_1 = require("./constants/market-rarity-values");
const market_listing_entity_1 = require("./market-listing.entity");
const market_transaction_entity_1 = require("./market-transaction.entity");
const market_listing_status_enum_1 = require("./market-listing-status.enum");
const market_transaction_type_enum_1 = require("./market-transaction-type.enum");
const market_listing_mode_enum_1 = require("./market-listing-mode.enum");
const market_offer_type_enum_1 = require("./market-offer-type.enum");
const market_price_position_enum_1 = require("./market-price-position.enum");
const economy_analytics_service_1 = require("../economy/economy-analytics.service");
const push_service_1 = require("../push/push.service");
const anti_abuse_service_1 = require("../security/anti-abuse.service");
const user_entity_1 = require("../users/user.entity");
let MarketService = class MarketService {
    dataSource;
    marketPricingService;
    marketPriceHistoryService;
    economyAnalyticsService;
    pushService;
    antiAbuseService;
    userCardsRepository;
    userEconomyRepository;
    cardsRepository;
    marketListingRepository;
    marketTransactionRepository;
    usersRepository;
    constructor(dataSource, marketPricingService, marketPriceHistoryService, economyAnalyticsService, pushService, antiAbuseService, userCardsRepository, userEconomyRepository, cardsRepository, marketListingRepository, marketTransactionRepository, usersRepository) {
        this.dataSource = dataSource;
        this.marketPricingService = marketPricingService;
        this.marketPriceHistoryService = marketPriceHistoryService;
        this.economyAnalyticsService = economyAnalyticsService;
        this.pushService = pushService;
        this.antiAbuseService = antiAbuseService;
        this.userCardsRepository = userCardsRepository;
        this.userEconomyRepository = userEconomyRepository;
        this.cardsRepository = cardsRepository;
        this.marketListingRepository = marketListingRepository;
        this.marketTransactionRepository = marketTransactionRepository;
        this.usersRepository = usersRepository;
    }
    async getMarketPrice(cardId) {
        return this.marketPricingService.getMarketPrice(cardId);
    }
    async getMySellableCards(userId) {
        const userCards = await this.userCardsRepository.find({
            where: { user: { id: userId } },
            relations: ['card', 'user'],
            order: {
                card: {
                    season: 'ASC',
                    rarity: 'ASC',
                    name: 'ASC',
                },
            },
        });
        const results = await Promise.all(userCards.map(async (userCard) => {
            const totalQuantity = userCard.quantity;
            const quantityLocked = userCard.quantityLocked;
            const quantityAvailable = Math.max(0, totalQuantity - quantityLocked);
            const sellableQuantity = Math.max(0, totalQuantity - quantityLocked - market_rarity_values_1.MARKET_KEEP_MIN_COPIES);
            if (sellableQuantity <= 0) {
                return null;
            }
            const pricing = await this.marketPricingService.getMarketPrice(userCard.card.id);
            const quickSellUnitPrice = pricing.quickSellUnitPrice;
            return {
                cardId: userCard.card.id,
                cardKey: userCard.card.key,
                cardName: userCard.card.name,
                rarity: userCard.card.rarity,
                season: userCard.card.season,
                type: userCard.card.type,
                artist: userCard.card.artist,
                totalQuantity,
                quantityLocked,
                quantityAvailable,
                keptQuantity: market_rarity_values_1.MARKET_KEEP_MIN_COPIES,
                sellableQuantity,
                marketPrice: pricing.finalPrice,
                quickSellUnitPrice,
                quickSellTotalPrice: quickSellUnitPrice * sellableQuantity,
                canCreateUnitListing: sellableQuantity >= 1,
                canCreateLotListing: sellableQuantity >= 1,
            };
        }));
        return results.filter(Boolean);
    }
    async quickSell(userId, cardId, quantity) {
        await this.assertMarketAccess(userId);
        await this.antiAbuseService.assertRateLimit(userId, 'QUICK_SELL');
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new common_1.BadRequestException('Quantity must be an integer greater than or equal to 1.');
        }
        const pricing = await this.marketPricingService.getMarketPrice(cardId);
        const unitCreditsEarned = pricing.quickSellUnitPrice;
        const result = await this.dataSource.transaction(async (manager) => {
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const userEconomyRepo = manager.getRepository(user_economy_entity_1.UserEconomy);
            const cardRepo = manager.getRepository(card_entity_1.Card);
            const userCard = await userCardRepo
                .createQueryBuilder('uc')
                .leftJoinAndSelect('uc.card', 'card')
                .leftJoinAndSelect('uc.user', 'user')
                .setLock('pessimistic_write')
                .where('user.id = :userId', { userId })
                .andWhere('card.id = :cardId', { cardId })
                .getOne();
            if (!userCard) {
                throw new common_1.NotFoundException(`User does not own card ${cardId}`);
            }
            const maxSellableQuantity = Math.max(0, userCard.quantity - userCard.quantityLocked - market_rarity_values_1.MARKET_KEEP_MIN_COPIES);
            if (maxSellableQuantity <= 0) {
                throw new common_1.BadRequestException('Quick sale is only available for duplicates. Keep at least one copy.');
            }
            if (quantity > maxSellableQuantity) {
                throw new common_1.BadRequestException(`Tu peux vendre au maximum ${maxSellableQuantity} copie(s) de cette carte en gardant ${market_rarity_values_1.MARKET_KEEP_MIN_COPIES} copie(s) en réserve.`);
            }
            const card = await cardRepo.findOne({
                where: { id: cardId },
            });
            if (!card) {
                throw new common_1.NotFoundException(`Card ${cardId} not found`);
            }
            let economy = await userEconomyRepo
                .createQueryBuilder('ue')
                .setLock('pessimistic_write')
                .where('ue.userId = :userId', { userId })
                .getOne();
            if (!economy) {
                economy = userEconomyRepo.create({
                    userId,
                    credits: 0,
                });
            }
            const creditsEarned = unitCreditsEarned * quantity;
            userCard.quantity -= quantity;
            economy.credits += creditsEarned;
            await userCardRepo.save(userCard);
            await userEconomyRepo.save(economy);
            return {
                success: true,
                cardId: card.id,
                cardKey: card.key,
                cardName: card.name,
                rarity: card.rarity,
                soldQuantity: quantity,
                marketPrice: pricing.finalPrice,
                quickSellRate: pricing.quickSellRate,
                creditsEarned,
                remainingQuantity: userCard.quantity,
                keptQuantity: market_rarity_values_1.MARKET_KEEP_MIN_COPIES,
                maxSellableQuantity,
                newCreditsBalance: economy.credits,
            };
        });
        await this.economyAnalyticsService.addQuickSell(result.creditsEarned);
        await this.snapshotCards([cardId], 'quick_sell');
        await this.antiAbuseService.logAction({
            userId,
            cardId,
            action: 'QUICK_SELL',
            status: 'allowed',
            targetType: 'card',
            targetId: cardId,
            valueCredits: result.creditsEarned,
            metadata: {
                quantity,
                cardName: result.cardName,
                rarity: result.rarity,
                marketPrice: result.marketPrice,
                quickSellRate: result.quickSellRate,
                remainingQuantity: result.remainingQuantity,
            },
        });
        return result;
    }
    async createListing(userId, input) {
        await this.assertMarketAccess(userId);
        await this.antiAbuseService.assertRateLimit(userId, 'MARKET_LISTING_CREATE');
        const normalized = this.normalizeCreateListingInput(input);
        const card = await this.cardsRepository.findOne({
            where: { id: normalized.cardId },
        });
        if (!card) {
            throw new common_1.NotFoundException(`Card ${normalized.cardId} not found`);
        }
        if (normalized.wantedCardId !== undefined &&
            normalized.wantedCardId === normalized.cardId) {
            throw new common_1.BadRequestException('wantedCardId cannot be the same as the sold card.');
        }
        const soldCardPricing = await this.marketPricingService.getMarketPrice(normalized.cardId);
        let wantedCard = null;
        let wantedCardMarketPriceSnapshot = 0;
        if (normalized.wantedCardId !== undefined) {
            wantedCard = await this.cardsRepository.findOne({
                where: { id: normalized.wantedCardId },
            });
            if (!wantedCard) {
                throw new common_1.NotFoundException(`Wanted card ${normalized.wantedCardId} not found`);
            }
            const wantedCardPricing = await this.marketPricingService.getMarketPrice(normalized.wantedCardId);
            wantedCardMarketPriceSnapshot = wantedCardPricing.finalPrice;
        }
        const referenceListedValue = this.computeReferenceListedValue(soldCardPricing.finalPrice, normalized.quantity, normalized.listingMode);
        const referenceRequestedValue = this.computeReferenceRequestedValue(normalized.priceCredits, wantedCardMarketPriceSnapshot, normalized.wantedCardQuantity ?? 0);
        const priceDecision = await this.antiAbuseService.assertListingPriceGuard({
            userId,
            action: 'MARKET_LISTING_CREATE',
            cardId: normalized.cardId,
            referenceValue: referenceListedValue,
            requestedValue: referenceRequestedValue,
            quantity: normalized.quantity,
            metadata: {
                listingMode: normalized.listingMode,
                offerType: normalized.offerType,
                priceCredits: normalized.priceCredits,
                wantedCardId: normalized.wantedCardId ?? null,
                wantedCardQuantity: normalized.wantedCardQuantity ?? 0,
                marketPriceSnapshot: soldCardPricing.finalPrice,
                wantedCardMarketPriceSnapshot,
            },
        });
        const result = await this.dataSource.transaction(async (manager) => {
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const listingRepo = manager.getRepository(market_listing_entity_1.MarketListing);
            const sellerCard = await userCardRepo
                .createQueryBuilder('uc')
                .leftJoinAndSelect('uc.user', 'user')
                .leftJoinAndSelect('uc.card', 'card')
                .setLock('pessimistic_write')
                .where('user.id = :userId', { userId })
                .andWhere('card.id = :cardId', { cardId: normalized.cardId })
                .getOne();
            if (!sellerCard) {
                throw new common_1.NotFoundException(`User does not own card ${normalized.cardId}`);
            }
            const availableToList = Math.max(0, sellerCard.quantity - sellerCard.quantityLocked - market_rarity_values_1.MARKET_KEEP_MIN_COPIES);
            if (availableToList <= 0) {
                throw new common_1.BadRequestException("Tu n'as pas assez de doublons disponibles pour créer une annonce.");
            }
            if (normalized.quantity > availableToList) {
                throw new common_1.BadRequestException(`Tu peux créer une annonce avec au maximum ${availableToList} copie(s) de cette carte en gardant ${market_rarity_values_1.MARKET_KEEP_MIN_COPIES} copie(s) en réserve.`);
            }
            sellerCard.quantityLocked += normalized.quantity;
            await userCardRepo.save(sellerCard);
            const listing = listingRepo.create({
                seller: sellerCard.user,
                card: sellerCard.card,
                listingMode: normalized.listingMode,
                offerType: normalized.offerType,
                quantity: normalized.quantity,
                remainingQuantity: normalized.quantity,
                priceCredits: normalized.priceCredits,
                wantedCard: wantedCard ? { id: wantedCard.id } : null,
                wantedCardQuantity: normalized.wantedCardQuantity,
                wantedCardMarketPriceSnapshot,
                marketPriceSnapshot: soldCardPricing.finalPrice,
                status: market_listing_status_enum_1.MarketListingStatus.ACTIVE,
                closedAt: null,
            });
            const savedListing = await listingRepo.save(listing);
            const hydratedListing = await listingRepo.findOne({
                where: { id: savedListing.id },
                relations: ['seller', 'card', 'wantedCard'],
            });
            if (!hydratedListing) {
                throw new common_1.NotFoundException("La création de l'annonce a échoué.");
            }
            return {
                success: true,
                listing: this.mapListing(hydratedListing),
                inventory: {
                    totalQuantity: sellerCard.quantity,
                    quantityLocked: sellerCard.quantityLocked,
                    quantityAvailable: Math.max(0, sellerCard.quantity -
                        sellerCard.quantityLocked -
                        market_rarity_values_1.MARKET_KEEP_MIN_COPIES),
                    keptQuantity: market_rarity_values_1.MARKET_KEEP_MIN_COPIES,
                },
            };
        });
        await this.snapshotCards([normalized.cardId, normalized.wantedCardId].filter((value) => typeof value === 'number'), 'listing_created');
        if (priceDecision.status === 'allowed') {
            await this.antiAbuseService.logAction({
                userId,
                cardId: normalized.cardId,
                action: 'MARKET_LISTING_CREATE',
                status: 'allowed',
                targetType: 'listing',
                targetId: result.listing.id,
                valueCredits: Math.round(referenceRequestedValue),
                metadata: {
                    cardId: normalized.cardId,
                    cardName: card.name,
                    rarity: card.rarity,
                    quantity: normalized.quantity,
                    listingMode: normalized.listingMode,
                    offerType: normalized.offerType,
                    referenceListedValue,
                    referenceRequestedValue,
                    wantedCardId: normalized.wantedCardId ?? null,
                    wantedCardName: wantedCard?.name ?? null,
                    priceDecision,
                },
            });
        }
        return result;
    }
    async getActiveListings(query) {
        const qb = this.marketListingRepository
            .createQueryBuilder('listing')
            .leftJoinAndSelect('listing.seller', 'seller')
            .leftJoinAndSelect('listing.card', 'card')
            .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
            .where('listing.status = :status', { status: market_listing_status_enum_1.MarketListingStatus.ACTIVE });
        this.applyListingFilters(qb, query);
        const sortBy = query.sortBy ?? 'createdAt';
        const sortOrder = (query.sortOrder ?? 'DESC').toUpperCase();
        const limit = query.limit ?? 50;
        switch (sortBy) {
            case 'priceCredits':
                qb.orderBy('listing.priceCredits', sortOrder);
                break;
            case 'marketPriceSnapshot':
                qb.orderBy('listing.marketPriceSnapshot', sortOrder);
                break;
            case 'rarity':
                qb.orderBy('card.rarity', sortOrder);
                break;
            case 'cardName':
                qb.orderBy('card.name', sortOrder);
                break;
            case 'createdAt':
            default:
                qb.orderBy('listing.createdAt', sortOrder);
                break;
        }
        qb.limit(limit);
        const listings = await qb.getMany();
        return listings.map((listing) => this.mapListing(listing));
    }
    async getListingById(listingId) {
        const listing = await this.marketListingRepository.findOne({
            where: { id: listingId },
            relations: ['seller', 'card', 'wantedCard'],
        });
        if (!listing) {
            throw new common_1.NotFoundException(`Listing ${listingId} not found`);
        }
        return this.mapListing(listing);
    }
    async getMyListings(userId) {
        const listings = await this.marketListingRepository.find({
            where: { seller: { id: userId } },
            relations: ['seller', 'card', 'wantedCard'],
            order: { createdAt: 'DESC' },
        });
        return listings.map((listing) => this.mapListing(listing));
    }
    async cancelListing(userId, listingId) {
        await this.assertMarketAccess(userId);
        await this.antiAbuseService.assertRateLimit(userId, 'MARKET_LISTING_CANCEL');
        const result = await this.dataSource.transaction(async (manager) => {
            const listingRepo = manager.getRepository(market_listing_entity_1.MarketListing);
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const listing = await listingRepo
                .createQueryBuilder('listing')
                .leftJoinAndSelect('listing.seller', 'seller')
                .leftJoinAndSelect('listing.card', 'card')
                .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
                .setLock('pessimistic_write')
                .where('listing.id = :listingId', { listingId })
                .getOne();
            if (!listing) {
                throw new common_1.NotFoundException(`Listing ${listingId} not found`);
            }
            if (listing.seller.id !== userId) {
                throw new common_1.BadRequestException('Tu peux seulement annuler tes propres annonces.');
            }
            if (listing.status !== market_listing_status_enum_1.MarketListingStatus.ACTIVE) {
                throw new common_1.BadRequestException('Only active listings can be cancelled.');
            }
            const unlockedQuantity = listing.remainingQuantity;
            const sellerCard = await userCardRepo
                .createQueryBuilder('uc')
                .leftJoinAndSelect('uc.user', 'user')
                .leftJoinAndSelect('uc.card', 'card')
                .setLock('pessimistic_write')
                .where('user.id = :userId', { userId })
                .andWhere('card.id = :cardId', { cardId: listing.card.id })
                .getOne();
            if (!sellerCard) {
                throw new common_1.NotFoundException(`Seller inventory for card ${listing.card.id} not found`);
            }
            sellerCard.quantityLocked = Math.max(0, sellerCard.quantityLocked - unlockedQuantity);
            listing.status = market_listing_status_enum_1.MarketListingStatus.CANCELLED;
            listing.remainingQuantity = 0;
            listing.closedAt = new Date();
            await userCardRepo.save(sellerCard);
            await listingRepo.save(listing);
            return {
                success: true,
                listingId: listing.id,
                cardId: listing.card.id,
                wantedCardId: listing.wantedCard?.id ?? null,
                status: listing.status,
                unlockedQuantity,
                closedAt: listing.closedAt,
            };
        });
        await this.snapshotCards([result.cardId, result.wantedCardId].filter((value) => typeof value === 'number'), 'listing_cancelled');
        await this.antiAbuseService.logAction({
            userId,
            cardId: result.cardId,
            action: 'MARKET_LISTING_CANCEL',
            status: 'allowed',
            targetType: 'listing',
            targetId: result.listingId,
            metadata: {
                cardId: result.cardId,
                wantedCardId: result.wantedCardId,
                unlockedQuantity: result.unlockedQuantity,
                closedAt: result.closedAt,
            },
        });
        return {
            success: true,
            listingId: result.listingId,
            status: result.status,
            unlockedQuantity: result.unlockedQuantity,
            closedAt: result.closedAt,
        };
    }
    async buyListing(userId, listingId, dto) {
        await this.assertMarketAccess(userId);
        await this.antiAbuseService.assertRateLimit(userId, 'MARKET_BUY');
        if (!Number.isInteger(dto.quantity) || dto.quantity < 1) {
            throw new common_1.BadRequestException('Quantity must be at least 1.');
        }
        const result = await this.dataSource.transaction(async (manager) => {
            const listingRepo = manager.getRepository(market_listing_entity_1.MarketListing);
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const userEconomyRepo = manager.getRepository(user_economy_entity_1.UserEconomy);
            const transactionRepo = manager.getRepository(market_transaction_entity_1.MarketTransaction);
            const listing = await listingRepo
                .createQueryBuilder('listing')
                .leftJoinAndSelect('listing.seller', 'seller')
                .leftJoinAndSelect('listing.card', 'card')
                .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
                .setLock('pessimistic_write')
                .where('listing.id = :listingId', { listingId })
                .getOne();
            if (!listing) {
                throw new common_1.NotFoundException(`Listing ${listingId} not found`);
            }
            if (listing.status !== market_listing_status_enum_1.MarketListingStatus.ACTIVE) {
                throw new common_1.BadRequestException('Listing is not active.');
            }
            if (listing.seller.id === userId) {
                throw new common_1.BadRequestException('Tu ne peux pas acheter ta propre annonce.');
            }
            const purchaseQuantity = this.resolvePurchaseQuantity(listing, dto.quantity);
            const requiredCredits = this.computeRequiredCredits(listing, purchaseQuantity);
            const requiredWantedCardQuantity = this.computeRequiredWantedCardQuantity(listing, purchaseQuantity);
            const referencePurchasedValue = this.computePurchasedReferenceValue(listing, purchaseQuantity);
            const requestedPurchasedValue = this.computeReferenceRequestedValue(requiredCredits, listing.wantedCardMarketPriceSnapshot, requiredWantedCardQuantity);
            const purchaseRiskDecision = await this.antiAbuseService.assertPurchaseRisk({
                buyerId: userId,
                sellerId: listing.seller.id,
                listingId: listing.id,
                cardId: listing.card.id,
                quantity: purchaseQuantity,
                referenceValue: referencePurchasedValue,
                requestedValue: requestedPurchasedValue,
                totalPriceCredits: requiredCredits,
            });
            let buyerOfferedCard = null;
            let buyerPaymentCard = null;
            if (listing.offerType === market_offer_type_enum_1.MarketOfferType.CARD_ONLY ||
                listing.offerType === market_offer_type_enum_1.MarketOfferType.CARD_AND_CREDITS) {
                if (!listing.wantedCard) {
                    throw new common_1.BadRequestException('Listing is missing wantedCard configuration.');
                }
                if (!dto.offeredCardId) {
                    throw new common_1.BadRequestException('offeredCardId is required for this listing type.');
                }
                if (dto.offeredCardId !== listing.wantedCard.id) {
                    throw new common_1.BadRequestException(`This listing requires card ${listing.wantedCard.id}.`);
                }
                buyerOfferedCard = listing.wantedCard;
                buyerPaymentCard = await userCardRepo
                    .createQueryBuilder('uc')
                    .leftJoinAndSelect('uc.user', 'user')
                    .leftJoinAndSelect('uc.card', 'card')
                    .setLock('pessimistic_write')
                    .where('user.id = :buyerId', { buyerId: userId })
                    .andWhere('card.id = :cardId', { cardId: listing.wantedCard.id })
                    .getOne();
                if (!buyerPaymentCard) {
                    throw new common_1.BadRequestException('Buyer does not own the required exchange card.');
                }
                const buyerAvailablePaymentCards = buyerPaymentCard.quantity - buyerPaymentCard.quantityLocked;
                if (buyerAvailablePaymentCards < requiredWantedCardQuantity) {
                    throw new common_1.BadRequestException(`Buyer needs ${requiredWantedCardQuantity} available copie(s) of the required card.`);
                }
            }
            let buyerEconomy = null;
            let sellerEconomy = null;
            if (requiredCredits > 0) {
                buyerEconomy = await userEconomyRepo
                    .createQueryBuilder('ue')
                    .setLock('pessimistic_write')
                    .where('ue.userId = :userId', { userId })
                    .getOne();
                if (!buyerEconomy) {
                    buyerEconomy = userEconomyRepo.create({
                        userId,
                        credits: 0,
                    });
                }
                if (buyerEconomy.credits < requiredCredits) {
                    throw new common_1.BadRequestException("Tu n'as pas assez de WunkulCoins pour acheter cette annonce.");
                }
                sellerEconomy = await userEconomyRepo
                    .createQueryBuilder('ue')
                    .setLock('pessimistic_write')
                    .where('ue.userId = :userId', { userId: listing.seller.id })
                    .getOne();
                if (!sellerEconomy) {
                    sellerEconomy = userEconomyRepo.create({
                        userId: listing.seller.id,
                        credits: 0,
                    });
                }
            }
            const sellerCard = await userCardRepo
                .createQueryBuilder('uc')
                .leftJoinAndSelect('uc.user', 'user')
                .leftJoinAndSelect('uc.card', 'card')
                .setLock('pessimistic_write')
                .where('user.id = :sellerId', { sellerId: listing.seller.id })
                .andWhere('card.id = :cardId', { cardId: listing.card.id })
                .getOne();
            if (!sellerCard) {
                throw new common_1.NotFoundException(`Seller inventory for card ${listing.card.id} not found`);
            }
            if (sellerCard.quantityLocked < purchaseQuantity) {
                throw new common_1.BadRequestException('Seller inventory is out of sync for this listing.');
            }
            let buyerReceivedCard = await userCardRepo
                .createQueryBuilder('uc')
                .leftJoinAndSelect('uc.user', 'user')
                .leftJoinAndSelect('uc.card', 'card')
                .setLock('pessimistic_write')
                .where('user.id = :buyerId', { buyerId: userId })
                .andWhere('card.id = :cardId', { cardId: listing.card.id })
                .getOne();
            if (!buyerReceivedCard) {
                buyerReceivedCard = userCardRepo.create({
                    user: { id: userId },
                    card: { id: listing.card.id },
                    quantity: 0,
                    quantityLocked: 0,
                });
            }
            sellerCard.quantityLocked -= purchaseQuantity;
            sellerCard.quantity -= purchaseQuantity;
            buyerReceivedCard.quantity += purchaseQuantity;
            if (buyerPaymentCard && requiredWantedCardQuantity > 0) {
                buyerPaymentCard.quantity -= requiredWantedCardQuantity;
            }
            if (buyerEconomy && requiredCredits > 0) {
                buyerEconomy.credits -= requiredCredits;
            }
            listing.remainingQuantity -= purchaseQuantity;
            if (listing.remainingQuantity === 0) {
                listing.status = market_listing_status_enum_1.MarketListingStatus.SOLD;
                listing.closedAt = new Date();
            }
            await userCardRepo.save(sellerCard);
            await userCardRepo.save(buyerReceivedCard);
            if (buyerPaymentCard) {
                await userCardRepo.save(buyerPaymentCard);
            }
            if (buyerEconomy) {
                await userEconomyRepo.save(buyerEconomy);
            }
            await listingRepo.save(listing);
            const transactionType = listing.offerType === market_offer_type_enum_1.MarketOfferType.CREDITS_ONLY
                ? market_transaction_type_enum_1.MarketTransactionType.CREDITS_SALE
                : listing.offerType === market_offer_type_enum_1.MarketOfferType.CARD_ONLY
                    ? market_transaction_type_enum_1.MarketTransactionType.CARD_TRADE
                    : market_transaction_type_enum_1.MarketTransactionType.CARD_AND_CREDITS_TRADE;
            const transaction = transactionRepo.create({
                listing,
                seller: { id: listing.seller.id },
                buyer: { id: userId },
                card: { id: listing.card.id },
                listingMode: listing.listingMode,
                offerType: listing.offerType,
                quantity: purchaseQuantity,
                unitPriceCredits: listing.listingMode === market_listing_mode_enum_1.MarketListingMode.UNIT
                    ? listing.priceCredits
                    : 0,
                totalPriceCredits: requiredCredits,
                buyerOfferedCard: buyerOfferedCard
                    ? { id: buyerOfferedCard.id }
                    : null,
                buyerOfferedCardQuantity: requiredWantedCardQuantity,
                transactionType,
                sellerRewardClaimedAt: null,
            });
            const savedTransaction = await transactionRepo.save(transaction);
            return {
                success: true,
                snapshotCardIds: [listing.card.id, buyerOfferedCard?.id ?? null].filter((value) => typeof value === 'number'),
                listing: {
                    id: listing.id,
                    status: listing.status,
                    remainingQuantity: listing.remainingQuantity,
                    closedAt: listing.closedAt,
                },
                settlement: {
                    soldCardQuantity: purchaseQuantity,
                    creditsPaid: requiredCredits,
                    offeredCardId: buyerOfferedCard?.id ?? null,
                    offeredCardQuantity: requiredWantedCardQuantity,
                    sellerRewardPending: true,
                },
                transaction: {
                    id: savedTransaction.id,
                    listingId: listing.id,
                    sellerId: listing.seller.id,
                    buyerId: userId,
                    cardId: listing.card.id,
                    cardName: listing.card.name,
                    listingMode: savedTransaction.listingMode,
                    offerType: savedTransaction.offerType,
                    quantity: purchaseQuantity,
                    totalPriceCredits: requiredCredits,
                    buyerOfferedCardId: buyerOfferedCard?.id ?? null,
                    buyerOfferedCardName: buyerOfferedCard?.name ?? null,
                    buyerOfferedCardQuantity: requiredWantedCardQuantity,
                    transactionType: savedTransaction.transactionType,
                    sellerRewardClaimedAt: savedTransaction.sellerRewardClaimedAt,
                    createdAt: savedTransaction.createdAt,
                },
                balances: buyerEconomy
                    ? {
                        buyerCredits: buyerEconomy.credits,
                        sellerCredits: sellerEconomy?.credits ?? null,
                    }
                    : null,
                abuseDecision: purchaseRiskDecision,
            };
        });
        await this.snapshotCards(result.snapshotCardIds, 'listing_bought');
        if (result.abuseDecision?.status === 'allowed') {
            await this.antiAbuseService.logAction({
                userId,
                relatedUserId: result.transaction.sellerId,
                cardId: result.transaction.cardId,
                action: 'MARKET_BUY',
                status: 'allowed',
                targetType: 'listing',
                targetId: listingId,
                valueCredits: result.settlement.creditsPaid,
                metadata: {
                    transactionId: result.transaction.id,
                    sellerId: result.transaction.sellerId,
                    cardId: result.transaction.cardId,
                    cardName: result.transaction.cardName,
                    quantity: result.transaction.quantity,
                    offerType: result.transaction.offerType,
                    listingMode: result.transaction.listingMode,
                    buyerOfferedCardId: result.transaction.buyerOfferedCardId,
                    buyerOfferedCardName: result.transaction.buyerOfferedCardName,
                    buyerOfferedCardQuantity: result.transaction.buyerOfferedCardQuantity,
                    abuseDecision: result.abuseDecision,
                },
            });
            await this.antiAbuseService.logAction({
                userId: result.transaction.sellerId,
                relatedUserId: result.transaction.buyerId,
                cardId: result.transaction.cardId,
                action: 'MARKET_SALE',
                status: 'allowed',
                severity: 'info',
                targetType: 'transaction',
                targetId: result.transaction.id,
                valueCredits: result.settlement.creditsPaid,
                metadata: {
                    listingId,
                    buyerId: result.transaction.buyerId,
                    cardId: result.transaction.cardId,
                    cardName: result.transaction.cardName,
                    quantity: result.transaction.quantity,
                    offerType: result.transaction.offerType,
                    listingMode: result.transaction.listingMode,
                    rewardPending: true,
                    buyerOfferedCardId: result.transaction.buyerOfferedCardId,
                    buyerOfferedCardName: result.transaction.buyerOfferedCardName,
                    buyerOfferedCardQuantity: result.transaction.buyerOfferedCardQuantity,
                },
            });
        }
        await this.pushService
            .notifySaleRewardAvailable({
            sellerId: result.transaction.sellerId,
            transactionId: result.transaction.id,
            soldCardName: result.transaction.cardName,
            rewardCredits: result.settlement.creditsPaid,
            rewardCardName: result.transaction.buyerOfferedCardName,
            rewardCardQuantity: result.settlement.offeredCardQuantity,
        })
            .catch(() => undefined);
        return {
            success: result.success,
            listing: result.listing,
            settlement: result.settlement,
            transaction: result.transaction,
            balances: result.balances,
        };
    }
    async claimTransactionReward(userId, transactionId) {
        await this.assertMarketAccess(userId);
        await this.antiAbuseService.assertRateLimit(userId, 'MARKET_REWARD_CLAIM');
        const result = await this.dataSource.transaction(async (manager) => {
            const transactionRepo = manager.getRepository(market_transaction_entity_1.MarketTransaction);
            const userEconomyRepo = manager.getRepository(user_economy_entity_1.UserEconomy);
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const transaction = await transactionRepo
                .createQueryBuilder('tx')
                .leftJoinAndSelect('tx.seller', 'seller')
                .leftJoinAndSelect('tx.buyer', 'buyer')
                .leftJoinAndSelect('tx.card', 'card')
                .leftJoinAndSelect('tx.buyerOfferedCard', 'buyerOfferedCard')
                .leftJoinAndSelect('tx.listing', 'listing')
                .setLock('pessimistic_write')
                .where('tx.id = :transactionId', { transactionId })
                .getOne();
            if (!transaction) {
                throw new common_1.NotFoundException(`Transaction ${transactionId} not found`);
            }
            if (transaction.seller.id !== userId) {
                throw new common_1.BadRequestException('Tu peux seulement récupérer les récompenses de tes propres ventes.');
            }
            const wasCancelledByAdmin = await this.antiAbuseService.hasActionLog('ADMIN_TRANSACTION_CANCEL', 'transaction', transaction.id);
            if (wasCancelledByAdmin) {
                throw new common_1.BadRequestException('Cette transaction a ete annulee par un administrateur.');
            }
            if (transaction.sellerRewardClaimedAt) {
                throw new common_1.BadRequestException('Reward already claimed for this sale.');
            }
            let sellerEconomy = await userEconomyRepo
                .createQueryBuilder('ue')
                .setLock('pessimistic_write')
                .where('ue.userId = :userId', { userId })
                .getOne();
            if (!sellerEconomy) {
                sellerEconomy = userEconomyRepo.create({
                    userId,
                    credits: 0,
                });
            }
            if (transaction.totalPriceCredits > 0) {
                sellerEconomy.credits += transaction.totalPriceCredits;
                await userEconomyRepo.save(sellerEconomy);
            }
            let sellerRewardCardInventory = null;
            if (transaction.buyerOfferedCard &&
                transaction.buyerOfferedCardQuantity > 0) {
                sellerRewardCardInventory = await userCardRepo
                    .createQueryBuilder('uc')
                    .leftJoinAndSelect('uc.user', 'user')
                    .leftJoinAndSelect('uc.card', 'card')
                    .setLock('pessimistic_write')
                    .where('user.id = :sellerId', { sellerId: userId })
                    .andWhere('card.id = :cardId', {
                    cardId: transaction.buyerOfferedCard.id,
                })
                    .getOne();
                if (!sellerRewardCardInventory) {
                    sellerRewardCardInventory = userCardRepo.create({
                        user: { id: userId },
                        card: { id: transaction.buyerOfferedCard.id },
                        quantity: 0,
                        quantityLocked: 0,
                    });
                }
                sellerRewardCardInventory.quantity +=
                    transaction.buyerOfferedCardQuantity;
                await userCardRepo.save(sellerRewardCardInventory);
            }
            transaction.sellerRewardClaimedAt = new Date();
            await transactionRepo.save(transaction);
            return {
                success: true,
                snapshotCardIds: [
                    transaction.card.id,
                    transaction.buyerOfferedCard?.id ?? null,
                ].filter((value) => typeof value === 'number'),
                transactionId: transaction.id,
                buyerId: transaction.buyer.id,
                soldCardId: transaction.card.id,
                soldCardName: transaction.card.name,
                claimedAt: transaction.sellerRewardClaimedAt,
                rewards: {
                    credits: transaction.totalPriceCredits,
                    cardId: transaction.buyerOfferedCard?.id ?? null,
                    cardName: transaction.buyerOfferedCard?.name ?? null,
                    cardQuantity: transaction.buyerOfferedCardQuantity,
                },
                balances: {
                    sellerCredits: sellerEconomy.credits,
                },
            };
        });
        if (result.rewards.credits > 0) {
            await this.economyAnalyticsService.addMarketVolume(result.rewards.credits);
        }
        await this.snapshotCards(result.snapshotCardIds, 'reward_claimed');
        await this.antiAbuseService.logAction({
            userId,
            relatedUserId: result.buyerId,
            cardId: result.soldCardId,
            action: 'MARKET_REWARD_CLAIM',
            status: 'allowed',
            targetType: 'transaction',
            targetId: result.transactionId,
            valueCredits: result.rewards.credits,
            metadata: {
                buyerId: result.buyerId,
                soldCardId: result.soldCardId,
                soldCardName: result.soldCardName,
                rewards: result.rewards,
                claimedAt: result.claimedAt,
            },
        });
        return {
            success: result.success,
            transactionId: result.transactionId,
            claimedAt: result.claimedAt,
            rewards: result.rewards,
            balances: result.balances,
        };
    }
    async getMyTransactions(userId) {
        const transactions = await this.marketTransactionRepository.find({
            where: [{ buyer: { id: userId } }, { seller: { id: userId } }],
            relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
            order: { createdAt: 'DESC' },
        });
        return transactions.map((transaction) => this.mapTransaction(transaction, userId));
    }
    async getRecentSales(limit) {
        const parsedLimit = Number(limit ?? 250);
        const safeLimit = Number.isInteger(parsedLimit)
            ? Math.min(Math.max(parsedLimit, 1), 500)
            : 250;
        const transactions = await this.marketTransactionRepository.find({
            relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
            order: { createdAt: 'DESC' },
            take: safeLimit,
        });
        return transactions.map((transaction) => this.mapRecentSale(transaction));
    }
    async getMyPurchases(userId) {
        const transactions = await this.marketTransactionRepository.find({
            where: { buyer: { id: userId } },
            relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
            order: { createdAt: 'DESC' },
        });
        return transactions.map((transaction) => this.mapTransaction(transaction, userId));
    }
    async getMySales(userId) {
        const transactions = await this.marketTransactionRepository.find({
            where: { seller: { id: userId } },
            relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
            order: { createdAt: 'DESC' },
        });
        return transactions.map((transaction) => this.mapTransaction(transaction, userId));
    }
    async assertMarketAccess(userId) {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('Utilisateur introuvable.');
        }
        const now = Date.now();
        if (user.suspendedUntil) {
            const suspendedUntil = new Date(user.suspendedUntil);
            if (!Number.isNaN(suspendedUntil.getTime()) && suspendedUntil.getTime() > now) {
                throw new common_1.ForbiddenException(`Compte suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`);
            }
        }
        if (user.marketBlockedUntil) {
            const marketBlockedUntil = new Date(user.marketBlockedUntil);
            if (!Number.isNaN(marketBlockedUntil.getTime()) &&
                marketBlockedUntil.getTime() > now) {
                throw new common_1.ForbiddenException(`Market bloqué jusqu'au ${marketBlockedUntil.toLocaleString('fr-FR')}.`);
            }
        }
    }
    normalizeCreateListingInput(input) {
        const quantity = Number(input.quantity);
        const priceCredits = Number(input.priceCredits);
        const wantedCardId = input.wantedCardId !== undefined ? Number(input.wantedCardId) : undefined;
        const wantedCardQuantity = input.wantedCardQuantity !== undefined
            ? Number(input.wantedCardQuantity)
            : 0;
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new common_1.BadRequestException('Quantity must be at least 1.');
        }
        if (!Object.values(market_listing_mode_enum_1.MarketListingMode).includes(input.listingMode)) {
            throw new common_1.BadRequestException('Invalid listingMode.');
        }
        if (!Object.values(market_offer_type_enum_1.MarketOfferType).includes(input.offerType)) {
            throw new common_1.BadRequestException('Invalid offerType.');
        }
        if (!Number.isInteger(priceCredits) || priceCredits < 0) {
            throw new common_1.BadRequestException('priceCredits must be an integer >= 0.');
        }
        if (wantedCardId !== undefined &&
            (!Number.isInteger(wantedCardId) || wantedCardId < 1)) {
            throw new common_1.BadRequestException('wantedCardId must be an integer >= 1.');
        }
        if (!Number.isInteger(wantedCardQuantity) || wantedCardQuantity < 0) {
            throw new common_1.BadRequestException('wantedCardQuantity must be an integer >= 0.');
        }
        switch (input.offerType) {
            case market_offer_type_enum_1.MarketOfferType.CREDITS_ONLY:
                if (priceCredits < 1) {
                    throw new common_1.BadRequestException('CREDITS_ONLY listing requires priceCredits >= 1.');
                }
                if (wantedCardId !== undefined || wantedCardQuantity !== 0) {
                    throw new common_1.BadRequestException('CREDITS_ONLY listing cannot define wantedCardId or wantedCardQuantity.');
                }
                break;
            case market_offer_type_enum_1.MarketOfferType.CARD_ONLY:
                if (priceCredits !== 0) {
                    throw new common_1.BadRequestException('CARD_ONLY listing requires priceCredits = 0.');
                }
                if (wantedCardId === undefined || wantedCardQuantity < 1) {
                    throw new common_1.BadRequestException('CARD_ONLY listing requires wantedCardId and wantedCardQuantity >= 1.');
                }
                break;
            case market_offer_type_enum_1.MarketOfferType.CARD_AND_CREDITS:
                if (priceCredits < 1) {
                    throw new common_1.BadRequestException('CARD_AND_CREDITS listing requires priceCredits >= 1.');
                }
                if (wantedCardId === undefined || wantedCardQuantity < 1) {
                    throw new common_1.BadRequestException('CARD_AND_CREDITS listing requires wantedCardId and wantedCardQuantity >= 1.');
                }
                break;
        }
        return {
            ...input,
            quantity,
            priceCredits,
            wantedCardId,
            wantedCardQuantity,
        };
    }
    resolvePurchaseQuantity(listing, requestedQuantity) {
        if (listing.listingMode === market_listing_mode_enum_1.MarketListingMode.LOT) {
            if (requestedQuantity !== listing.remainingQuantity) {
                throw new common_1.BadRequestException(`LOT listings must be bought entirely. Required quantity: ${listing.remainingQuantity}.`);
            }
            return listing.remainingQuantity;
        }
        if (requestedQuantity > listing.remainingQuantity) {
            throw new common_1.BadRequestException(`Tu peux acheter au maximum ${listing.remainingQuantity} copie(s) sur cette annonce.`);
        }
        return requestedQuantity;
    }
    computeRequiredCredits(listing, purchaseQuantity) {
        if (listing.offerType === market_offer_type_enum_1.MarketOfferType.CARD_ONLY) {
            return 0;
        }
        if (listing.listingMode === market_listing_mode_enum_1.MarketListingMode.LOT) {
            return listing.priceCredits;
        }
        return listing.priceCredits * purchaseQuantity;
    }
    computeRequiredWantedCardQuantity(listing, purchaseQuantity) {
        if (listing.offerType === market_offer_type_enum_1.MarketOfferType.CREDITS_ONLY) {
            return 0;
        }
        if (listing.listingMode === market_listing_mode_enum_1.MarketListingMode.LOT) {
            return listing.wantedCardQuantity;
        }
        return listing.wantedCardQuantity * purchaseQuantity;
    }
    computeReferenceListedValue(unitMarketPrice, quantity, listingMode) {
        if (listingMode === market_listing_mode_enum_1.MarketListingMode.LOT) {
            return Math.max(1, unitMarketPrice * quantity);
        }
        return Math.max(1, unitMarketPrice);
    }
    computePurchasedReferenceValue(listing, purchaseQuantity) {
        if (listing.listingMode === market_listing_mode_enum_1.MarketListingMode.LOT) {
            return Math.max(1, listing.marketPriceSnapshot * listing.quantity);
        }
        return Math.max(1, listing.marketPriceSnapshot * purchaseQuantity);
    }
    computeReferenceRequestedValue(credits, wantedCardMarketPriceSnapshot, wantedCardQuantity) {
        return Math.max(0, Math.round(credits + wantedCardMarketPriceSnapshot * wantedCardQuantity));
    }
    applyListingFilters(qb, query) {
        if (query.search?.trim()) {
            qb.andWhere('LOWER(card.name) LIKE :search', {
                search: `%${query.search.trim().toLowerCase()}%`,
            });
        }
        if (query.rarity?.trim()) {
            qb.andWhere('card.rarity = :rarity', {
                rarity: query.rarity.trim(),
            });
        }
        if (query.season?.trim()) {
            qb.andWhere('card.season = :season', {
                season: query.season.trim(),
            });
        }
        if (query.listingMode) {
            qb.andWhere('listing.listingMode = :listingMode', {
                listingMode: query.listingMode,
            });
        }
        if (query.offerType) {
            qb.andWhere('listing.offerType = :offerType', {
                offerType: query.offerType,
            });
        }
        if (query.minPrice !== undefined) {
            qb.andWhere('listing.priceCredits >= :minPrice', {
                minPrice: query.minPrice,
            });
        }
        if (query.maxPrice !== undefined) {
            qb.andWhere('listing.priceCredits <= :maxPrice', {
                maxPrice: query.maxPrice,
            });
        }
    }
    mapListing(listing) {
        const referenceListedValue = listing.listingMode === market_listing_mode_enum_1.MarketListingMode.LOT
            ? listing.marketPriceSnapshot * listing.quantity
            : listing.marketPriceSnapshot;
        const referenceRequestedValue = listing.priceCredits +
            listing.wantedCardMarketPriceSnapshot * listing.wantedCardQuantity;
        const priceDifference = referenceRequestedValue - referenceListedValue;
        const priceDifferencePercent = referenceListedValue > 0
            ? Number(((priceDifference / referenceListedValue) * 100).toFixed(2))
            : null;
        return {
            id: listing.id,
            sellerId: listing.seller.id,
            sellerUsername: listing.seller.username,
            cardId: listing.card.id,
            cardKey: listing.card.key,
            cardName: listing.card.name,
            rarity: listing.card.rarity,
            season: listing.card.season,
            listingMode: listing.listingMode,
            offerType: listing.offerType,
            quantity: listing.quantity,
            remainingQuantity: listing.remainingQuantity,
            priceCredits: listing.priceCredits,
            wantedCardId: listing.wantedCard?.id ?? null,
            wantedCardKey: listing.wantedCard?.key ?? null,
            wantedCardName: listing.wantedCard?.name ?? null,
            wantedCardRarity: listing.wantedCard?.rarity ?? null,
            wantedCardQuantity: listing.wantedCardQuantity,
            marketPriceSnapshot: listing.marketPriceSnapshot,
            wantedCardMarketPriceSnapshot: listing.wantedCardMarketPriceSnapshot,
            referenceListedValue,
            referenceRequestedValue,
            priceDifference,
            priceDifferencePercent,
            pricePosition: priceDifferencePercent === null
                ? market_price_position_enum_1.MarketPricePosition.NOT_COMPARABLE
                : this.getMarketPricePosition(priceDifferencePercent),
            status: listing.status,
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
            closedAt: listing.closedAt,
        };
    }
    getMarketPricePosition(priceDifferencePercent) {
        if (priceDifferencePercent < -5) {
            return market_price_position_enum_1.MarketPricePosition.BELOW_MARKET;
        }
        if (priceDifferencePercent > 5) {
            return market_price_position_enum_1.MarketPricePosition.ABOVE_MARKET;
        }
        return market_price_position_enum_1.MarketPricePosition.AT_MARKET;
    }
    mapRecentSale(transaction) {
        const unitSaleValueCredits = transaction.totalPriceCredits > 0 && transaction.quantity > 0
            ? Math.round(transaction.totalPriceCredits / transaction.quantity)
            : null;
        return {
            id: transaction.id,
            listingId: transaction.listing.id,
            sellerId: transaction.seller.id,
            sellerUsername: transaction.seller.username,
            buyerId: transaction.buyer.id,
            buyerUsername: transaction.buyer.username,
            cardId: transaction.card.id,
            cardKey: transaction.card.key,
            cardName: transaction.card.name,
            rarity: transaction.card.rarity,
            listingMode: transaction.listingMode,
            offerType: transaction.offerType,
            quantity: transaction.quantity,
            unitPriceCredits: transaction.unitPriceCredits,
            totalPriceCredits: transaction.totalPriceCredits,
            unitSaleValueCredits,
            buyerOfferedCardId: transaction.buyerOfferedCard?.id ?? null,
            buyerOfferedCardKey: transaction.buyerOfferedCard?.key ?? null,
            buyerOfferedCardName: transaction.buyerOfferedCard?.name ?? null,
            buyerOfferedCardRarity: transaction.buyerOfferedCard?.rarity ?? null,
            buyerOfferedCardQuantity: transaction.buyerOfferedCardQuantity,
            transactionType: transaction.transactionType,
            sellerRewardClaimedAt: transaction.sellerRewardClaimedAt,
            sellerRewardClaimed: !!transaction.sellerRewardClaimedAt,
            pendingRewardCredits: 0,
            pendingRewardCardId: null,
            pendingRewardCardName: null,
            pendingRewardCardQuantity: 0,
            createdAt: transaction.createdAt,
        };
    }
    mapTransaction(transaction, currentUserId) {
        const role = transaction.buyer.id === currentUserId
            ? transaction.seller.id === currentUserId
                ? 'BOTH'
                : 'BUYER'
            : 'SELLER';
        return {
            id: transaction.id,
            listingId: transaction.listing.id,
            role,
            sellerId: transaction.seller.id,
            sellerUsername: transaction.seller.username,
            buyerId: transaction.buyer.id,
            buyerUsername: transaction.buyer.username,
            cardId: transaction.card.id,
            cardKey: transaction.card.key,
            cardName: transaction.card.name,
            rarity: transaction.card.rarity,
            listingMode: transaction.listingMode,
            offerType: transaction.offerType,
            quantity: transaction.quantity,
            unitPriceCredits: transaction.unitPriceCredits,
            totalPriceCredits: transaction.totalPriceCredits,
            buyerOfferedCardId: transaction.buyerOfferedCard?.id ?? null,
            buyerOfferedCardKey: transaction.buyerOfferedCard?.key ?? null,
            buyerOfferedCardName: transaction.buyerOfferedCard?.name ?? null,
            buyerOfferedCardRarity: transaction.buyerOfferedCard?.rarity ?? null,
            buyerOfferedCardQuantity: transaction.buyerOfferedCardQuantity,
            transactionType: transaction.transactionType,
            sellerRewardClaimedAt: transaction.sellerRewardClaimedAt,
            sellerRewardClaimed: !!transaction.sellerRewardClaimedAt,
            pendingRewardCredits: transaction.sellerRewardClaimedAt
                ? 0
                : transaction.totalPriceCredits,
            pendingRewardCardId: transaction.sellerRewardClaimedAt
                ? null
                : transaction.buyerOfferedCard?.id ?? null,
            pendingRewardCardName: transaction.sellerRewardClaimedAt
                ? null
                : transaction.buyerOfferedCard?.name ?? null,
            pendingRewardCardQuantity: transaction.sellerRewardClaimedAt
                ? 0
                : transaction.buyerOfferedCardQuantity,
            createdAt: transaction.createdAt,
        };
    }
    async snapshotCards(cardIds, sourceLabel) {
        const uniqueCardIds = Array.from(new Set(cardIds)).filter((value) => Number.isInteger(value) && value > 0);
        await Promise.all(uniqueCardIds.map(async (cardId) => {
            const pricing = await this.marketPricingService.getMarketPrice(cardId);
            await this.marketPriceHistoryService.recordSnapshot(cardId, pricing.finalPrice, sourceLabel);
        }));
    }
};
exports.MarketService = MarketService;
exports.MarketService = MarketService = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, typeorm_1.InjectRepository)(user_card_entity_1.UserCard)),
    __param(7, (0, typeorm_1.InjectRepository)(user_economy_entity_1.UserEconomy)),
    __param(8, (0, typeorm_1.InjectRepository)(card_entity_1.Card)),
    __param(9, (0, typeorm_1.InjectRepository)(market_listing_entity_1.MarketListing)),
    __param(10, (0, typeorm_1.InjectRepository)(market_transaction_entity_1.MarketTransaction)),
    __param(11, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        market_pricing_service_1.MarketPricingService,
        market_price_history_service_1.MarketPriceHistoryService,
        economy_analytics_service_1.EconomyAnalyticsService,
        push_service_1.PushService,
        anti_abuse_service_1.AntiAbuseService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MarketService);
//# sourceMappingURL=market.service.js.map