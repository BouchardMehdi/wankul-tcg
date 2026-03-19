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
import {
  MARKET_KEEP_MIN_COPIES,
  QUICK_SELL_RATE,
} from './constants/market-rarity-values';
import { MarketListing } from './market-listing.entity';
import { MarketTransaction } from './market-transaction.entity';
import { MarketListingStatus } from './market-listing-status.enum';
import { MarketTransactionType } from './market-transaction-type.enum';
import { ListMarketListingsQueryDto } from './dto/list-market-listings-query.dto';
import { MarketListingMode } from './market-listing-mode.enum';
import { MarketOfferType } from './market-offer-type.enum';
import { BuyListingDto } from './dto/buy-listing.dto';
import { MarketPricePosition } from './market-price-position.enum';

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

        const quickSellUnitPrice = Math.max(
          1,
          Math.round(pricing.finalPrice * QUICK_SELL_RATE),
        );

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
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        'Quantity must be an integer greater than or equal to 1.',
      );
    }

    const pricing = await this.marketPricingService.getMarketPrice(cardId);
    const unitCreditsEarned = Math.max(
      1,
      Math.round(pricing.finalPrice * QUICK_SELL_RATE),
    );

    return this.dataSource.transaction(async (manager) => {
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
        success: true,
        cardId: card.id,
        cardKey: card.key,
        cardName: card.name,
        rarity: card.rarity,
        soldQuantity: quantity,
        marketPrice: pricing.finalPrice,
        quickSellRate: QUICK_SELL_RATE,
        creditsEarned,
        remainingQuantity: userCard.quantity,
        keptQuantity: MARKET_KEEP_MIN_COPIES,
        maxSellableQuantity,
        newCreditsBalance: economy.credits,
      };
    });
  }

  async createListing(userId: number, input: CreateListingInput) {
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

    return this.dataSource.transaction(async (manager) => {
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
    return this.dataSource.transaction(async (manager) => {
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
        status: listing.status,
        unlockedQuantity,
        closedAt: listing.closedAt,
      };
    });
  }

  async buyListing(userId: number, listingId: number, dto: BuyListingDto) {
    if (!Number.isInteger(dto.quantity) || dto.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1.');
    }

    return this.dataSource.transaction(async (manager) => {
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

      const purchaseQuantity = this.resolvePurchaseQuantity(listing, dto.quantity);

      const requiredCredits = this.computeRequiredCredits(
        listing,
        purchaseQuantity,
      );
      const requiredWantedCardQuantity = this.computeRequiredWantedCardQuantity(
        listing,
        purchaseQuantity,
      );

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

      let sellerWantedCardInventory: UserCard | null = null;

      if (buyerOfferedCard && requiredWantedCardQuantity > 0) {
        sellerWantedCardInventory = await userCardRepo
          .createQueryBuilder('uc')
          .leftJoinAndSelect('uc.user', 'user')
          .leftJoinAndSelect('uc.card', 'card')
          .setLock('pessimistic_write')
          .where('user.id = :sellerId', { sellerId: listing.seller.id })
          .andWhere('card.id = :cardId', { cardId: buyerOfferedCard.id })
          .getOne();

        if (!sellerWantedCardInventory) {
          sellerWantedCardInventory = userCardRepo.create({
            user: { id: listing.seller.id } as any,
            card: { id: buyerOfferedCard.id } as any,
            quantity: 0,
            quantityLocked: 0,
          });
        }
      }

      sellerCard.quantityLocked -= purchaseQuantity;
      sellerCard.quantity -= purchaseQuantity;
      buyerReceivedCard.quantity += purchaseQuantity;

      if (buyerPaymentCard && requiredWantedCardQuantity > 0) {
        buyerPaymentCard.quantity -= requiredWantedCardQuantity;
      }

      if (sellerWantedCardInventory && requiredWantedCardQuantity > 0) {
        sellerWantedCardInventory.quantity += requiredWantedCardQuantity;
      }

      if (buyerEconomy && sellerEconomy && requiredCredits > 0) {
        buyerEconomy.credits -= requiredCredits;
        sellerEconomy.credits += requiredCredits;
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

      if (sellerWantedCardInventory) {
        await userCardRepo.save(sellerWantedCardInventory);
      }

      if (buyerEconomy && sellerEconomy) {
        await userEconomyRepo.save(buyerEconomy);
        await userEconomyRepo.save(sellerEconomy);
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
      });

      const savedTransaction = await transactionRepo.save(transaction);

      return {
        success: true,
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
        },
        transaction: {
          id: savedTransaction.id,
          listingId: listing.id,
          sellerId: listing.seller.id,
          buyerId: userId,
          cardId: listing.card.id,
          listingMode: savedTransaction.listingMode,
          offerType: savedTransaction.offerType,
          quantity: purchaseQuantity,
          totalPriceCredits: requiredCredits,
          buyerOfferedCardId: buyerOfferedCard?.id ?? null,
          buyerOfferedCardQuantity: requiredWantedCardQuantity,
          transactionType: savedTransaction.transactionType,
          createdAt: savedTransaction.createdAt,
        },
        balances:
          buyerEconomy && sellerEconomy
            ? {
                buyerCredits: buyerEconomy.credits,
                sellerCredits: sellerEconomy.credits,
              }
            : null,
      };
    });
  }

  async getMyTransactions(userId: number) {
    const transactions = await this.marketTransactionRepository.find({
      where: [{ buyer: { id: userId } }, { seller: { id: userId } }],
      relations: [
        'listing',
        'seller',
        'buyer',
        'card',
        'buyerOfferedCard',
      ],
      order: { createdAt: 'DESC' },
    });

    return transactions.map((transaction) =>
      this.mapTransaction(transaction, userId),
    );
  }

  async getMyPurchases(userId: number) {
    const transactions = await this.marketTransactionRepository.find({
      where: { buyer: { id: userId } },
      relations: [
        'listing',
        'seller',
        'buyer',
        'card',
        'buyerOfferedCard',
      ],
      order: { createdAt: 'DESC' },
    });

    return transactions.map((transaction) =>
      this.mapTransaction(transaction, userId),
    );
  }

  async getMySales(userId: number) {
    const transactions = await this.marketTransactionRepository.find({
      where: { seller: { id: userId } },
      relations: [
        'listing',
        'seller',
        'buyer',
        'card',
        'buyerOfferedCard',
      ],
      order: { createdAt: 'DESC' },
    });

    return transactions.map((transaction) =>
      this.mapTransaction(transaction, userId),
    );
  }

  private normalizeCreateListingInput(input: CreateListingInput): CreateListingInput {
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
      createdAt: transaction.createdAt,
    };
  }
}