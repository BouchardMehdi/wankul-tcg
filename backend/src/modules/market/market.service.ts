import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import { UserCard } from '../users/user-card.entity';
import { UserEconomy } from '../economy/user-economy.entity';
import { Card } from '../cards/card.entity';
import { MarketPricingService } from './market-pricing.service';
import { MarketPriceHistoryService } from './market-price-history.service';
import { MARKET_KEEP_MIN_COPIES } from './constants/market-rarity-values';
import { MarketListing } from './market-listing.entity';
import { MarketTransaction } from './market-transaction.entity';
import { MarketListingStatus } from './market-listing-status.enum';
import { MarketTransactionType } from './market-transaction-type.enum';
import { ListMarketListingsQueryDto } from './dto/list-market-listings-query.dto';
import { MarketListingMode } from './market-listing-mode.enum';
import { MarketOfferType } from './market-offer-type.enum';
import { BuyListingDto } from './dto/buy-listing.dto';
import { MarketPricePosition } from './market-price-position.enum';
import { EconomyAnalyticsService } from '../economy/economy-analytics.service';
import { PushService } from '../push/push.service';
import { AntiAbuseService } from '../security/anti-abuse.service';

export interface QuickSellResult {
  success: true;
  cardId: number;
  cardKey: string;
  cardName: string;
  rarity: string;
  soldQuantity: number;
  marketPrice: number;
  quickSellRate: number;
  creditsEarned: number;
  remainingQuantity: number;
  keptQuantity: number;
  maxSellableQuantity: number;
  newCreditsBalance: number;
}

type CreateListingInput = {
  cardId: number;
  quantity: number;
  listingMode: MarketListingMode;
  offerType: MarketOfferType;
  priceCredits: number;
  wantedCardId?: number;
  wantedCardQuantity?: number;
};

@Injectable()
export class MarketService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly marketPricingService: MarketPricingService,
    private readonly marketPriceHistoryService: MarketPriceHistoryService,
    private readonly economyAnalyticsService: EconomyAnalyticsService,
    private readonly pushService: PushService,
    private readonly antiAbuseService: AntiAbuseService,

    @InjectRepository(UserCard)
    private readonly userCardsRepository: Repository<UserCard>,

    @InjectRepository(UserEconomy)
    private readonly userEconomyRepository: Repository<UserEconomy>,

    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,

    @InjectRepository(MarketListing)
    private readonly marketListingRepository: Repository<MarketListing>,

    @InjectRepository(MarketTransaction)
    private readonly marketTransactionRepository: Repository<MarketTransaction>,
  ) {}

  async getMarketPrice(cardId: number) {
    return this.marketPricingService.getMarketPrice(cardId);
  }

  async getMySellableCards(userId: number) {
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

    const results = await Promise.all(
      userCards.map(async (userCard) => {
        const totalQuantity = userCard.quantity;
        const quantityLocked = userCard.quantityLocked;
        const quantityAvailable = Math.max(0, totalQuantity - quantityLocked);
        const sellableQuantity = Math.max(
          0,
          totalQuantity - quantityLocked - MARKET_KEEP_MIN_COPIES,
        );

        if (sellableQuantity <= 0) {
          return null;
        }

        const pricing = await this.marketPricingService.getMarketPrice(
          userCard.card.id,
        );

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
          keptQuantity: MARKET_KEEP_MIN_COPIES,
          sellableQuantity,
          marketPrice: pricing.finalPrice,
          quickSellUnitPrice,
          quickSellTotalPrice: quickSellUnitPrice * sellableQuantity,
          canCreateUnitListing: sellableQuantity >= 1,
          canCreateLotListing: sellableQuantity >= 1,
        };
      }),
    );

    return results.filter(Boolean);
  }

  async quickSell(
    userId: number,
    cardId: number,
    quantity: number,
  ): Promise<QuickSellResult> {
    await this.antiAbuseService.assertRateLimit(userId, 'QUICK_SELL');

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        'Quantity must be an integer greater than or equal to 1.',
      );
    }

    const pricing = await this.marketPricingService.getMarketPrice(cardId);
    const unitCreditsEarned = pricing.quickSellUnitPrice;

    const result = await this.dataSource.transaction(async (manager) => {
      const userCardRepo = manager.getRepository(UserCard);
      const userEconomyRepo = manager.getRepository(UserEconomy);
      const cardRepo = manager.getRepository(Card);

      const userCard = await userCardRepo
        .createQueryBuilder('uc')
        .leftJoinAndSelect('uc.card', 'card')
        .leftJoinAndSelect('uc.user', 'user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .andWhere('card.id = :cardId', { cardId })
        .getOne();

      if (!userCard) {
        throw new NotFoundException(`User does not own card ${cardId}`);
      }

      const maxSellableQuantity = Math.max(
        0,
        userCard.quantity - userCard.quantityLocked - MARKET_KEEP_MIN_COPIES,
      );

      if (maxSellableQuantity <= 0) {
        throw new BadRequestException(
          'Quick sale is only available for duplicates. Keep at least one copy.',
        );
      }

      if (quantity > maxSellableQuantity) {
        throw new BadRequestException(
          `You can sell at most ${maxSellableQuantity} copie(s) of this card while keeping ${MARKET_KEEP_MIN_COPIES} reserve copie(s).`,
        );
      }

      const card = await cardRepo.findOne({
        where: { id: cardId },
      });

      if (!card) {
        throw new NotFoundException(`Card ${cardId} not found`);
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
        success: true as const,
        cardId: card.id,
        cardKey: card.key,
        cardName: card.name,
        rarity: card.rarity,
        soldQuantity: quantity,
        marketPrice: pricing.finalPrice,
        quickSellRate: pricing.quickSellRate,
        creditsEarned,
        remainingQuantity: userCard.quantity,
        keptQuantity: MARKET_KEEP_MIN_COPIES,
        maxSellableQuantity,
        newCreditsBalance: economy.credits,
      };
    });

    await this.economyAnalyticsService.addQuickSell(result.creditsEarned);
    await this.snapshotCards([cardId], 'quick_sell');
    await this.antiAbuseService.logAction({
      userId,
      action: 'QUICK_SELL',
      status: 'allowed',
      targetType: 'card',
      targetId: cardId,
      valueCredits: result.creditsEarned,
      metadata: {
        quantity,
        marketPrice: result.marketPrice,
        quickSellRate: result.quickSellRate,
        remainingQuantity: result.remainingQuantity,
      },
    });

    return result;
  }

  async createListing(userId: number, input: CreateListingInput) {
    await this.antiAbuseService.assertRateLimit(
      userId,
      'MARKET_LISTING_CREATE',
    );

    const normalized = this.normalizeCreateListingInput(input);

    const card = await this.cardsRepository.findOne({
      where: { id: normalized.cardId },
    });

    if (!card) {
      throw new NotFoundException(`Card ${normalized.cardId} not found`);
    }

    if (
      normalized.wantedCardId !== undefined &&
      normalized.wantedCardId === normalized.cardId
    ) {
      throw new BadRequestException(
        'wantedCardId cannot be the same as the sold card.',
      );
    }

    const soldCardPricing = await this.marketPricingService.getMarketPrice(
      normalized.cardId,
    );

    let wantedCard: Card | null = null;
    let wantedCardMarketPriceSnapshot = 0;

    if (normalized.wantedCardId !== undefined) {
      wantedCard = await this.cardsRepository.findOne({
        where: { id: normalized.wantedCardId },
      });

      if (!wantedCard) {
        throw new NotFoundException(
          `Wanted card ${normalized.wantedCardId} not found`,
        );
      }

      const wantedCardPricing = await this.marketPricingService.getMarketPrice(
        normalized.wantedCardId,
      );
      wantedCardMarketPriceSnapshot = wantedCardPricing.finalPrice;
    }

    const referenceListedValue = this.computeReferenceListedValue(
      soldCardPricing.finalPrice,
      normalized.quantity,
      normalized.listingMode,
    );
    const referenceRequestedValue = this.computeReferenceRequestedValue(
      normalized.priceCredits,
      wantedCardMarketPriceSnapshot,
      normalized.wantedCardQuantity ?? 0,
    );
    const priceDecision =
      await this.antiAbuseService.assertListingPriceGuard({
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
      const userCardRepo = manager.getRepository(UserCard);
      const listingRepo = manager.getRepository(MarketListing);

      const sellerCard = await userCardRepo
        .createQueryBuilder('uc')
        .leftJoinAndSelect('uc.user', 'user')
        .leftJoinAndSelect('uc.card', 'card')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .andWhere('card.id = :cardId', { cardId: normalized.cardId })
        .getOne();

      if (!sellerCard) {
        throw new NotFoundException(
          `User does not own card ${normalized.cardId}`,
        );
      }

      const availableToList = Math.max(
        0,
        sellerCard.quantity - sellerCard.quantityLocked - MARKET_KEEP_MIN_COPIES,
      );

      if (availableToList <= 0) {
        throw new BadRequestException(
          'You do not have enough available duplicates to create a listing.',
        );
      }

      if (normalized.quantity > availableToList) {
        throw new BadRequestException(
          `You can list at most ${availableToList} copie(s) of this card while keeping ${MARKET_KEEP_MIN_COPIES} reserve copie(s).`,
        );
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
        wantedCard: wantedCard ? ({ id: wantedCard.id } as Card) : null,
        wantedCardQuantity: normalized.wantedCardQuantity,
        wantedCardMarketPriceSnapshot,
        marketPriceSnapshot: soldCardPricing.finalPrice,
        status: MarketListingStatus.ACTIVE,
        closedAt: null,
      });

      const savedListing = await listingRepo.save(listing);

      const hydratedListing = await listingRepo.findOne({
        where: { id: savedListing.id },
        relations: ['seller', 'card', 'wantedCard'],
      });

      if (!hydratedListing) {
        throw new NotFoundException('Listing creation failed unexpectedly.');
      }

      return {
        success: true,
        listing: this.mapListing(hydratedListing),
        inventory: {
          totalQuantity: sellerCard.quantity,
          quantityLocked: sellerCard.quantityLocked,
          quantityAvailable: Math.max(
            0,
            sellerCard.quantity -
              sellerCard.quantityLocked -
              MARKET_KEEP_MIN_COPIES,
          ),
          keptQuantity: MARKET_KEEP_MIN_COPIES,
        },
      };
    });

    await this.snapshotCards(
      [normalized.cardId, normalized.wantedCardId].filter(
        (value): value is number => typeof value === 'number',
      ),
      'listing_created',
    );
    if (priceDecision.status === 'allowed') {
      await this.antiAbuseService.logAction({
        userId,
        action: 'MARKET_LISTING_CREATE',
        status: 'allowed',
        targetType: 'listing',
        targetId: result.listing.id,
        valueCredits: Math.round(referenceRequestedValue),
        metadata: {
          cardId: normalized.cardId,
          quantity: normalized.quantity,
          listingMode: normalized.listingMode,
          offerType: normalized.offerType,
          referenceListedValue,
          referenceRequestedValue,
          priceDecision,
        },
      });
    }

    return result;
  }

  async getActiveListings(query: ListMarketListingsQueryDto) {
    const qb = this.marketListingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.card', 'card')
      .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
      .where('listing.status = :status', { status: MarketListingStatus.ACTIVE });

    this.applyListingFilters(qb, query);

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = (query.sortOrder ?? 'DESC').toUpperCase() as 'ASC' | 'DESC';
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

  async getListingById(listingId: number) {
    const listing = await this.marketListingRepository.findOne({
      where: { id: listingId },
      relations: ['seller', 'card', 'wantedCard'],
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} not found`);
    }

    return this.mapListing(listing);
  }

  async getMyListings(userId: number) {
    const listings = await this.marketListingRepository.find({
      where: { seller: { id: userId } },
      relations: ['seller', 'card', 'wantedCard'],
      order: { createdAt: 'DESC' },
    });

    return listings.map((listing) => this.mapListing(listing));
  }

  async cancelListing(userId: number, listingId: number) {
    await this.antiAbuseService.assertRateLimit(
      userId,
      'MARKET_LISTING_CANCEL',
    );

    const result = await this.dataSource.transaction(async (manager) => {
      const listingRepo = manager.getRepository(MarketListing);
      const userCardRepo = manager.getRepository(UserCard);

      const listing = await listingRepo
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.seller', 'seller')
        .leftJoinAndSelect('listing.card', 'card')
        .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
        .setLock('pessimistic_write')
        .where('listing.id = :listingId', { listingId })
        .getOne();

      if (!listing) {
        throw new NotFoundException(`Listing ${listingId} not found`);
      }

      if (listing.seller.id !== userId) {
        throw new BadRequestException('You can only cancel your own listing.');
      }

      if (listing.status !== MarketListingStatus.ACTIVE) {
        throw new BadRequestException('Only active listings can be cancelled.');
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
        throw new NotFoundException(
          `Seller inventory for card ${listing.card.id} not found`,
        );
      }

      sellerCard.quantityLocked = Math.max(
        0,
        sellerCard.quantityLocked - unlockedQuantity,
      );
      listing.status = MarketListingStatus.CANCELLED;
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

    await this.snapshotCards(
      [result.cardId, result.wantedCardId].filter(
        (value): value is number => typeof value === 'number',
      ),
      'listing_cancelled',
    );
    await this.antiAbuseService.logAction({
      userId,
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

  async buyListing(userId: number, listingId: number, dto: BuyListingDto) {
    await this.antiAbuseService.assertRateLimit(userId, 'MARKET_BUY');

    if (!Number.isInteger(dto.quantity) || dto.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1.');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const listingRepo = manager.getRepository(MarketListing);
      const userCardRepo = manager.getRepository(UserCard);
      const userEconomyRepo = manager.getRepository(UserEconomy);
      const transactionRepo = manager.getRepository(MarketTransaction);

      const listing = await listingRepo
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.seller', 'seller')
        .leftJoinAndSelect('listing.card', 'card')
        .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
        .setLock('pessimistic_write')
        .where('listing.id = :listingId', { listingId })
        .getOne();

      if (!listing) {
        throw new NotFoundException(`Listing ${listingId} not found`);
      }

      if (listing.status !== MarketListingStatus.ACTIVE) {
        throw new BadRequestException('Listing is not active.');
      }

      if (listing.seller.id === userId) {
        throw new BadRequestException('You cannot buy your own listing.');
      }

      const purchaseQuantity = this.resolvePurchaseQuantity(
        listing,
        dto.quantity,
      );

      const requiredCredits = this.computeRequiredCredits(
        listing,
        purchaseQuantity,
      );
      const requiredWantedCardQuantity = this.computeRequiredWantedCardQuantity(
        listing,
        purchaseQuantity,
      );
      const referencePurchasedValue = this.computePurchasedReferenceValue(
        listing,
        purchaseQuantity,
      );
      const requestedPurchasedValue = this.computeReferenceRequestedValue(
        requiredCredits,
        listing.wantedCardMarketPriceSnapshot,
        requiredWantedCardQuantity,
      );

      const purchaseRiskDecision =
        await this.antiAbuseService.assertPurchaseRisk({
          buyerId: userId,
          sellerId: listing.seller.id,
          listingId: listing.id,
          cardId: listing.card.id,
          quantity: purchaseQuantity,
          referenceValue: referencePurchasedValue,
          requestedValue: requestedPurchasedValue,
          totalPriceCredits: requiredCredits,
        });

      let buyerOfferedCard: Card | null = null;
      let buyerPaymentCard: UserCard | null = null;

      if (
        listing.offerType === MarketOfferType.CARD_ONLY ||
        listing.offerType === MarketOfferType.CARD_AND_CREDITS
      ) {
        if (!listing.wantedCard) {
          throw new BadRequestException(
            'Listing is missing wantedCard configuration.',
          );
        }

        if (!dto.offeredCardId) {
          throw new BadRequestException(
            'offeredCardId is required for this listing type.',
          );
        }

        if (dto.offeredCardId !== listing.wantedCard.id) {
          throw new BadRequestException(
            `This listing requires card ${listing.wantedCard.id}.`,
          );
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
          throw new BadRequestException(
            'Buyer does not own the required exchange card.',
          );
        }

        const buyerAvailablePaymentCards =
          buyerPaymentCard.quantity - buyerPaymentCard.quantityLocked;

        if (buyerAvailablePaymentCards < requiredWantedCardQuantity) {
          throw new BadRequestException(
            `Buyer needs ${requiredWantedCardQuantity} available copie(s) of the required card.`,
          );
        }
      }

      let buyerEconomy: UserEconomy | null = null;
      let sellerEconomy: UserEconomy | null = null;

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
          throw new BadRequestException('Not enough credits to buy this listing.');
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
        throw new NotFoundException(
          `Seller inventory for card ${listing.card.id} not found`,
        );
      }

      if (sellerCard.quantityLocked < purchaseQuantity) {
        throw new BadRequestException(
          'Seller inventory is out of sync for this listing.',
        );
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
          user: { id: userId } as any,
          card: { id: listing.card.id } as any,
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
        listing.status = MarketListingStatus.SOLD;
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

      const transactionType =
        listing.offerType === MarketOfferType.CREDITS_ONLY
          ? MarketTransactionType.CREDITS_SALE
          : listing.offerType === MarketOfferType.CARD_ONLY
            ? MarketTransactionType.CARD_TRADE
            : MarketTransactionType.CARD_AND_CREDITS_TRADE;

      const transaction = transactionRepo.create({
        listing,
        seller: { id: listing.seller.id } as any,
        buyer: { id: userId } as any,
        card: { id: listing.card.id } as any,
        listingMode: listing.listingMode,
        offerType: listing.offerType,
        quantity: purchaseQuantity,
        unitPriceCredits:
          listing.listingMode === MarketListingMode.UNIT
            ? listing.priceCredits
            : 0,
        totalPriceCredits: requiredCredits,
        buyerOfferedCard: buyerOfferedCard
          ? ({ id: buyerOfferedCard.id } as any)
          : null,
        buyerOfferedCardQuantity: requiredWantedCardQuantity,
        transactionType,
        sellerRewardClaimedAt: null,
      });

      const savedTransaction = await transactionRepo.save(transaction);

      return {
        success: true,
        snapshotCardIds: [listing.card.id, buyerOfferedCard?.id ?? null].filter(
          (value): value is number => typeof value === 'number',
        ),
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
        action: 'MARKET_BUY',
        status: 'allowed',
        targetType: 'listing',
        targetId: listingId,
        valueCredits: result.settlement.creditsPaid,
        metadata: {
          transactionId: result.transaction.id,
          sellerId: result.transaction.sellerId,
          cardId: result.transaction.cardId,
          quantity: result.transaction.quantity,
          offerType: result.transaction.offerType,
          listingMode: result.transaction.listingMode,
          abuseDecision: result.abuseDecision,
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

  async claimTransactionReward(userId: number, transactionId: number) {
    await this.antiAbuseService.assertRateLimit(userId, 'MARKET_REWARD_CLAIM');

    const result = await this.dataSource.transaction(async (manager) => {
      const transactionRepo = manager.getRepository(MarketTransaction);
      const userEconomyRepo = manager.getRepository(UserEconomy);
      const userCardRepo = manager.getRepository(UserCard);

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
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }

      if (transaction.seller.id !== userId) {
        throw new BadRequestException(
          'You can only claim rewards for your own sales.',
        );
      }

      if (transaction.sellerRewardClaimedAt) {
        throw new BadRequestException('Reward already claimed for this sale.');
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

      let sellerRewardCardInventory: UserCard | null = null;

      if (
        transaction.buyerOfferedCard &&
        transaction.buyerOfferedCardQuantity > 0
      ) {
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
            user: { id: userId } as any,
            card: { id: transaction.buyerOfferedCard.id } as any,
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
        ].filter((value): value is number => typeof value === 'number'),
        transactionId: transaction.id,
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
      action: 'MARKET_REWARD_CLAIM',
      status: 'allowed',
      targetType: 'transaction',
      targetId: result.transactionId,
      valueCredits: result.rewards.credits,
      metadata: {
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

  async getMyTransactions(userId: number) {
    const transactions = await this.marketTransactionRepository.find({
      where: [{ buyer: { id: userId } }, { seller: { id: userId } }],
      relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
      order: { createdAt: 'DESC' },
    });

    return transactions.map((transaction) =>
      this.mapTransaction(transaction, userId),
    );
  }

  async getRecentSales(limit?: string) {
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

  async getMyPurchases(userId: number) {
    const transactions = await this.marketTransactionRepository.find({
      where: { buyer: { id: userId } },
      relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
      order: { createdAt: 'DESC' },
    });

    return transactions.map((transaction) =>
      this.mapTransaction(transaction, userId),
    );
  }

  async getMySales(userId: number) {
    const transactions = await this.marketTransactionRepository.find({
      where: { seller: { id: userId } },
      relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
      order: { createdAt: 'DESC' },
    });

    return transactions.map((transaction) =>
      this.mapTransaction(transaction, userId),
    );
  }

  private normalizeCreateListingInput(
    input: CreateListingInput,
  ): CreateListingInput {
    const quantity = Number(input.quantity);
    const priceCredits = Number(input.priceCredits);
    const wantedCardId =
      input.wantedCardId !== undefined ? Number(input.wantedCardId) : undefined;
    const wantedCardQuantity =
      input.wantedCardQuantity !== undefined
        ? Number(input.wantedCardQuantity)
        : 0;

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1.');
    }

    if (!Object.values(MarketListingMode).includes(input.listingMode)) {
      throw new BadRequestException('Invalid listingMode.');
    }

    if (!Object.values(MarketOfferType).includes(input.offerType)) {
      throw new BadRequestException('Invalid offerType.');
    }

    if (!Number.isInteger(priceCredits) || priceCredits < 0) {
      throw new BadRequestException('priceCredits must be an integer >= 0.');
    }

    if (
      wantedCardId !== undefined &&
      (!Number.isInteger(wantedCardId) || wantedCardId < 1)
    ) {
      throw new BadRequestException('wantedCardId must be an integer >= 1.');
    }

    if (!Number.isInteger(wantedCardQuantity) || wantedCardQuantity < 0) {
      throw new BadRequestException(
        'wantedCardQuantity must be an integer >= 0.',
      );
    }

    switch (input.offerType) {
      case MarketOfferType.CREDITS_ONLY:
        if (priceCredits < 1) {
          throw new BadRequestException(
            'CREDITS_ONLY listing requires priceCredits >= 1.',
          );
        }
        if (wantedCardId !== undefined || wantedCardQuantity !== 0) {
          throw new BadRequestException(
            'CREDITS_ONLY listing cannot define wantedCardId or wantedCardQuantity.',
          );
        }
        break;

      case MarketOfferType.CARD_ONLY:
        if (priceCredits !== 0) {
          throw new BadRequestException(
            'CARD_ONLY listing requires priceCredits = 0.',
          );
        }
        if (wantedCardId === undefined || wantedCardQuantity < 1) {
          throw new BadRequestException(
            'CARD_ONLY listing requires wantedCardId and wantedCardQuantity >= 1.',
          );
        }
        break;

      case MarketOfferType.CARD_AND_CREDITS:
        if (priceCredits < 1) {
          throw new BadRequestException(
            'CARD_AND_CREDITS listing requires priceCredits >= 1.',
          );
        }
        if (wantedCardId === undefined || wantedCardQuantity < 1) {
          throw new BadRequestException(
            'CARD_AND_CREDITS listing requires wantedCardId and wantedCardQuantity >= 1.',
          );
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

  private resolvePurchaseQuantity(
    listing: MarketListing,
    requestedQuantity: number,
  ): number {
    if (listing.listingMode === MarketListingMode.LOT) {
      if (requestedQuantity !== listing.remainingQuantity) {
        throw new BadRequestException(
          `LOT listings must be bought entirely. Required quantity: ${listing.remainingQuantity}.`,
        );
      }
      return listing.remainingQuantity;
    }

    if (requestedQuantity > listing.remainingQuantity) {
      throw new BadRequestException(
        `You can buy at most ${listing.remainingQuantity} copie(s) from this listing.`,
      );
    }

    return requestedQuantity;
  }

  private computeRequiredCredits(
    listing: MarketListing,
    purchaseQuantity: number,
  ): number {
    if (listing.offerType === MarketOfferType.CARD_ONLY) {
      return 0;
    }

    if (listing.listingMode === MarketListingMode.LOT) {
      return listing.priceCredits;
    }

    return listing.priceCredits * purchaseQuantity;
  }

  private computeRequiredWantedCardQuantity(
    listing: MarketListing,
    purchaseQuantity: number,
  ): number {
    if (listing.offerType === MarketOfferType.CREDITS_ONLY) {
      return 0;
    }

    if (listing.listingMode === MarketListingMode.LOT) {
      return listing.wantedCardQuantity;
    }

    return listing.wantedCardQuantity * purchaseQuantity;
  }

  private computeReferenceListedValue(
    unitMarketPrice: number,
    quantity: number,
    listingMode: MarketListingMode,
  ) {
    if (listingMode === MarketListingMode.LOT) {
      return Math.max(1, unitMarketPrice * quantity);
    }

    return Math.max(1, unitMarketPrice);
  }

  private computePurchasedReferenceValue(
    listing: MarketListing,
    purchaseQuantity: number,
  ) {
    if (listing.listingMode === MarketListingMode.LOT) {
      return Math.max(1, listing.marketPriceSnapshot * listing.quantity);
    }

    return Math.max(1, listing.marketPriceSnapshot * purchaseQuantity);
  }

  private computeReferenceRequestedValue(
    credits: number,
    wantedCardMarketPriceSnapshot: number,
    wantedCardQuantity: number,
  ) {
    return Math.max(
      0,
      Math.round(
        credits + wantedCardMarketPriceSnapshot * wantedCardQuantity,
      ),
    );
  }

  private applyListingFilters(
    qb: SelectQueryBuilder<MarketListing>,
    query: ListMarketListingsQueryDto,
  ) {
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

  private mapListing(listing: MarketListing) {
    const referenceListedValue =
      listing.listingMode === MarketListingMode.LOT
        ? listing.marketPriceSnapshot * listing.quantity
        : listing.marketPriceSnapshot;

    const referenceRequestedValue =
      listing.priceCredits +
      listing.wantedCardMarketPriceSnapshot * listing.wantedCardQuantity;

    const priceDifference = referenceRequestedValue - referenceListedValue;
    const priceDifferencePercent =
      referenceListedValue > 0
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
      pricePosition:
        priceDifferencePercent === null
          ? MarketPricePosition.NOT_COMPARABLE
          : this.getMarketPricePosition(priceDifferencePercent),
      status: listing.status,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      closedAt: listing.closedAt,
    };
  }

  private getMarketPricePosition(
    priceDifferencePercent: number,
  ): MarketPricePosition {
    if (priceDifferencePercent < -5) {
      return MarketPricePosition.BELOW_MARKET;
    }

    if (priceDifferencePercent > 5) {
      return MarketPricePosition.ABOVE_MARKET;
    }

    return MarketPricePosition.AT_MARKET;
  }

  private mapRecentSale(transaction: MarketTransaction) {
    const unitSaleValueCredits =
      transaction.totalPriceCredits > 0 && transaction.quantity > 0
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

  private mapTransaction(transaction: MarketTransaction, currentUserId: number) {
    const role =
      transaction.buyer.id === currentUserId
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

  private async snapshotCards(cardIds: number[], sourceLabel: string) {
    const uniqueCardIds = Array.from(new Set(cardIds)).filter(
      (value) => Number.isInteger(value) && value > 0,
    );

    await Promise.all(
      uniqueCardIds.map(async (cardId) => {
        const pricing = await this.marketPricingService.getMarketPrice(cardId);
        await this.marketPriceHistoryService.recordSnapshot(
          cardId,
          pricing.finalPrice,
          sourceLabel,
        );
      }),
    );
  }
}
