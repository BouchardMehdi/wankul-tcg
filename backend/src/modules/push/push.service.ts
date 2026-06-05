import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { createHash } from 'crypto';

import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { User } from '../users/user.entity';
import { UserEconomy } from '../economy/user-economy.entity';
import { ECONOMY_RULES } from '../economy/economy.constants';
import { applyEconomyRecharge } from '../economy/economy.utils';
import { PushNotificationPreferenceEntity } from './push-preference.entity';
import { UpdatePushPreferencesDto } from './dto/update-push-preferences.dto';
import { UpsertWatchlistItemDto } from './dto/upsert-watchlist-item.dto';
import { PushWatchlistEntity } from './push-watchlist.entity';
import { PushDeliveryLogEntity } from './push-delivery-log.entity';
import { Card } from '../cards/card.entity';
import { MarketPricingService } from '../market/market-pricing.service';
import { MarketListing } from '../market/market-listing.entity';
import { MarketListingStatus } from '../market/market-listing-status.enum';
import { MarketTransaction } from '../market/market-transaction.entity';
import { EconomyDailyStats } from '../economy/economy-daily-stats.entity';

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  kind: string;
  accent: string;
  icon?: string;
  badge?: string;
  image?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{
    action: string;
    title: string;
    url?: string;
  }>;
};

type PushPreferencesResponse = {
  saleRewardEnabled: boolean;
  freeOpeningsReadyEnabled: boolean;
  freeOpeningsSoonEnabled: boolean;
  freeOpeningsSoonMinutes: number;
  watchlistPriceAlertEnabled: boolean;
  staleListingAlertEnabled: boolean;
  staleListingHours: number;
  dailyMarketRecapEnabled: boolean;
};

type WatchlistListingCandidate = {
  listing: MarketListing;
  requestedValue: number;
  referenceMarketValue: number;
  differencePercent: number | null;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;
  private readonly pushEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly marketPricingService: MarketPricingService,

    @InjectRepository(PushSubscriptionEntity)
    private readonly pushSubscriptionRepository: Repository<PushSubscriptionEntity>,

    @InjectRepository(PushDeliveryLogEntity)
    private readonly pushDeliveryLogRepository: Repository<PushDeliveryLogEntity>,

    @InjectRepository(UserEconomy)
    private readonly userEconomyRepository: Repository<UserEconomy>,

    @InjectRepository(PushNotificationPreferenceEntity)
    private readonly pushPreferenceRepository: Repository<PushNotificationPreferenceEntity>,

    @InjectRepository(PushWatchlistEntity)
    private readonly pushWatchlistRepository: Repository<PushWatchlistEntity>,

    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,

    @InjectRepository(MarketListing)
    private readonly marketListingRepository: Repository<MarketListing>,

    @InjectRepository(MarketTransaction)
    private readonly marketTransactionRepository: Repository<MarketTransaction>,

    @InjectRepository(EconomyDailyStats)
    private readonly economyDailyStatsRepository: Repository<EconomyDailyStats>,
  ) {
    this.vapidPublicKey =
      this.configService.get<string>('PUSH_VAPID_PUBLIC_KEY')?.trim() ?? '';
    this.vapidPrivateKey =
      this.configService.get<string>('PUSH_VAPID_PRIVATE_KEY')?.trim() ?? '';

    const vapidSubject =
      this.configService.get<string>('PUSH_VAPID_SUBJECT')?.trim() ||
      'mailto:noreply@wankultcg.local';

    this.pushEnabled = !!(this.vapidPublicKey && this.vapidPrivateKey);

    if (this.pushEnabled) {
      webpush.setVapidDetails(
        vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      );
    } else {
      this.logger.warn(
        'Push notifications are disabled because PUSH_VAPID_PUBLIC_KEY / PUSH_VAPID_PRIVATE_KEY are missing.',
      );
    }
  }

  getPublicConfig() {
    return {
      enabled: this.pushEnabled,
      publicKey: this.pushEnabled ? this.vapidPublicKey : null,
    };
  }

  async getPreferences(userId: number): Promise<PushPreferencesResponse> {
    const preferences = await this.ensurePreferences(userId);
    return this.mapPreferences(preferences);
  }

  async updatePreferences(
    userId: number,
    dto: UpdatePushPreferencesDto,
  ): Promise<PushPreferencesResponse> {
    const preferences = await this.ensurePreferences(userId);

    if (dto.saleRewardEnabled !== undefined) {
      preferences.saleRewardEnabled = dto.saleRewardEnabled;
    }
    if (dto.freeOpeningsReadyEnabled !== undefined) {
      preferences.freeOpeningsReadyEnabled = dto.freeOpeningsReadyEnabled;
    }
    if (dto.freeOpeningsSoonEnabled !== undefined) {
      preferences.freeOpeningsSoonEnabled = dto.freeOpeningsSoonEnabled;
    }
    if (dto.freeOpeningsSoonMinutes !== undefined) {
      preferences.freeOpeningsSoonMinutes = dto.freeOpeningsSoonMinutes;
    }
    if (dto.watchlistPriceAlertEnabled !== undefined) {
      preferences.watchlistPriceAlertEnabled = dto.watchlistPriceAlertEnabled;
    }
    if (dto.staleListingAlertEnabled !== undefined) {
      preferences.staleListingAlertEnabled = dto.staleListingAlertEnabled;
    }
    if (dto.staleListingHours !== undefined) {
      preferences.staleListingHours = dto.staleListingHours;
    }
    if (dto.dailyMarketRecapEnabled !== undefined) {
      preferences.dailyMarketRecapEnabled = dto.dailyMarketRecapEnabled;
    }

    await this.pushPreferenceRepository.save(preferences);
    return this.mapPreferences(preferences);
  }

  async getWatchlist(userId: number) {
    const items = await this.pushWatchlistRepository.find({
      where: { user: { id: userId } },
      relations: ['card', 'user'],
      order: { createdAt: 'DESC' },
    });

    const pricingEntries = await Promise.all(
      items.map(async (item) => [
        item.card.id,
        await this.marketPricingService.getMarketPrice(item.card.id),
      ] as const),
    );

    const pricingByCardId = new Map(pricingEntries);
    return items.map((item) =>
      this.mapWatchlistItem(item, pricingByCardId.get(item.card.id)?.finalPrice ?? null),
    );
  }

  async getWatchlistItem(userId: number, cardId: number) {
    const item = await this.pushWatchlistRepository.findOne({
      where: { user: { id: userId }, card: { id: cardId } },
      relations: ['card', 'user'],
    });

    if (!item) {
      return null;
    }

    const pricing = await this.marketPricingService.getMarketPrice(cardId);
    return this.mapWatchlistItem(item, pricing.finalPrice);
  }

  async upsertWatchlistItem(
    userId: number,
    cardId: number,
    dto: UpsertWatchlistItemDto,
  ) {
    const card = await this.cardRepository.findOne({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    const existing = await this.pushWatchlistRepository.findOne({
      where: { user: { id: userId }, card: { id: cardId } },
      relations: ['card', 'user'],
    });

    const item =
      existing ??
      this.pushWatchlistRepository.create({
        user: { id: userId } as User,
        card: { id: cardId } as Card,
      });

    item.user = { id: userId } as User;
    item.card = { id: cardId } as Card;
    item.targetPriceCredits = dto.targetPriceCredits;
    item.marketListingAlertEnabled =
      dto.marketListingAlertEnabled ?? item.marketListingAlertEnabled ?? true;
    item.marketDealAlertEnabled =
      dto.marketDealAlertEnabled ?? item.marketDealAlertEnabled ?? true;
    item.marketDealThresholdPercent =
      dto.marketDealThresholdPercent ?? item.marketDealThresholdPercent ?? 15;
    item.targetReachedNotified = false;

    await this.pushWatchlistRepository.save(item);
    return this.getWatchlistItem(userId, cardId);
  }

  async deleteWatchlistItem(userId: number, cardId: number) {
    const result = await this.pushWatchlistRepository.delete({
      user: { id: userId },
      card: { id: cardId },
    });

    return {
      success: true,
      removed: result.affected ?? 0,
    };
  }

  async saveSubscription(
    userId: number,
    dto: CreatePushSubscriptionDto,
    userAgent?: string,
  ) {
    this.assertPushEnabled();
    const endpointHash = this.hashEndpoint(dto.endpoint);

    const existing = await this.pushSubscriptionRepository.findOne({
      where: { endpointHash },
      relations: ['user'],
    });

    const entity =
      existing ??
      this.pushSubscriptionRepository.create({
        endpoint: dto.endpoint,
      });

    entity.user = { id: userId } as User;
    entity.endpoint = dto.endpoint;
    entity.endpointHash = endpointHash;
    entity.p256dhKey = dto.keys.p256dh;
    entity.authKey = dto.keys.auth;
    entity.expirationTime =
      dto.expirationTime === null || dto.expirationTime === undefined
        ? null
        : String(dto.expirationTime);
    entity.userAgent = userAgent?.slice(0, 500) ?? null;

    await this.pushSubscriptionRepository.save(entity);
    await this.ensurePreferences(userId);

    return {
      success: true,
      subscriptionId: entity.id,
    };
  }

  async deleteSubscription(userId: number, endpoint?: string) {
    const qb = this.pushSubscriptionRepository
      .createQueryBuilder()
      .delete()
      .from(PushSubscriptionEntity)
      .where('user_id = :userId', { userId });

    if (endpoint) {
      qb.andWhere('endpoint_hash = :endpointHash', {
        endpointHash: this.hashEndpoint(endpoint),
      });
    }

    const result = await qb.execute();

    return {
      success: true,
      removed: result.affected ?? 0,
    };
  }

  async notifySaleRewardAvailable(args: {
    sellerId: number;
    transactionId: number;
    soldCardName: string;
    rewardCredits: number;
    rewardCardName: string | null;
    rewardCardQuantity: number;
  }) {
    if (!this.pushEnabled) {
      return { delivered: 0 };
    }

    const preferences = await this.ensurePreferences(args.sellerId);
    if (!preferences.saleRewardEnabled) {
      return { delivered: 0 };
    }

    const rewardParts: string[] = [];

    if (args.rewardCredits > 0) {
      rewardParts.push(`${args.rewardCredits} WunkulCoins`);
    }

    if (args.rewardCardQuantity > 0 && args.rewardCardName) {
      rewardParts.push(`${args.rewardCardQuantity}x ${args.rewardCardName}`);
    }

    const rewardLabel =
      rewardParts.length > 0 ? rewardParts.join(' + ') : 'ta récompense';

    return this.sendToUser(args.sellerId, {
      title: 'Ta vente a fait mouche',
      body: `${args.soldCardName} a trouvé preneur. Passe sur le market pour récupérer ${rewardLabel}.`,
      url: '/market',
      tag: `market-reward-${args.transactionId}`,
      kind: 'market-reward',
      accent: 'gold',
      requireInteraction: true,
      vibrate: [120, 60, 120],
      actions: [
        { action: 'open-market', title: 'Recuperer', url: '/market' },
        { action: 'dismiss', title: 'Plus tard' },
      ],
    });
  }

  async processFreeOpeningsReadyNotifications() {
    if (!this.pushEnabled) return;

    const userIds = await this.getSubscribedUserIds();
    const now = new Date();

    for (const userId of userIds) {
      const preferences = await this.ensurePreferences(userId);
      if (!preferences.freeOpeningsReadyEnabled) {
        continue;
      }

      const economy = await this.getOrCreateEconomy(userId, now);
      applyEconomyRecharge(economy, now);
      await this.userEconomyRepository.save(economy);

      const hasFreeOpenings =
        economy.freeBoosterCharges > 0 || economy.freeDisplayCharges > 0;

      if (!hasFreeOpenings) {
        continue;
      }

      if (
        economy.lastFreeOpeningsPushAt &&
        now.getTime() - economy.lastFreeOpeningsPushAt.getTime() <
          24 * 60 * 60 * 1000
      ) {
        continue;
      }

      const availableParts = this.getAvailableOpeningsParts(economy);
      const result = await this.sendToUser(userId, {
        title: 'Tes ouvertures sont servies',
        body: `${availableParts.join(' et ')} t'attendent. C'est le moment de relancer la collection.`,
        url: '/booster',
        tag: `free-openings-${userId}`,
        kind: 'free-openings-ready',
        accent: 'cyan',
        vibrate: [100, 40, 80],
        actions: [
          { action: 'open-booster', title: 'Entrer', url: '/booster' },
          { action: 'dismiss', title: 'Plus tard' },
        ],
      });

      if (result.delivered > 0) {
        economy.lastFreeOpeningsPushAt = now;
        await this.userEconomyRepository.save(economy);
      }
    }
  }

  async processFreeOpeningsSoonNotifications() {
    if (!this.pushEnabled) return;

    const userIds = await this.getSubscribedUserIds();
    const now = new Date();

    for (const userId of userIds) {
      const preferences = await this.ensurePreferences(userId);
      if (!preferences.freeOpeningsSoonEnabled) {
        continue;
      }

      const economy = await this.getOrCreateEconomy(userId, now);
      applyEconomyRecharge(economy, now);
      await this.userEconomyRepository.save(economy);

      const thresholdMs = preferences.freeOpeningsSoonMinutes * 60 * 1000;

      const nextBoosterAt = this.getNextRechargeAt(economy, 'booster');
      if (
        nextBoosterAt &&
        economy.freeBoosterCharges === 0 &&
        nextBoosterAt.getTime() > now.getTime() &&
        nextBoosterAt.getTime() - now.getTime() <= thresholdMs &&
        !this.sameDateTime(
          economy.lastFreeBoosterSoonPushForAt,
          nextBoosterAt,
        )
      ) {
        const result = await this.sendToUser(userId, {
          title: 'Un booster revient bientot',
          body: `Encore un peu de patience: un booster gratuit sera de nouveau disponible dans moins de ${preferences.freeOpeningsSoonMinutes} minutes.`,
          url: '/booster',
          tag: `free-booster-soon-${userId}`,
          kind: 'free-openings-soon',
          accent: 'violet',
          vibrate: [80, 40, 60],
          actions: [
            { action: 'open-booster', title: 'Voir le timer', url: '/booster' },
            { action: 'dismiss', title: 'Fermer' },
          ],
        });

        if (result.delivered > 0) {
          economy.lastFreeBoosterSoonPushForAt = nextBoosterAt;
          await this.userEconomyRepository.save(economy);
        }
      }

      const nextDisplayAt = this.getNextRechargeAt(economy, 'display');
      if (
        nextDisplayAt &&
        economy.freeDisplayCharges === 0 &&
        nextDisplayAt.getTime() > now.getTime() &&
        nextDisplayAt.getTime() - now.getTime() <= thresholdMs &&
        !this.sameDateTime(
          economy.lastFreeDisplaySoonPushForAt,
          nextDisplayAt,
        )
      ) {
        const result = await this.sendToUser(userId, {
          title: 'Une display revient bientot',
          body: `Encore un peu de patience: une display gratuite sera de nouveau disponible dans moins de ${preferences.freeOpeningsSoonMinutes} minutes.`,
          url: '/booster',
          tag: `free-display-soon-${userId}`,
          kind: 'free-openings-soon',
          accent: 'violet',
          vibrate: [80, 40, 60],
          actions: [
            { action: 'open-booster', title: 'Voir le timer', url: '/booster' },
            { action: 'dismiss', title: 'Fermer' },
          ],
        });

        if (result.delivered > 0) {
          economy.lastFreeDisplaySoonPushForAt = nextDisplayAt;
          await this.userEconomyRepository.save(economy);
        }
      }
    }
  }

  async processWatchlistPriceAlerts() {
    if (!this.pushEnabled) return;

    const items = await this.pushWatchlistRepository.find({
      relations: ['card', 'user'],
    });

    if (!items.length) {
      return;
    }

    const pricingEntries = await Promise.all(
      Array.from(new Set(items.map((item) => item.card.id))).map(
        async (cardId) => [
          cardId,
          await this.marketPricingService.getMarketPrice(cardId),
        ] as const,
      ),
    );
    const pricingByCardId = new Map(pricingEntries);

    for (const item of items) {
      const preferences = await this.ensurePreferences(item.user.id);
      if (!preferences.watchlistPriceAlertEnabled) {
        continue;
      }

      const currentPrice =
        pricingByCardId.get(item.card.id)?.finalPrice ?? null;
      if (currentPrice === null) {
        continue;
      }

      if (currentPrice <= item.targetPriceCredits && !item.targetReachedNotified) {
        const result = await this.sendToUser(item.user.id, {
          title: 'Ta cible passe sous le seuil',
          body: `${item.card.name} descend à ${currentPrice} WunkulCoins, sous ton objectif de ${item.targetPriceCredits}.`,
          url: `/collection/card/${item.card.id}`,
          tag: `watchlist-${item.id}`,
          kind: 'watchlist-price',
          accent: 'violet',
          requireInteraction: true,
          vibrate: [110, 50, 110],
          actions: [
            {
              action: 'open-card',
              title: 'Voir la cible',
              url: `/collection/card/${item.card.id}`,
            },
            { action: 'dismiss', title: 'Plus tard' },
          ],
        });

        if (result.delivered > 0) {
          item.targetReachedNotified = true;
          item.lastTriggeredAt = new Date();
          item.lastTriggeredPrice = currentPrice;
          await this.pushWatchlistRepository.save(item);
        }
        continue;
      }

      if (currentPrice > item.targetPriceCredits && item.targetReachedNotified) {
        item.targetReachedNotified = false;
        await this.pushWatchlistRepository.save(item);
      }
    }
  }

  async processWatchlistListingAlerts() {
    if (!this.pushEnabled) return;

    const items = await this.pushWatchlistRepository.find({
      relations: ['card', 'user'],
    });

    if (!items.length) {
      return;
    }

    const watchedCardIds = Array.from(new Set(items.map((item) => item.card.id)));
    const activeListings = await this.marketListingRepository.find({
      where: { status: MarketListingStatus.ACTIVE },
      relations: ['seller', 'card', 'wantedCard'],
      order: { createdAt: 'DESC' },
    });

    const relevantListings = activeListings.filter((listing) =>
      watchedCardIds.includes(listing.card.id),
    );

    if (!relevantListings.length) {
      return;
    }

    const pricingCardIds = Array.from(
      new Set(
        relevantListings.flatMap((listing) => [
          listing.card.id,
          listing.wantedCard?.id ?? null,
        ]),
      ),
    ).filter(
      (value): value is number =>
        value !== null && Number.isInteger(value) && value > 0,
    );

    const pricingEntries = await Promise.all(
      pricingCardIds.map(
        async (cardId) =>
          [cardId, await this.marketPricingService.getMarketPrice(cardId)] as const,
      ),
    );
    const pricingByCardId = new Map(pricingEntries);

    for (const item of items) {
      const preferences = await this.ensurePreferences(item.user.id);
      if (!preferences.watchlistPriceAlertEnabled) {
        continue;
      }

      const candidates = relevantListings
        .filter(
          (listing) =>
            listing.card.id === item.card.id && listing.seller.id !== item.user.id,
        )
        .map((listing) =>
          this.buildWatchlistListingCandidate(listing, pricingByCardId),
        );

      if (!candidates.length) {
        continue;
      }

      const dealCandidate = (item.marketDealAlertEnabled ?? true)
        ? [...candidates]
            .filter(
              (candidate) =>
                candidate.differencePercent !== null &&
                candidate.differencePercent <=
                  -Math.abs(item.marketDealThresholdPercent ?? 15) &&
                candidate.listing.id !== item.lastDealNotifiedId,
            )
            .sort((a, b) => {
              if ((a.differencePercent ?? 0) !== (b.differencePercent ?? 0)) {
                return (a.differencePercent ?? 0) - (b.differencePercent ?? 0);
              }
              return a.requestedValue - b.requestedValue;
            })[0]
        : undefined;

      if (dealCandidate) {
        const dealPercent = Math.abs(
          Number((dealCandidate.differencePercent ?? 0).toFixed(1)),
        );
        const result = await this.sendToUser(item.user.id, {
          title: `${item.card.name} est en vraie bonne affaire`,
          body: `Une annonce est disponible autour de ${Math.round(
            dealCandidate.requestedValue,
          )} WunkulCoins, soit ${dealPercent}% sous la valeur du marché.`,
          url: '/market',
          tag: `watchlist-deal-${item.id}-${dealCandidate.listing.id}`,
          kind: 'watchlist-deal',
          accent: 'gold',
          requireInteraction: true,
          vibrate: [120, 40, 120],
          actions: [
            { action: 'open-market', title: 'Voir l’annonce', url: '/market' },
            {
              action: 'open-card',
              title: 'Voir la carte',
              url: `/collection/card/${item.card.id}`,
            },
          ],
        });

        if (result.delivered > 0) {
          item.lastDealNotifiedId = dealCandidate.listing.id;
          item.lastListingNotifiedId = dealCandidate.listing.id;
          await this.pushWatchlistRepository.save(item);
        }

        continue;
      }

      const listingCandidate = (item.marketListingAlertEnabled ?? true)
        ? [...candidates]
            .filter(
              (candidate) =>
                candidate.requestedValue <= item.targetPriceCredits &&
                candidate.listing.id !== item.lastListingNotifiedId,
            )
            .sort((a, b) => {
              if (a.requestedValue !== b.requestedValue) {
                return a.requestedValue - b.requestedValue;
              }
              return (
                new Date(b.listing.createdAt).getTime() -
                new Date(a.listing.createdAt).getTime()
              );
            })[0]
        : undefined;

      if (!listingCandidate) {
        continue;
      }

      const result = await this.sendToUser(item.user.id, {
        title: `${item.card.name} vient d’apparaître sur le market`,
        body: `Une annonce correspond à ta watchlist avec une valeur autour de ${Math.round(
          listingCandidate.requestedValue,
        )} WunkulCoins pour ta cible fixée à ${item.targetPriceCredits}.`,
        url: '/market',
        tag: `watchlist-listing-${item.id}-${listingCandidate.listing.id}`,
        kind: 'watchlist-listing',
        accent: 'cyan',
        vibrate: [100, 40, 80],
        actions: [
          { action: 'open-market', title: 'Rechercher', url: '/market' },
          {
            action: 'open-card',
            title: 'Voir la carte',
            url: `/collection/card/${item.card.id}`,
          },
        ],
      });

      if (result.delivered > 0) {
        item.lastListingNotifiedId = listingCandidate.listing.id;
        await this.pushWatchlistRepository.save(item);
      }
    }
  }

  async processStaleListingAlerts() {
    if (!this.pushEnabled) return;

    const activeListings = await this.marketListingRepository.find({
      where: { status: MarketListingStatus.ACTIVE },
      relations: ['seller', 'card'],
      order: { createdAt: 'ASC' },
    });

    const now = new Date();

    for (const listing of activeListings) {
      if (listing.stalePushSentAt) {
        continue;
      }

      const preferences = await this.ensurePreferences(listing.seller.id);
      if (!preferences.staleListingAlertEnabled) {
        continue;
      }

      const ageMs = now.getTime() - listing.createdAt.getTime();
      if (ageMs < preferences.staleListingHours * 60 * 60 * 1000) {
        continue;
      }

      const result = await this.sendToUser(listing.seller.id, {
        title: 'Ton annonce refroidit',
        body: `${listing.card.name} n'a toujours pas bougé après ${preferences.staleListingHours}h. Tu peux ajuster le prix pour relancer l'intérêt.`,
        url: '/market',
        tag: `stale-listing-${listing.id}`,
        kind: 'stale-listing',
        accent: 'pink',
        requireInteraction: true,
        vibrate: [90, 40, 90],
        actions: [
          { action: 'open-market', title: 'Relancer', url: '/market' },
          { action: 'dismiss', title: 'Fermer' },
        ],
      });

      if (result.delivered > 0) {
        listing.stalePushSentAt = now;
        await this.marketListingRepository.save(listing);
      }
    }
  }

  async processDailyMarketRecaps() {
    if (!this.pushEnabled) return;

    const now = new Date();
    if (now.getHours() < 19) {
      return;
    }

    const todayKey = this.formatDateKey(now);
    const userIds = await this.getSubscribedUserIds();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    const todayStats = await this.economyDailyStatsRepository.findOne({
      where: { date: todayKey },
    });

    for (const userId of userIds) {
      const preferences = await this.ensurePreferences(userId);
      if (!preferences.dailyMarketRecapEnabled) {
        continue;
      }

      if (
        preferences.lastDailyMarketRecapSentAt &&
        this.formatDateKey(preferences.lastDailyMarketRecapSentAt) === todayKey
      ) {
        continue;
      }

      const [activeListingsCount, pendingRewardsCount, salesToday, purchasesToday] =
        await Promise.all([
          this.marketListingRepository.count({
            where: {
              seller: { id: userId },
              status: MarketListingStatus.ACTIVE,
            },
          }),
          this.marketTransactionRepository
            .createQueryBuilder('tx')
            .leftJoin('tx.seller', 'seller')
            .where('seller.id = :userId', { userId })
            .andWhere('tx.sellerRewardClaimedAt IS NULL')
            .getCount(),
          this.marketTransactionRepository
            .createQueryBuilder('tx')
            .leftJoin('tx.seller', 'seller')
            .where('seller.id = :userId', { userId })
            .andWhere('tx.createdAt >= :todayStart', { todayStart })
            .getCount(),
          this.marketTransactionRepository
            .createQueryBuilder('tx')
            .leftJoin('tx.buyer', 'buyer')
            .where('buyer.id = :userId', { userId })
            .andWhere('tx.createdAt >= :todayStart', { todayStart })
            .getCount(),
        ]);

      const body =
        `${activeListingsCount} annonce(s) active(s), ` +
        `${pendingRewardsCount} récompense(s) en attente, ` +
        `${salesToday} vente(s) et ${purchasesToday} achat(s) aujourd'hui. ` +
        `Volume global du jour: ${(todayStats?.marketVolume ?? 0).toLocaleString('fr-FR')} WunkulCoins.`;

      const result = await this.sendToUser(userId, {
        title: 'Le market du jour en bref',
        body,
        url: '/market',
        tag: `daily-market-recap-${todayKey}-${userId}`,
        kind: 'daily-market-recap',
        accent: 'gold',
        actions: [
          { action: 'open-market', title: 'Lire le récap', url: '/market' },
          { action: 'dismiss', title: 'Plus tard' },
        ],
      });

      if (result.delivered > 0) {
        preferences.lastDailyMarketRecapSentAt = now;
        await this.pushPreferenceRepository.save(preferences);
      }
    }
  }

  private assertPushEnabled() {
    if (!this.pushEnabled) {
      throw new ServiceUnavailableException(
        'Push notifications are not configured on the server.',
      );
    }
  }

  private async ensurePreferences(userId: number) {
    let preferences = await this.pushPreferenceRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!preferences) {
      preferences = this.pushPreferenceRepository.create({
        user: { id: userId } as User,
        saleRewardEnabled: true,
        freeOpeningsReadyEnabled: true,
        freeOpeningsSoonEnabled: true,
        freeOpeningsSoonMinutes: 15,
        watchlistPriceAlertEnabled: true,
        staleListingAlertEnabled: true,
        staleListingHours: 24,
        dailyMarketRecapEnabled: false,
        lastDailyMarketRecapSentAt: null,
      });

      await this.pushPreferenceRepository.save(preferences);
    }

    return preferences;
  }

  private async getOrCreateEconomy(userId: number, now: Date) {
    let economy = await this.userEconomyRepository.findOne({
      where: { userId },
    });

    if (!economy) {
      economy = this.userEconomyRepository.create({
        userId,
        user: { id: userId } as User,
        credits: 0,
        signupBonusGranted: 0,
        freeBoosterCharges: ECONOMY_RULES.charges.booster.cap,
        freeDisplayCharges: ECONOMY_RULES.charges.display.cap,
        boosterRechargeAt: now,
        displayRechargeAt: now,
        lastFreeOpeningsPushAt: null,
        lastFreeBoosterSoonPushForAt: null,
        lastFreeDisplaySoonPushForAt: null,
      });
    }

    return economy;
  }

  private mapPreferences(
    preferences: PushNotificationPreferenceEntity,
  ): PushPreferencesResponse {
    return {
      saleRewardEnabled: preferences.saleRewardEnabled,
      freeOpeningsReadyEnabled: preferences.freeOpeningsReadyEnabled,
      freeOpeningsSoonEnabled: preferences.freeOpeningsSoonEnabled,
      freeOpeningsSoonMinutes: preferences.freeOpeningsSoonMinutes,
      watchlistPriceAlertEnabled: preferences.watchlistPriceAlertEnabled,
      staleListingAlertEnabled: preferences.staleListingAlertEnabled,
      staleListingHours: preferences.staleListingHours,
      dailyMarketRecapEnabled: preferences.dailyMarketRecapEnabled,
    };
  }

  private mapWatchlistItem(
    item: PushWatchlistEntity,
    currentMarketPrice: number | null,
  ) {
    return {
      id: item.id,
      cardId: item.card.id,
      cardKey: item.card.key,
      cardName: item.card.name,
      rarity: item.card.rarity,
      targetPriceCredits: item.targetPriceCredits,
      marketListingAlertEnabled: item.marketListingAlertEnabled ?? true,
      marketDealAlertEnabled: item.marketDealAlertEnabled ?? true,
      marketDealThresholdPercent: item.marketDealThresholdPercent ?? 15,
      currentMarketPrice,
      targetReachedNotified: item.targetReachedNotified,
      lastTriggeredAt: item.lastTriggeredAt,
      lastTriggeredPrice: item.lastTriggeredPrice,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async getSubscribedUserIds() {
    const rows = await this.pushSubscriptionRepository
      .createQueryBuilder('subscription')
      .select('DISTINCT subscription.user_id', 'userId')
      .getRawMany<{ userId: string }>();

    return rows
      .map((row) => Number(row.userId))
      .filter((value) => Number.isInteger(value) && value > 0);
  }

  private buildWatchlistListingCandidate(
    listing: MarketListing,
    pricingByCardId: Map<number, { finalPrice: number }>,
  ): WatchlistListingCandidate {
    const currentListedCardPrice =
      pricingByCardId.get(listing.card.id)?.finalPrice ??
      listing.marketPriceSnapshot;
    const currentWantedCardPrice = listing.wantedCard?.id
      ? (pricingByCardId.get(listing.wantedCard.id)?.finalPrice ??
        listing.wantedCardMarketPriceSnapshot)
      : 0;

    const referenceMarketValue =
      listing.listingMode === 'LOT'
        ? currentListedCardPrice * listing.remainingQuantity
        : currentListedCardPrice;
    const requestedValue =
      listing.priceCredits + currentWantedCardPrice * listing.wantedCardQuantity;
    const differencePercent =
      referenceMarketValue > 0
        ? Number(
            (
              ((requestedValue - referenceMarketValue) / referenceMarketValue) *
              100
            ).toFixed(2),
          )
        : null;

    return {
      listing,
      requestedValue,
      referenceMarketValue,
      differencePercent,
    };
  }

  private getAvailableOpeningsParts(economy: UserEconomy) {
    const availableParts: string[] = [];

    if (economy.freeBoosterCharges > 0) {
      availableParts.push(
        `${economy.freeBoosterCharges} booster${economy.freeBoosterCharges > 1 ? 's' : ''} gratuit${economy.freeBoosterCharges > 1 ? 's' : ''}`,
      );
    }

    if (economy.freeDisplayCharges > 0) {
      availableParts.push(
        `${economy.freeDisplayCharges} display${economy.freeDisplayCharges > 1 ? 's' : ''} gratuite${economy.freeDisplayCharges > 1 ? 's' : ''}`,
      );
    }

    return availableParts;
  }

  private getNextRechargeAt(
    economy: UserEconomy,
    kind: 'booster' | 'display',
  ): Date | null {
    if (kind === 'booster') {
      if (
        economy.freeBoosterCharges >= ECONOMY_RULES.charges.booster.cap ||
        !economy.boosterRechargeAt
      ) {
        return null;
      }

      return new Date(
        economy.boosterRechargeAt.getTime() +
          ECONOMY_RULES.charges.booster.rechargeMinutes * 60000,
      );
    }

    if (
      economy.freeDisplayCharges >= ECONOMY_RULES.charges.display.cap ||
      !economy.displayRechargeAt
    ) {
      return null;
    }

    return new Date(
      economy.displayRechargeAt.getTime() +
        ECONOMY_RULES.charges.display.rechargeMinutes * 60000,
    );
  }

  private sameDateTime(a: Date | null, b: Date | null) {
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  }

  private formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async sendToUser(userId: number, payload: PushPayload) {
    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (subscriptions.length === 0) {
      return { delivered: 0 };
    }

    const deliveries = await Promise.all(
      subscriptions.map((subscription) =>
        this.sendToSubscription(subscription, payload),
      ),
    );

    return {
      delivered: deliveries.filter(Boolean).length,
    };
  }

  private async sendToSubscription(
    subscription: PushSubscriptionEntity,
    payload: PushPayload,
  ) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime
            ? Number(subscription.expirationTime)
            : null,
          keys: {
            p256dh: subscription.p256dhKey,
            auth: subscription.authKey,
          },
        },
        JSON.stringify(payload),
      );

      subscription.lastSuccessfulPushAt = new Date();
      subscription.lastFailureAt = null;
      await this.pushSubscriptionRepository.save(subscription);
      await this.logDelivery(subscription, payload, 'sent');
      return true;
    } catch (error: any) {
      subscription.lastFailureAt = new Date();

      const statusCode = Number(error?.statusCode ?? error?.status ?? 0);
      await this.logDelivery(subscription, payload, 'failed', {
        statusCode: statusCode || null,
        errorMessage: error?.message ?? 'unknown error',
      });

      if (statusCode === 404 || statusCode === 410) {
        await this.pushSubscriptionRepository.delete({ id: subscription.id });
        return false;
      }

      await this.pushSubscriptionRepository.save(subscription);
      this.logger.warn(
        `Push delivery failed for subscription ${subscription.id}: ${error?.message ?? 'unknown error'}`,
      );
      return false;
    }
  }

  private hashEndpoint(endpoint: string) {
    return createHash('sha256').update(endpoint).digest('hex');
  }

  private async logDelivery(
    subscription: PushSubscriptionEntity,
    payload: PushPayload,
    status: 'sent' | 'failed',
    error?: {
      statusCode?: number | null;
      errorMessage?: string | null;
    },
  ) {
    try {
      await this.pushDeliveryLogRepository.save(
        this.pushDeliveryLogRepository.create({
          userId: subscription.user?.id ?? null,
          subscriptionId: subscription.id,
          endpointHash: subscription.endpointHash,
          kind: payload.kind,
          tag: payload.tag?.slice(0, 160) ?? null,
          title: payload.title?.slice(0, 180) ?? null,
          url: payload.url?.slice(0, 255) ?? null,
          status,
          statusCode: error?.statusCode ?? null,
          errorMessage: error?.errorMessage?.slice(0, 500) ?? null,
        }),
      );
    } catch (logError: any) {
      this.logger.warn(
        `Push delivery log failed for subscription ${subscription.id}: ${logError?.message ?? 'unknown error'}`,
      );
    }
  }
}
