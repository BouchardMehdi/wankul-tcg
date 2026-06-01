import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from '../users/user.entity';
import { BugReport } from '../report/bug-report.entity';
import { BugReportStatusHistory } from '../report/bug-report-status-history.entity';
import { BugReportStatus } from '../report/bug-report.entity';
import { EconomyAnalyticsService } from '../economy/economy-analytics.service';
import { AntiAbuseService } from '../security/anti-abuse.service';
import { MarketListing } from '../market/market-listing.entity';
import { MarketTransaction } from '../market/market-transaction.entity';
import { MarketListingStatus } from '../market/market-listing-status.enum';
import { UserCard } from '../users/user-card.entity';
import { UserEconomy } from '../economy/user-economy.entity';
import { Card } from '../cards/card.entity';

type GetAllTicketsParams = {
  status?: BugReportStatus | '';
  handledBy?: string;
  page?: number;
  pageSize?: number;
};

type EconomyLogParams = {
  days?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  action?: string;
  status?: 'allowed' | 'flagged' | 'blocked' | '';
  severity?: 'info' | 'watch' | 'danger' | '';
  userId?: number;
  cardId?: number;
  targetType?: string;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(BugReport) private readonly reportsRepo: Repository<BugReport>,
    @InjectRepository(BugReportStatusHistory)
    private readonly historyRepo: Repository<BugReportStatusHistory>,
    @InjectRepository(MarketListing)
    private readonly marketListingRepo: Repository<MarketListing>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly economyAnalyticsService: EconomyAnalyticsService,
    private readonly antiAbuseService: AntiAbuseService,
  ) {}

  private formatReport(report: BugReport) {
    return {
      id: report.id,
      userId: report.userId,
      usernameSnapshot: report.usernameSnapshot,
      emailSnapshot: report.emailSnapshot,
      category: report.category,
      page: report.page,
      feature: report.feature,
      priority: report.priority,
      description: report.description,
      reproductionSteps: report.reproductionSteps,
      currentUrl: report.currentUrl,
      browserInfo: report.browserInfo,
      screenshotUrl: report.screenshotUrl,
      status: report.status,
      resolutionNote: report.resolutionNote,
      treatedAt: report.treatedAt,
      treatedBy: report.treatedBy,
      fixedAt: report.fixedAt,
      fixedBy: report.fixedBy,
      closedAt: report.closedAt,
      closedBy: report.closedBy,
      lastStatusChangedBy: report.lastStatusChangedBy,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      histories: (report.histories ?? [])
        .slice()
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
        .map((history) => ({
          id: history.id,
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          note: history.note,
          changedBy: history.changedBy,
          changedAt: history.changedAt,
        })),
    };
  }

  async adminLogin(userId: number, adminPassword: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }

    if (!user.adminPasswordHash) {
      throw new ForbiddenException('Admin password not configured');
    }

    const isValid = await bcrypt.compare(adminPassword, user.adminPasswordHash);
    if (!isValid) {
      throw new ForbiddenException('Invalid admin password');
    }

    const admin_access_token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      scope: 'admin',
    });

    return { admin_access_token };
  }

  async getAllTickets(params: GetAllTicketsParams = {}) {
    const status = (params.status ?? '').trim();
    const handledBy = (params.handledBy ?? '').trim();
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize = Math.min(5, Math.max(1, Number(params.pageSize ?? 5) || 5));

    const qb = this.reportsRepo
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.histories', 'history');

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    if (handledBy) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('report.treatedBy = :handledBy', { handledBy })
            .orWhere('report.fixedBy = :handledBy', { handledBy })
            .orWhere('report.closedBy = :handledBy', { handledBy })
            .orWhere('report.lastStatusChangedBy = :handledBy', { handledBy });
        }),
      );
    }

    qb.orderBy('report.createdAt', 'DESC');

    const [reports, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const adminNameRows = await this.reportsRepo
      .createQueryBuilder('report')
      .select([
        'report.treatedBy AS treatedBy',
        'report.fixedBy AS fixedBy',
        'report.closedBy AS closedBy',
        'report.lastStatusChangedBy AS lastStatusChangedBy',
      ])
      .getRawMany<{
        treatedBy: string | null;
        fixedBy: string | null;
        closedBy: string | null;
        lastStatusChangedBy: string | null;
      }>();

    const adminUsers = Array.from(
      new Set(
        adminNameRows
          .flatMap((row) => [
            row.treatedBy,
            row.fixedBy,
            row.closedBy,
            row.lastStatusChangedBy,
          ])
          .map((value) => value?.trim())
          .filter((value): value is string => !!value),
      ),
    ).sort((a, b) => a.localeCompare(b, 'fr'));

    return {
      items: reports.map((report) => this.formatReport(report)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      filters: {
        status: status || null,
        handledBy: handledBy || null,
      },
      adminUsers,
    };
  }

  async updateTicketStatus(
    reportId: number,
    adminUsername: string,
    status: string,
    note?: string,
  ) {
    const report = await this.reportsRepo.findOne({
      where: { id: reportId },
      relations: ['histories'],
    });

    if (!report) throw new NotFoundException('Ticket not found');

    const previousStatus = report.status;
    const now = new Date();

    report.status = status as any;
    report.resolutionNote = note?.trim() || null;
    report.lastStatusChangedBy = adminUsername;

    if ((status === 'investigating' || status === 'planned') && !report.treatedAt) {
      report.treatedAt = now;
      report.treatedBy = adminUsername;
    }

    if (status === 'fixed') {
      if (!report.treatedAt) {
        report.treatedAt = now;
        report.treatedBy = adminUsername;
      }
      report.fixedAt = now;
      report.fixedBy = adminUsername;
    }

    if (status === 'closed' || status === 'rejected') {
      if (!report.treatedAt) {
        report.treatedAt = now;
        report.treatedBy = adminUsername;
      }
      report.closedAt = now;
      report.closedBy = adminUsername;
    }

    if (status === 'open') {
      report.closedAt = null;
      report.closedBy = null;
      report.fixedAt = null;
      report.fixedBy = null;
    }

    const saved = await this.reportsRepo.save(report);

    const history = this.historyRepo.create({
      reportId: saved.id,
      fromStatus: previousStatus,
      toStatus: status,
      note: note?.trim() || null,
      changedBy: adminUsername,
    });

    await this.historyRepo.save(history);

    const refreshed = await this.reportsRepo.findOne({
      where: { id: saved.id },
      relations: ['histories'],
    });

    if (!refreshed) throw new NotFoundException('Ticket not found');

    return {
      message: 'Ticket updated.',
      item: this.formatReport(refreshed),
    };
  }

  async cancelMarketTransaction(
    adminUser: { id: number; username: string },
    transactionId: number,
    reason?: string,
  ) {
    const safeTransactionId = this.assertPositiveInt(transactionId, 'transactionId');
    const safeReason = this.requireReason(reason);

    if (
      await this.antiAbuseService.hasActionLog(
        'ADMIN_TRANSACTION_CANCEL',
        'transaction',
        safeTransactionId,
      )
    ) {
      throw new BadRequestException('Cette transaction a déjà été annulée par un admin.');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const transactionRepo = manager.getRepository(MarketTransaction);
      const userCardRepo = manager.getRepository(UserCard);
      const userEconomyRepo = manager.getRepository(UserEconomy);

      const tx = await transactionRepo
        .createQueryBuilder('tx')
        .leftJoinAndSelect('tx.listing', 'listing')
        .leftJoinAndSelect('tx.seller', 'seller')
        .leftJoinAndSelect('tx.buyer', 'buyer')
        .leftJoinAndSelect('tx.card', 'card')
        .leftJoinAndSelect('tx.buyerOfferedCard', 'buyerOfferedCard')
        .setLock('pessimistic_write')
        .where('tx.id = :transactionId', { transactionId: safeTransactionId })
        .getOne();

      if (!tx) throw new NotFoundException('Transaction introuvable.');

      const buyerReceivedCard = await this.findUserCardForUpdate(
        userCardRepo,
        tx.buyer.id,
        tx.card.id,
      );

      if (!buyerReceivedCard || buyerReceivedCard.quantity - buyerReceivedCard.quantityLocked < tx.quantity) {
        throw new BadRequestException(
          "Annulation refusée: l'acheteur n'a plus assez de copies disponibles de la carte vendue.",
        );
      }

      const sellerCard = await this.getOrCreateUserCardForUpdate(
        userCardRepo,
        tx.seller.id,
        tx.card.id,
      );

      buyerReceivedCard.quantity -= tx.quantity;
      sellerCard.quantity += tx.quantity;

      const buyerEconomy = await this.getOrCreateEconomyForUpdate(
        userEconomyRepo,
        tx.buyer.id,
      );

      if (tx.totalPriceCredits > 0) {
        buyerEconomy.credits += tx.totalPriceCredits;
      }

      let sellerEconomy: UserEconomy | null = null;
      if (tx.sellerRewardClaimedAt && tx.totalPriceCredits > 0) {
        sellerEconomy = await this.getOrCreateEconomyForUpdate(
          userEconomyRepo,
          tx.seller.id,
        );

        if (sellerEconomy.credits < tx.totalPriceCredits) {
          throw new BadRequestException(
            "Annulation refusée: le vendeur n'a plus assez de WunkulCoins pour reprendre la récompense.",
          );
        }

        sellerEconomy.credits -= tx.totalPriceCredits;
      }

      let buyerOfferedCardBack: UserCard | null = null;
      let sellerOfferedCard: UserCard | null = null;

      if (tx.buyerOfferedCard && tx.buyerOfferedCardQuantity > 0) {
        buyerOfferedCardBack = await this.getOrCreateUserCardForUpdate(
          userCardRepo,
          tx.buyer.id,
          tx.buyerOfferedCard.id,
        );

        if (tx.sellerRewardClaimedAt) {
          sellerOfferedCard = await this.findUserCardForUpdate(
            userCardRepo,
            tx.seller.id,
            tx.buyerOfferedCard.id,
          );

          if (
            !sellerOfferedCard ||
            sellerOfferedCard.quantity - sellerOfferedCard.quantityLocked <
              tx.buyerOfferedCardQuantity
          ) {
            throw new BadRequestException(
              "Annulation refusée: le vendeur n'a plus la carte reçue en récompense.",
            );
          }

          sellerOfferedCard.quantity -= tx.buyerOfferedCardQuantity;
        }

        buyerOfferedCardBack.quantity += tx.buyerOfferedCardQuantity;
      }

      await userCardRepo.save(buyerReceivedCard);
      await userCardRepo.save(sellerCard);
      if (buyerOfferedCardBack) await userCardRepo.save(buyerOfferedCardBack);
      if (sellerOfferedCard) await userCardRepo.save(sellerOfferedCard);
      await userEconomyRepo.save(buyerEconomy);
      if (sellerEconomy) await userEconomyRepo.save(sellerEconomy);

      return {
        transactionId: tx.id,
        sellerId: tx.seller.id,
        buyerId: tx.buyer.id,
        cardId: tx.card.id,
        cardName: tx.card.name,
        quantity: tx.quantity,
        creditsRefunded: tx.totalPriceCredits,
        rewardWasClaimed: !!tx.sellerRewardClaimedAt,
        offeredCardId: tx.buyerOfferedCard?.id ?? null,
        offeredCardQuantity: tx.buyerOfferedCardQuantity,
      };
    });

    await this.antiAbuseService.logAction({
      userId: adminUser.id,
      relatedUserId: result.buyerId,
      cardId: result.cardId,
      action: 'ADMIN_TRANSACTION_CANCEL',
      status: 'allowed',
      severity: 'danger',
      targetType: 'transaction',
      targetId: result.transactionId,
      valueCredits: result.creditsRefunded,
      reason: safeReason,
      metadata: {
        adminUsername: adminUser.username,
        sellerId: result.sellerId,
        buyerId: result.buyerId,
        cardName: result.cardName,
        quantity: result.quantity,
        rewardWasClaimed: result.rewardWasClaimed,
        offeredCardId: result.offeredCardId,
        offeredCardQuantity: result.offeredCardQuantity,
      },
    });

    return {
      message: 'Transaction annulée et correction journalisée.',
      correction: result,
    };
  }

  async disableMarketListing(
    adminUser: { id: number; username: string },
    listingId: number,
    reason?: string,
  ) {
    const safeListingId = this.assertPositiveInt(listingId, 'listingId');
    const safeReason = this.requireReason(reason);

    const result = await this.dataSource.transaction(async (manager) => {
      const listingRepo = manager.getRepository(MarketListing);
      const userCardRepo = manager.getRepository(UserCard);

      const listing = await listingRepo
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.seller', 'seller')
        .leftJoinAndSelect('listing.card', 'card')
        .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
        .setLock('pessimistic_write')
        .where('listing.id = :listingId', { listingId: safeListingId })
        .getOne();

      if (!listing) throw new NotFoundException('Annonce introuvable.');
      if (listing.status !== MarketListingStatus.ACTIVE) {
        throw new BadRequestException("Seules les annonces actives peuvent être désactivées.");
      }

      const unlockedQuantity = listing.remainingQuantity;
      const sellerCard = await this.findUserCardForUpdate(
        userCardRepo,
        listing.seller.id,
        listing.card.id,
      );

      if (!sellerCard) {
        throw new NotFoundException('Inventaire vendeur introuvable.');
      }

      sellerCard.quantityLocked = Math.max(0, sellerCard.quantityLocked - unlockedQuantity);
      listing.status = MarketListingStatus.CANCELLED;
      listing.remainingQuantity = 0;
      listing.closedAt = new Date();

      await userCardRepo.save(sellerCard);
      await listingRepo.save(listing);

      return {
        listingId: listing.id,
        sellerId: listing.seller.id,
        cardId: listing.card.id,
        cardName: listing.card.name,
        unlockedQuantity,
        status: listing.status,
        closedAt: listing.closedAt,
      };
    });

    await this.antiAbuseService.logAction({
      userId: adminUser.id,
      relatedUserId: result.sellerId,
      cardId: result.cardId,
      action: 'ADMIN_LISTING_DISABLE',
      status: 'allowed',
      severity: 'watch',
      targetType: 'listing',
      targetId: result.listingId,
      reason: safeReason,
      metadata: {
        adminUsername: adminUser.username,
        cardName: result.cardName,
        unlockedQuantity: result.unlockedQuantity,
        status: result.status,
        closedAt: result.closedAt,
      },
    });

    return {
      message: 'Annonce désactivée et copies déverrouillées.',
      correction: result,
    };
  }

  async adjustMarketListingPrice(
    adminUser: { id: number; username: string },
    listingId: number,
    priceCredits: number,
    reason?: string,
  ) {
    const safeListingId = this.assertPositiveInt(listingId, 'listingId');
    const safePrice = this.assertNonNegativeInt(priceCredits, 'priceCredits');
    const safeReason = this.requireReason(reason);

    const listing = await this.marketListingRepo.findOne({
      where: { id: safeListingId },
      relations: ['seller', 'card'],
    });

    if (!listing) throw new NotFoundException('Annonce introuvable.');
    if (listing.status !== MarketListingStatus.ACTIVE) {
      throw new BadRequestException('Le prix ne peut être modifié que sur une annonce active.');
    }

    const previousPrice = listing.priceCredits;
    listing.priceCredits = safePrice;
    await this.marketListingRepo.save(listing);

    await this.antiAbuseService.logAction({
      userId: adminUser.id,
      relatedUserId: listing.seller.id,
      cardId: listing.card.id,
      action: 'ADMIN_LISTING_PRICE_ADJUST',
      status: 'allowed',
      severity: 'watch',
      targetType: 'listing',
      targetId: listing.id,
      valueCredits: safePrice,
      reason: safeReason,
      metadata: {
        adminUsername: adminUser.username,
        cardName: listing.card.name,
        previousPrice,
        nextPrice: safePrice,
      },
    });

    return {
      message: 'Prix ajusté et correction journalisée.',
      correction: {
        listingId: listing.id,
        sellerId: listing.seller.id,
        cardId: listing.card.id,
        previousPrice,
        nextPrice: safePrice,
      },
    };
  }

  async refundPlayer(
    adminUser: { id: number; username: string },
    userId: number,
    amount: number,
    reason?: string,
  ) {
    const safeUserId = this.assertPositiveInt(userId, 'userId');
    const safeAmount = this.assertPositiveInt(amount, 'amount');
    const safeReason = this.requireReason(reason);

    const user = await this.usersRepo.findOne({ where: { id: safeUserId } });
    if (!user) throw new NotFoundException('Joueur introuvable.');

    const result = await this.dataSource.transaction(async (manager) => {
      const userEconomyRepo = manager.getRepository(UserEconomy);
      const economy = await this.getOrCreateEconomyForUpdate(
        userEconomyRepo,
        safeUserId,
      );
      const previousCredits = economy.credits;
      economy.credits += safeAmount;
      await userEconomyRepo.save(economy);

      return {
        userId: safeUserId,
        username: user.username,
        amount: safeAmount,
        previousCredits,
        nextCredits: economy.credits,
      };
    });

    await this.antiAbuseService.logAction({
      userId: adminUser.id,
      relatedUserId: safeUserId,
      action: 'ADMIN_PLAYER_REFUND',
      status: 'allowed',
      severity: 'watch',
      targetType: 'user',
      targetId: safeUserId,
      valueCredits: safeAmount,
      reason: safeReason,
      metadata: {
        adminUsername: adminUser.username,
        username: user.username,
        previousCredits: result.previousCredits,
        nextCredits: result.nextCredits,
      },
    });

    return {
      message: 'Joueur remboursé et correction journalisée.',
      correction: result,
    };
  }

  async removeBuggedReward(
    adminUser: { id: number; username: string },
    input: {
      userId: number;
      credits?: number;
      cardId?: number;
      cardQuantity?: number;
      reason?: string;
    },
  ) {
    const safeUserId = this.assertPositiveInt(input.userId, 'userId');
    const safeCredits = this.assertNonNegativeInt(input.credits ?? 0, 'credits');
    const safeCardId = input.cardId
      ? this.assertPositiveInt(input.cardId, 'cardId')
      : 0;
    const safeCardQuantity = this.assertNonNegativeInt(
      input.cardQuantity ?? 0,
      'cardQuantity',
    );
    const safeReason = this.requireReason(input.reason);

    if (safeCredits <= 0 && safeCardQuantity <= 0) {
      throw new BadRequestException('Indique au moins des WunkulCoins ou une carte à retirer.');
    }

    if (safeCardQuantity > 0 && !safeCardId) {
      throw new BadRequestException('cardId est obligatoire pour retirer une carte.');
    }

    const user = await this.usersRepo.findOne({ where: { id: safeUserId } });
    if (!user) throw new NotFoundException('Joueur introuvable.');

    const result = await this.dataSource.transaction(async (manager) => {
      const userEconomyRepo = manager.getRepository(UserEconomy);
      const userCardRepo = manager.getRepository(UserCard);
      const cardRepo = manager.getRepository(Card);

      let previousCredits: number | null = null;
      let nextCredits: number | null = null;

      if (safeCredits > 0) {
        const economy = await this.getOrCreateEconomyForUpdate(
          userEconomyRepo,
          safeUserId,
        );

        if (economy.credits < safeCredits) {
          throw new BadRequestException(
            "Retrait refusé: le joueur n'a pas assez de WunkulCoins.",
          );
        }

        previousCredits = economy.credits;
        economy.credits -= safeCredits;
        nextCredits = economy.credits;
        await userEconomyRepo.save(economy);
      }

      let cardName: string | null = null;
      if (safeCardId && safeCardQuantity > 0) {
        const card = await cardRepo.findOne({ where: { id: safeCardId } });
        if (!card) throw new NotFoundException('Carte introuvable.');
        cardName = card.name;

        const userCard = await this.findUserCardForUpdate(
          userCardRepo,
          safeUserId,
          safeCardId,
        );

        if (!userCard || userCard.quantity - userCard.quantityLocked < safeCardQuantity) {
          throw new BadRequestException(
            "Retrait refusé: le joueur n'a pas assez de copies disponibles.",
          );
        }

        userCard.quantity -= safeCardQuantity;
        await userCardRepo.save(userCard);
      }

      return {
        userId: safeUserId,
        username: user.username,
        creditsRemoved: safeCredits,
        previousCredits,
        nextCredits,
        cardId: safeCardId || null,
        cardName,
        cardQuantityRemoved: safeCardQuantity,
      };
    });

    await this.antiAbuseService.logAction({
      userId: adminUser.id,
      relatedUserId: safeUserId,
      cardId: result.cardId,
      action: 'ADMIN_REWARD_REMOVE',
      status: 'allowed',
      severity: 'danger',
      targetType: 'user',
      targetId: safeUserId,
      valueCredits: result.creditsRemoved,
      reason: safeReason,
      metadata: {
        adminUsername: adminUser.username,
        username: result.username,
        previousCredits: result.previousCredits,
        nextCredits: result.nextCredits,
        cardId: result.cardId,
        cardName: result.cardName,
        cardQuantityRemoved: result.cardQuantityRemoved,
      },
    });

    return {
      message: 'Récompense retirée et correction journalisée.',
      correction: result,
    };
  }

  async getEconomyOverview(days = 7) {
    const [overview, security] = await Promise.all([
      this.economyAnalyticsService.getOverview(days),
      this.antiAbuseService.getOverview(days),
    ]);

    return {
      ...overview,
      security,
    };
  }

  async getEconomyLogs(params: EconomyLogParams = {}) {
    return this.antiAbuseService.getLogs(params);
  }

  async getEconomyExport(days = 30) {
    const safeDays = Math.min(180, Math.max(1, Number(days) || 30));
    const [overview, logs] = await Promise.all([
      this.getEconomyOverview(safeDays),
      this.antiAbuseService.getLogs({
        days: safeDays,
        page: 1,
        pageSize: 100,
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      days: safeDays,
      overview,
      recentEconomicLogs: logs.items,
      rollbackReminder: {
        mode: 'manual_database_restore',
        note: 'Toujours créer un backup juste avant toute correction économie. Le rollback se fait par restauration SQL contrôlée, pas par bouton admin.',
      },
    };
  }

  buildEconomyExportCsv(exportData: Awaited<ReturnType<AdminService['getEconomyExport']>>) {
    const rows = [
      ['section', 'date', 'metric', 'value', 'details'],
      ...exportData.overview.rows.map((row) => [
        'daily',
        row.date,
        'credits_created_opening',
        row.creditsEarnedOpening,
        `boosters=${row.boostersOpened};displays=${row.displaysOpened}`,
      ]),
      ...exportData.overview.rows.map((row) => [
        'daily',
        row.date,
        'credits_created_quick_sell',
        row.creditsEarnedQuickSell,
        `marketVolume=${row.marketVolume}`,
      ]),
      ...exportData.overview.rows.map((row) => [
        'daily',
        row.date,
        'credits_destroyed',
        row.creditsSpent,
        `marketVolume=${row.marketVolume}`,
      ]),
      ...exportData.recentEconomicLogs.map((log) => [
        'log',
        log.createdAt,
        log.action,
        log.valueCredits,
        `status=${log.status};severity=${log.severity};user=${log.userId ?? ''};reason=${log.reason ?? ''}`,
      ]),
    ];

    return rows.map((row) => row.map((value) => this.csvValue(value)).join(',')).join('\n');
  }

  private assertPositiveInt(value: number, field: string) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) {
      throw new BadRequestException(`${field} doit être un entier positif.`);
    }

    return num;
  }

  private assertNonNegativeInt(value: number, field: string) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new BadRequestException(`${field} doit être un entier positif ou nul.`);
    }

    return num;
  }

  private requireReason(reason?: string) {
    const value = String(reason ?? '').trim();
    if (value.length < 6) {
      throw new BadRequestException(
        'Une raison claire est obligatoire pour toute correction admin.',
      );
    }

    return value.slice(0, 255);
  }

  private findUserCardForUpdate(
    repo: Repository<UserCard>,
    userId: number,
    cardId: number,
  ) {
    return repo
      .createQueryBuilder('uc')
      .leftJoinAndSelect('uc.user', 'user')
      .leftJoinAndSelect('uc.card', 'card')
      .setLock('pessimistic_write')
      .where('user.id = :userId', { userId })
      .andWhere('card.id = :cardId', { cardId })
      .getOne();
  }

  private async getOrCreateUserCardForUpdate(
    repo: Repository<UserCard>,
    userId: number,
    cardId: number,
  ) {
    const existing = await this.findUserCardForUpdate(repo, userId, cardId);
    if (existing) return existing;

    return repo.create({
      user: { id: userId } as any,
      card: { id: cardId } as any,
      quantity: 0,
      quantityLocked: 0,
    });
  }

  private async getOrCreateEconomyForUpdate(
    repo: Repository<UserEconomy>,
    userId: number,
  ) {
    let economy = await repo
      .createQueryBuilder('economy')
      .setLock('pessimistic_write')
      .where('economy.userId = :userId', { userId })
      .getOne();

    if (!economy) {
      economy = repo.create({
        userId,
        credits: 0,
      });
    }

    return economy;
  }

  private csvValue(value: unknown) {
    const text = String(value ?? '');
    if (!/[",\n\r]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  }
}
