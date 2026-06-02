"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jwt_1 = require("@nestjs/jwt");
const user_entity_1 = require("../users/user.entity");
const bug_report_entity_1 = require("../report/bug-report.entity");
const bug_report_status_history_entity_1 = require("../report/bug-report-status-history.entity");
const economy_analytics_service_1 = require("../economy/economy-analytics.service");
const anti_abuse_service_1 = require("../security/anti-abuse.service");
const market_listing_entity_1 = require("../market/market-listing.entity");
const market_transaction_entity_1 = require("../market/market-transaction.entity");
const market_listing_status_enum_1 = require("../market/market-listing-status.enum");
const user_card_entity_1 = require("../users/user-card.entity");
const user_economy_entity_1 = require("../economy/user-economy.entity");
const card_entity_1 = require("../cards/card.entity");
const booster_opening_entity_1 = require("../booster/booster-opening.entity");
const display_opening_entity_1 = require("../booster/display-opening.entity");
const economic_action_log_entity_1 = require("../security/economic-action-log.entity");
const push_delivery_log_entity_1 = require("../push/push-delivery-log.entity");
const push_preference_entity_1 = require("../push/push-preference.entity");
const push_subscription_entity_1 = require("../push/push-subscription.entity");
const MODERATION_ACTIONS = [
    'ADMIN_USER_SUSPEND',
    'ADMIN_USER_UNSUSPEND',
    'ADMIN_MARKET_BLOCK',
    'ADMIN_MARKET_UNBLOCK',
    'ADMIN_LISTING_HIDE',
];
const ADMIN_REFRESH_EXPIRES_IN = '8h';
let AdminService = class AdminService {
    usersRepo;
    reportsRepo;
    historyRepo;
    marketListingRepo;
    dataSource;
    jwt;
    economyAnalyticsService;
    antiAbuseService;
    constructor(usersRepo, reportsRepo, historyRepo, marketListingRepo, dataSource, jwt, economyAnalyticsService, antiAbuseService) {
        this.usersRepo = usersRepo;
        this.reportsRepo = reportsRepo;
        this.historyRepo = historyRepo;
        this.marketListingRepo = marketListingRepo;
        this.dataSource = dataSource;
        this.jwt = jwt;
        this.economyAnalyticsService = economyAnalyticsService;
        this.antiAbuseService = antiAbuseService;
    }
    formatReport(report) {
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
    async adminLogin(userId, adminPassword) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        this.assertAdminSessionAllowed(user);
        const isValid = await bcrypt.compare(adminPassword, user.adminPasswordHash);
        if (!isValid) {
            throw new common_1.ForbiddenException('Invalid admin password');
        }
        return this.createAdminSession(user);
    }
    async refreshAdminSession(adminRefreshToken) {
        const token = (adminRefreshToken ?? '').trim();
        if (!token) {
            throw new common_1.UnauthorizedException('Session admin à renouveler.');
        }
        let payload;
        try {
            payload = await this.jwt.verifyAsync(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Session admin expirée.');
        }
        if (payload?.scope !== 'admin_refresh' || !payload?.sub) {
            throw new common_1.UnauthorizedException('Session admin invalide.');
        }
        const user = await this.usersRepo.findOne({ where: { id: Number(payload.sub) } });
        if (!user) {
            throw new common_1.UnauthorizedException('Session admin invalide.');
        }
        this.assertAdminSessionAllowed(user);
        return this.createAdminSession(user);
    }
    assertAdminSessionAllowed(user) {
        if (user.role !== 'admin') {
            throw new common_1.ForbiddenException('Admin role required');
        }
        if (!user.adminPasswordHash) {
            throw new common_1.ForbiddenException('Admin password not configured');
        }
        if (user.suspendedUntil) {
            const suspendedUntil = new Date(user.suspendedUntil);
            if (!Number.isNaN(suspendedUntil.getTime()) && suspendedUntil.getTime() > Date.now()) {
                throw new common_1.ForbiddenException(`Compte suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`);
            }
        }
    }
    async createAdminSession(user) {
        const admin_access_token = await this.jwt.signAsync({
            sub: user.id,
            username: user.username,
            role: user.role,
            scope: 'admin',
        });
        const admin_refresh_token = await this.jwt.signAsync({
            sub: user.id,
            username: user.username,
            role: user.role,
            scope: 'admin_refresh',
        }, { expiresIn: ADMIN_REFRESH_EXPIRES_IN });
        return {
            admin_access_token,
            admin_refresh_token,
            admin_refresh_expires_in: ADMIN_REFRESH_EXPIRES_IN,
        };
    }
    async getAllTickets(params = {}) {
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
            qb.andWhere(new typeorm_2.Brackets((subQb) => {
                subQb
                    .where('report.treatedBy = :handledBy', { handledBy })
                    .orWhere('report.fixedBy = :handledBy', { handledBy })
                    .orWhere('report.closedBy = :handledBy', { handledBy })
                    .orWhere('report.lastStatusChangedBy = :handledBy', { handledBy });
            }));
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
            .getRawMany();
        const adminUsers = Array.from(new Set(adminNameRows
            .flatMap((row) => [
            row.treatedBy,
            row.fixedBy,
            row.closedBy,
            row.lastStatusChangedBy,
        ])
            .map((value) => value?.trim())
            .filter((value) => !!value))).sort((a, b) => a.localeCompare(b, 'fr'));
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
    async updateTicketStatus(reportId, adminUsername, status, note) {
        const report = await this.reportsRepo.findOne({
            where: { id: reportId },
            relations: ['histories'],
        });
        if (!report)
            throw new common_1.NotFoundException('Ticket not found');
        const previousStatus = report.status;
        const now = new Date();
        report.status = status;
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
        if (!refreshed)
            throw new common_1.NotFoundException('Ticket not found');
        return {
            message: 'Ticket updated.',
            item: this.formatReport(refreshed),
        };
    }
    async cancelMarketTransaction(adminUser, transactionId, reason) {
        const safeTransactionId = this.assertPositiveInt(transactionId, 'transactionId');
        const safeReason = this.requireReason(reason);
        if (await this.antiAbuseService.hasActionLog('ADMIN_TRANSACTION_CANCEL', 'transaction', safeTransactionId)) {
            throw new common_1.BadRequestException('Cette transaction a déjà été annulée par un admin.');
        }
        const result = await this.dataSource.transaction(async (manager) => {
            const transactionRepo = manager.getRepository(market_transaction_entity_1.MarketTransaction);
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const userEconomyRepo = manager.getRepository(user_economy_entity_1.UserEconomy);
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
            if (!tx)
                throw new common_1.NotFoundException('Transaction introuvable.');
            const buyerReceivedCard = await this.findUserCardForUpdate(userCardRepo, tx.buyer.id, tx.card.id);
            if (!buyerReceivedCard || buyerReceivedCard.quantity - buyerReceivedCard.quantityLocked < tx.quantity) {
                throw new common_1.BadRequestException("Annulation refusée: l'acheteur n'a plus assez de copies disponibles de la carte vendue.");
            }
            const sellerCard = await this.getOrCreateUserCardForUpdate(userCardRepo, tx.seller.id, tx.card.id);
            buyerReceivedCard.quantity -= tx.quantity;
            sellerCard.quantity += tx.quantity;
            const buyerEconomy = await this.getOrCreateEconomyForUpdate(userEconomyRepo, tx.buyer.id);
            if (tx.totalPriceCredits > 0) {
                buyerEconomy.credits += tx.totalPriceCredits;
            }
            let sellerEconomy = null;
            if (tx.sellerRewardClaimedAt && tx.totalPriceCredits > 0) {
                sellerEconomy = await this.getOrCreateEconomyForUpdate(userEconomyRepo, tx.seller.id);
                if (sellerEconomy.credits < tx.totalPriceCredits) {
                    throw new common_1.BadRequestException("Annulation refusée: le vendeur n'a plus assez de WunkulCoins pour reprendre la récompense.");
                }
                sellerEconomy.credits -= tx.totalPriceCredits;
            }
            let buyerOfferedCardBack = null;
            let sellerOfferedCard = null;
            if (tx.buyerOfferedCard && tx.buyerOfferedCardQuantity > 0) {
                buyerOfferedCardBack = await this.getOrCreateUserCardForUpdate(userCardRepo, tx.buyer.id, tx.buyerOfferedCard.id);
                if (tx.sellerRewardClaimedAt) {
                    sellerOfferedCard = await this.findUserCardForUpdate(userCardRepo, tx.seller.id, tx.buyerOfferedCard.id);
                    if (!sellerOfferedCard ||
                        sellerOfferedCard.quantity - sellerOfferedCard.quantityLocked <
                            tx.buyerOfferedCardQuantity) {
                        throw new common_1.BadRequestException("Annulation refusée: le vendeur n'a plus la carte reçue en récompense.");
                    }
                    sellerOfferedCard.quantity -= tx.buyerOfferedCardQuantity;
                }
                buyerOfferedCardBack.quantity += tx.buyerOfferedCardQuantity;
            }
            await userCardRepo.save(buyerReceivedCard);
            await userCardRepo.save(sellerCard);
            if (buyerOfferedCardBack)
                await userCardRepo.save(buyerOfferedCardBack);
            if (sellerOfferedCard)
                await userCardRepo.save(sellerOfferedCard);
            await userEconomyRepo.save(buyerEconomy);
            if (sellerEconomy)
                await userEconomyRepo.save(sellerEconomy);
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
    async disableMarketListing(adminUser, listingId, reason) {
        const safeListingId = this.assertPositiveInt(listingId, 'listingId');
        const safeReason = this.requireReason(reason);
        const result = await this.dataSource.transaction(async (manager) => {
            const listingRepo = manager.getRepository(market_listing_entity_1.MarketListing);
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const listing = await listingRepo
                .createQueryBuilder('listing')
                .leftJoinAndSelect('listing.seller', 'seller')
                .leftJoinAndSelect('listing.card', 'card')
                .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
                .setLock('pessimistic_write')
                .where('listing.id = :listingId', { listingId: safeListingId })
                .getOne();
            if (!listing)
                throw new common_1.NotFoundException('Annonce introuvable.');
            if (listing.status !== market_listing_status_enum_1.MarketListingStatus.ACTIVE) {
                throw new common_1.BadRequestException("Seules les annonces actives peuvent être désactivées.");
            }
            const unlockedQuantity = listing.remainingQuantity;
            const sellerCard = await this.findUserCardForUpdate(userCardRepo, listing.seller.id, listing.card.id);
            if (!sellerCard) {
                throw new common_1.NotFoundException('Inventaire vendeur introuvable.');
            }
            sellerCard.quantityLocked = Math.max(0, sellerCard.quantityLocked - unlockedQuantity);
            listing.status = market_listing_status_enum_1.MarketListingStatus.CANCELLED;
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
    async adjustMarketListingPrice(adminUser, listingId, priceCredits, reason) {
        const safeListingId = this.assertPositiveInt(listingId, 'listingId');
        const safePrice = this.assertNonNegativeInt(priceCredits, 'priceCredits');
        const safeReason = this.requireReason(reason);
        const listing = await this.marketListingRepo.findOne({
            where: { id: safeListingId },
            relations: ['seller', 'card'],
        });
        if (!listing)
            throw new common_1.NotFoundException('Annonce introuvable.');
        if (listing.status !== market_listing_status_enum_1.MarketListingStatus.ACTIVE) {
            throw new common_1.BadRequestException('Le prix ne peut être modifié que sur une annonce active.');
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
    async refundPlayer(adminUser, userId, amount, reason) {
        const safeUserId = this.assertPositiveInt(userId, 'userId');
        const safeAmount = this.assertPositiveInt(amount, 'amount');
        const safeReason = this.requireReason(reason);
        const user = await this.usersRepo.findOne({ where: { id: safeUserId } });
        if (!user)
            throw new common_1.NotFoundException('Joueur introuvable.');
        const result = await this.dataSource.transaction(async (manager) => {
            const userEconomyRepo = manager.getRepository(user_economy_entity_1.UserEconomy);
            const economy = await this.getOrCreateEconomyForUpdate(userEconomyRepo, safeUserId);
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
    async removeBuggedReward(adminUser, input) {
        const safeUserId = this.assertPositiveInt(input.userId, 'userId');
        const safeCredits = this.assertNonNegativeInt(input.credits ?? 0, 'credits');
        const safeCardId = input.cardId
            ? this.assertPositiveInt(input.cardId, 'cardId')
            : 0;
        const safeCardQuantity = this.assertNonNegativeInt(input.cardQuantity ?? 0, 'cardQuantity');
        const safeReason = this.requireReason(input.reason);
        if (safeCredits <= 0 && safeCardQuantity <= 0) {
            throw new common_1.BadRequestException('Indique au moins des WunkulCoins ou une carte à retirer.');
        }
        if (safeCardQuantity > 0 && !safeCardId) {
            throw new common_1.BadRequestException('cardId est obligatoire pour retirer une carte.');
        }
        const user = await this.usersRepo.findOne({ where: { id: safeUserId } });
        if (!user)
            throw new common_1.NotFoundException('Joueur introuvable.');
        const result = await this.dataSource.transaction(async (manager) => {
            const userEconomyRepo = manager.getRepository(user_economy_entity_1.UserEconomy);
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const cardRepo = manager.getRepository(card_entity_1.Card);
            let previousCredits = null;
            let nextCredits = null;
            if (safeCredits > 0) {
                const economy = await this.getOrCreateEconomyForUpdate(userEconomyRepo, safeUserId);
                if (economy.credits < safeCredits) {
                    throw new common_1.BadRequestException("Retrait refusé: le joueur n'a pas assez de WunkulCoins.");
                }
                previousCredits = economy.credits;
                economy.credits -= safeCredits;
                nextCredits = economy.credits;
                await userEconomyRepo.save(economy);
            }
            let cardName = null;
            if (safeCardId && safeCardQuantity > 0) {
                const card = await cardRepo.findOne({ where: { id: safeCardId } });
                if (!card)
                    throw new common_1.NotFoundException('Carte introuvable.');
                cardName = card.name;
                const userCard = await this.findUserCardForUpdate(userCardRepo, safeUserId, safeCardId);
                if (!userCard || userCard.quantity - userCard.quantityLocked < safeCardQuantity) {
                    throw new common_1.BadRequestException("Retrait refusé: le joueur n'a pas assez de copies disponibles.");
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
    async getSeasonCardsOverview() {
        const cardRepo = this.dataSource.getRepository(card_entity_1.Card);
        const cards = await cardRepo.find({
            order: {
                seasonNumber: 'ASC',
                affiliatedSeasonNumber: 'ASC',
                number: 'ASC',
                id: 'ASC',
            },
        });
        const items = cards.map((card) => {
            const availability = this.getCardAvailability(card);
            const image = this.getCardImageStatus(card.imageUrl);
            const seasonGroup = this.getCardSeasonGroup(card);
            const affiliatedSeasonNumber = this.normalizePositiveInt(card.affiliatedSeasonNumber);
            const affiliatedSeasonLabel = affiliatedSeasonNumber
                ? card.affiliatedSeason?.trim() || `Saison ${affiliatedSeasonNumber}`
                : null;
            return {
                id: card.id,
                key: card.key,
                name: card.name,
                number: card.number,
                displayNumber: card.displayNumber,
                rarity: card.rarity,
                type: card.type,
                gameplayType: card.gameplayType,
                specialEdition: card.specialEdition,
                specialCategory: card.specialCategory,
                sourceRarity: card.sourceRarity,
                sourceRaritySlug: card.sourceRaritySlug,
                season: card.season,
                seasonNumber: card.seasonNumber,
                extension: card.extension,
                seasonGroupKey: seasonGroup.key,
                seasonGroupLabel: seasonGroup.label,
                affiliatedSeason: card.affiliatedSeason,
                affiliatedSeasonNumber,
                affiliatedSeasonLabel,
                imageUrl: card.imageUrl,
                imageExists: image.exists,
                imageStatus: image.status,
                imagePath: image.path,
                obtainable: availability.obtainable,
                boosterAvailable: availability.boosterAvailable,
                availabilitySource: availability.source,
                availabilityReason: availability.reason,
            };
        });
        const seasonsMap = new Map();
        for (const item of items) {
            const existing = seasonsMap.get(item.seasonGroupKey) ??
                {
                    key: item.seasonGroupKey,
                    label: item.seasonGroupLabel,
                    seasonNumber: item.seasonNumber ?? null,
                    totalCards: 0,
                    obtainableCards: 0,
                    notObtainableCards: 0,
                    boosterAvailableCards: 0,
                    missingImages: 0,
                    rarityCounts: {},
                };
            existing.totalCards += 1;
            existing.obtainableCards += item.obtainable ? 1 : 0;
            existing.notObtainableCards += item.obtainable ? 0 : 1;
            existing.boosterAvailableCards += item.boosterAvailable ? 1 : 0;
            existing.missingImages += item.imageExists ? 0 : 1;
            existing.rarityCounts[item.rarity] = (existing.rarityCounts[item.rarity] ?? 0) + 1;
            seasonsMap.set(item.seasonGroupKey, existing);
        }
        const seasons = Array.from(seasonsMap.values()).sort((a, b) => {
            if (a.seasonNumber && b.seasonNumber)
                return a.seasonNumber - b.seasonNumber;
            if (a.seasonNumber)
                return -1;
            if (b.seasonNumber)
                return 1;
            return a.label.localeCompare(b.label, 'fr');
        });
        const rarities = Array.from(new Set(items.map((item) => item.rarity)))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'fr'));
        return {
            generatedAt: new Date().toISOString(),
            totals: {
                totalCards: items.length,
                obtainableCards: items.filter((item) => item.obtainable).length,
                notObtainableCards: items.filter((item) => !item.obtainable).length,
                boosterAvailableCards: items.filter((item) => item.boosterAvailable).length,
                missingImages: items.filter((item) => !item.imageExists).length,
            },
            seasons,
            rarities,
            items,
        };
    }
    async getPwaMonitoring(days = 30) {
        const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
        const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
        const now = Date.now();
        const subscriptionRepo = this.dataSource.getRepository(push_subscription_entity_1.PushSubscriptionEntity);
        const preferenceRepo = this.dataSource.getRepository(push_preference_entity_1.PushNotificationPreferenceEntity);
        const deliveryLogRepo = this.dataSource.getRepository(push_delivery_log_entity_1.PushDeliveryLogEntity);
        const [subscriptions, preferences, deliveryLogs] = await Promise.all([
            subscriptionRepo.find({
                relations: ['user'],
                order: { updatedAt: 'DESC' },
            }),
            preferenceRepo.find({
                relations: ['user'],
            }),
            deliveryLogRepo.find({
                where: { createdAt: (0, typeorm_2.MoreThanOrEqual)(since) },
                order: { createdAt: 'DESC' },
            }),
        ]);
        const subscribedUserIds = new Set(subscriptions
            .map((subscription) => subscription.user?.id)
            .filter((value) => Number.isInteger(value) && value > 0));
        const expiredSubscriptions = subscriptions.filter((subscription) => this.isPushSubscriptionExpired(subscription, now));
        const failedSubscriptions = subscriptions.filter((subscription) => this.hasPushSubscriptionRecentFailure(subscription));
        const staleSubscriptions = subscriptions.filter((subscription) => !subscription.lastSuccessfulPushAt && !!subscription.lastFailureAt);
        const sentDeliveries = deliveryLogs.filter((log) => log.status === 'sent');
        const failedDeliveries = deliveryLogs.filter((log) => log.status === 'failed');
        const deliveryTotal = deliveryLogs.length;
        const byKind = this.buildPushDeliveryKindStats(deliveryLogs);
        const atRiskMap = new Map();
        for (const subscription of [...expiredSubscriptions, ...failedSubscriptions, ...staleSubscriptions]) {
            atRiskMap.set(subscription.id, subscription);
        }
        return {
            generatedAt: new Date().toISOString(),
            days: safeDays,
            totals: {
                subscribedUsers: subscribedUserIds.size,
                totalSubscriptions: subscriptions.length,
                activeSubscriptions: subscriptions.length - expiredSubscriptions.length,
                expiredSubscriptions: expiredSubscriptions.length,
                failedSubscriptions: failedSubscriptions.length,
                staleSubscriptions: staleSubscriptions.length,
                notificationsSent: sentDeliveries.length,
                notificationsFailed: failedDeliveries.length,
                deliveryAttempts: deliveryTotal,
                failureRatePercent: deliveryTotal > 0 ? Number(((failedDeliveries.length / deliveryTotal) * 100).toFixed(2)) : 0,
            },
            preferences: {
                total: preferences.length,
                saleRewardEnabled: preferences.filter((pref) => pref.saleRewardEnabled).length,
                freeOpeningsReadyEnabled: preferences.filter((pref) => pref.freeOpeningsReadyEnabled).length,
                freeOpeningsSoonEnabled: preferences.filter((pref) => pref.freeOpeningsSoonEnabled).length,
                watchlistPriceAlertEnabled: preferences.filter((pref) => pref.watchlistPriceAlertEnabled).length,
                staleListingAlertEnabled: preferences.filter((pref) => pref.staleListingAlertEnabled).length,
                dailyMarketRecapEnabled: preferences.filter((pref) => pref.dailyMarketRecapEnabled).length,
            },
            byKind,
            recentFailures: failedDeliveries.slice(0, 12).map((log) => this.mapPushDeliveryLog(log)),
            atRiskSubscriptions: Array.from(atRiskMap.values())
                .sort((a, b) => new Date(b.lastFailureAt ?? b.updatedAt).getTime() -
                new Date(a.lastFailureAt ?? a.updatedAt).getTime())
                .slice(0, 12)
                .map((subscription) => this.mapPushSubscriptionRisk(subscription, now)),
        };
    }
    async getModerationOverview() {
        const now = new Date();
        const logRepo = this.dataSource.getRepository(economic_action_log_entity_1.EconomicActionLog);
        const [activeSuspensions, activeMarketBlocks, hiddenListings, hiddenListingsTotal, openReports, urgentReportsTotal, moderationLogs,] = await Promise.all([
            this.usersRepo
                .createQueryBuilder('user')
                .where('user.suspendedUntil IS NOT NULL')
                .andWhere('user.suspendedUntil > :now', { now })
                .orderBy('user.suspendedUntil', 'ASC')
                .take(20)
                .getMany(),
            this.usersRepo
                .createQueryBuilder('user')
                .where('user.marketBlockedUntil IS NOT NULL')
                .andWhere('user.marketBlockedUntil > :now', { now })
                .orderBy('user.marketBlockedUntil', 'ASC')
                .take(20)
                .getMany(),
            this.marketListingRepo.find({
                where: { status: market_listing_status_enum_1.MarketListingStatus.HIDDEN },
                relations: ['seller', 'card'],
                order: { closedAt: 'DESC', updatedAt: 'DESC' },
                take: 12,
            }),
            this.marketListingRepo.count({
                where: { status: market_listing_status_enum_1.MarketListingStatus.HIDDEN },
            }),
            this.reportsRepo.find({
                where: { status: (0, typeorm_2.In)(['open', 'investigating', 'planned']) },
                order: { createdAt: 'DESC' },
                take: 6,
            }),
            this.reportsRepo.count({
                where: {
                    status: (0, typeorm_2.In)(['open', 'investigating', 'planned']),
                    priority: (0, typeorm_2.In)(['high', 'blocking']),
                },
            }),
            logRepo.find({
                where: { action: (0, typeorm_2.In)(MODERATION_ACTIONS) },
                order: { createdAt: 'DESC' },
                take: 12,
            }),
        ]);
        const reportCounts = await this.reportsRepo
            .createQueryBuilder('report')
            .select('report.status', 'status')
            .addSelect('COUNT(report.id)', 'count')
            .where('report.status IN (:...statuses)', {
            statuses: ['open', 'investigating', 'planned'],
        })
            .groupBy('report.status')
            .getRawMany();
        const countsByStatus = reportCounts.reduce((acc, row) => {
            acc[row.status] = Number(row.count ?? 0);
            return acc;
        }, {});
        return {
            generatedAt: new Date().toISOString(),
            totals: {
                activeSuspensions: activeSuspensions.length,
                activeMarketBlocks: activeMarketBlocks.length,
                hiddenListings: hiddenListingsTotal,
                openReports: Object.values(countsByStatus).reduce((sum, value) => sum + value, 0),
                urgentReports: urgentReportsTotal,
            },
            reportCounts: countsByStatus,
            activeSuspensions: activeSuspensions.map((user) => this.mapModeratedUser(user)),
            activeMarketBlocks: activeMarketBlocks.map((user) => this.mapModeratedUser(user)),
            hiddenListings: hiddenListings.map((listing) => this.mapModerationListing(listing)),
            recentReports: openReports.map((report) => ({
                id: report.id,
                userId: report.userId,
                usernameSnapshot: report.usernameSnapshot,
                page: report.page,
                feature: report.feature,
                priority: report.priority,
                status: report.status,
                createdAt: report.createdAt,
            })),
            recentActions: moderationLogs.map((log) => ({
                id: log.id,
                userId: log.userId,
                relatedUserId: log.relatedUserId,
                action: log.action,
                status: log.status,
                severity: log.severity,
                targetType: log.targetType,
                targetId: log.targetId,
                reason: log.reason,
                metadata: log.metadata,
                createdAt: log.createdAt,
            })),
        };
    }
    async suspendUser(adminUser, userId, input) {
        const target = await this.getModerationTarget(adminUser, userId);
        const reason = this.requireReason(input.reason);
        const until = this.resolveModerationUntil(input);
        target.suspendedUntil = until;
        target.suspensionReason = reason;
        await this.usersRepo.save(target);
        await this.antiAbuseService.logAction({
            userId: adminUser.id,
            relatedUserId: target.id,
            action: 'ADMIN_USER_SUSPEND',
            status: 'allowed',
            severity: 'danger',
            targetType: 'user',
            targetId: target.id,
            reason,
            metadata: {
                adminUsername: adminUser.username,
                targetUsername: target.username,
                until,
            },
        });
        return {
            message: 'Compte suspendu et action journalisée.',
            user: this.mapModeratedUser(target),
        };
    }
    async clearUserSuspension(adminUser, userId, reason) {
        const target = await this.getModerationTarget(adminUser, userId);
        const safeReason = this.requireReason(reason);
        const previousUntil = target.suspendedUntil;
        target.suspendedUntil = null;
        target.suspensionReason = null;
        await this.usersRepo.save(target);
        await this.antiAbuseService.logAction({
            userId: adminUser.id,
            relatedUserId: target.id,
            action: 'ADMIN_USER_UNSUSPEND',
            status: 'allowed',
            severity: 'watch',
            targetType: 'user',
            targetId: target.id,
            reason: safeReason,
            metadata: {
                adminUsername: adminUser.username,
                targetUsername: target.username,
                previousUntil,
            },
        });
        return {
            message: 'Suspension retirée et action journalisée.',
            user: this.mapModeratedUser(target),
        };
    }
    async blockUserMarket(adminUser, userId, input) {
        const target = await this.getModerationTarget(adminUser, userId);
        const reason = this.requireReason(input.reason);
        const until = this.resolveModerationUntil(input);
        target.marketBlockedUntil = until;
        target.marketBlockReason = reason;
        await this.usersRepo.save(target);
        await this.antiAbuseService.logAction({
            userId: adminUser.id,
            relatedUserId: target.id,
            action: 'ADMIN_MARKET_BLOCK',
            status: 'allowed',
            severity: 'watch',
            targetType: 'user',
            targetId: target.id,
            reason,
            metadata: {
                adminUsername: adminUser.username,
                targetUsername: target.username,
                until,
            },
        });
        return {
            message: 'Market du joueur bloqué et action journalisée.',
            user: this.mapModeratedUser(target),
        };
    }
    async clearUserMarketBlock(adminUser, userId, reason) {
        const target = await this.getModerationTarget(adminUser, userId);
        const safeReason = this.requireReason(reason);
        const previousUntil = target.marketBlockedUntil;
        target.marketBlockedUntil = null;
        target.marketBlockReason = null;
        await this.usersRepo.save(target);
        await this.antiAbuseService.logAction({
            userId: adminUser.id,
            relatedUserId: target.id,
            action: 'ADMIN_MARKET_UNBLOCK',
            status: 'allowed',
            severity: 'info',
            targetType: 'user',
            targetId: target.id,
            reason: safeReason,
            metadata: {
                adminUsername: adminUser.username,
                targetUsername: target.username,
                previousUntil,
            },
        });
        return {
            message: 'Blocage market retiré et action journalisée.',
            user: this.mapModeratedUser(target),
        };
    }
    async hideMarketListing(adminUser, listingId, reason) {
        const safeListingId = this.assertPositiveInt(listingId, 'listingId');
        const safeReason = this.requireReason(reason);
        const result = await this.dataSource.transaction(async (manager) => {
            const listingRepo = manager.getRepository(market_listing_entity_1.MarketListing);
            const userCardRepo = manager.getRepository(user_card_entity_1.UserCard);
            const listing = await listingRepo
                .createQueryBuilder('listing')
                .leftJoinAndSelect('listing.seller', 'seller')
                .leftJoinAndSelect('listing.card', 'card')
                .leftJoinAndSelect('listing.wantedCard', 'wantedCard')
                .setLock('pessimistic_write')
                .where('listing.id = :listingId', { listingId: safeListingId })
                .getOne();
            if (!listing)
                throw new common_1.NotFoundException('Annonce introuvable.');
            if (listing.status !== market_listing_status_enum_1.MarketListingStatus.ACTIVE) {
                throw new common_1.BadRequestException('Seules les annonces actives peuvent être masquées.');
            }
            const unlockedQuantity = listing.remainingQuantity;
            const sellerCard = await this.findUserCardForUpdate(userCardRepo, listing.seller.id, listing.card.id);
            if (!sellerCard) {
                throw new common_1.NotFoundException('Inventaire vendeur introuvable.');
            }
            sellerCard.quantityLocked = Math.max(0, sellerCard.quantityLocked - unlockedQuantity);
            listing.status = market_listing_status_enum_1.MarketListingStatus.HIDDEN;
            listing.remainingQuantity = 0;
            listing.closedAt = new Date();
            await userCardRepo.save(sellerCard);
            await listingRepo.save(listing);
            return {
                listingId: listing.id,
                sellerId: listing.seller.id,
                sellerUsername: listing.seller.username,
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
            action: 'ADMIN_LISTING_HIDE',
            status: 'allowed',
            severity: 'watch',
            targetType: 'listing',
            targetId: result.listingId,
            reason: safeReason,
            metadata: {
                adminUsername: adminUser.username,
                sellerUsername: result.sellerUsername,
                cardName: result.cardName,
                unlockedQuantity: result.unlockedQuantity,
                status: result.status,
                closedAt: result.closedAt,
            },
        });
        return {
            message: 'Annonce masquée et copies déverrouillées.',
            listing: result,
        };
    }
    async getEconomyLogs(params = {}) {
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
    async getBackupExport(scope, days = 30) {
        const safeScope = this.normalizeBackupScope(scope);
        const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
        const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
        const includeAll = safeScope === 'all';
        const [economicLogs, sales, users, collections, openings,] = await Promise.all([
            includeAll || safeScope === 'logs'
                ? this.buildEconomicLogsBackup(since)
                : Promise.resolve(null),
            includeAll || safeScope === 'sales'
                ? this.buildSalesBackup(since)
                : Promise.resolve(null),
            includeAll || safeScope === 'users'
                ? this.buildUsersBackup()
                : Promise.resolve(null),
            includeAll || safeScope === 'collections'
                ? this.buildCollectionsBackup()
                : Promise.resolve(null),
            includeAll || safeScope === 'openings'
                ? this.buildOpeningsBackup(since)
                : Promise.resolve(null),
        ]);
        return {
            exportedAt: new Date().toISOString(),
            scope: safeScope,
            days: safeDays,
            since: since.toISOString(),
            note: "Export admin sans secrets: aucun hash de mot de passe, code email/reset ou mot de passe admin n'est inclus.",
            economicLogs,
            sales,
            users,
            collections,
            openings,
        };
    }
    buildBackupExportCsv(exportData) {
        const rows = [
            [
                'section',
                'id',
                'type',
                'user_id',
                'username',
                'related_user_id',
                'card_id',
                'label',
                'quantity',
                'credits',
                'status',
                'date',
                'details_json',
            ],
        ];
        for (const log of exportData.economicLogs ?? []) {
            rows.push([
                'economic_log',
                log.id,
                log.action,
                log.userId,
                '',
                log.relatedUserId,
                log.cardId,
                log.reason,
                '',
                log.valueCredits,
                `${log.status}/${log.severity}`,
                log.createdAt,
                log,
            ]);
        }
        for (const sale of exportData.sales ?? []) {
            rows.push([
                'sale',
                sale.id,
                sale.transactionType,
                sale.buyerId,
                sale.buyerUsername,
                sale.sellerId,
                sale.cardId,
                sale.cardName,
                sale.quantity,
                sale.totalPriceCredits,
                sale.offerType,
                sale.createdAt,
                sale,
            ]);
        }
        for (const user of exportData.users ?? []) {
            rows.push([
                'user',
                user.id,
                user.role,
                user.id,
                user.username,
                '',
                '',
                user.email,
                '',
                user.credits,
                user.emailVerified ? 'verified' : 'not_verified',
                user.createdAt,
                user,
            ]);
        }
        for (const item of exportData.collections ?? []) {
            rows.push([
                'collection',
                `${item.userId}-${item.cardId}`,
                item.cardRarity,
                item.userId,
                item.username,
                '',
                item.cardId,
                item.cardName,
                item.quantity,
                '',
                `locked=${item.quantityLocked}`,
                '',
                item,
            ]);
        }
        for (const opening of exportData.openings?.boosters ?? []) {
            rows.push([
                'opening_booster',
                opening.id,
                opening.seasonLabel,
                opening.userId,
                opening.username,
                '',
                '',
                opening.seasonLabel,
                opening.cardCount,
                opening.creditsEarned,
                `${opening.newCount} new / ${opening.hitCount} hits`,
                opening.openedAt,
                opening,
            ]);
        }
        for (const opening of exportData.openings?.displays ?? []) {
            rows.push([
                'opening_display',
                opening.id,
                opening.seasonLabel,
                opening.userId,
                opening.username,
                '',
                '',
                opening.seasonLabel,
                opening.cardCount,
                opening.creditsEarned,
                `${opening.newCount} new / ${opening.hitCount} hits`,
                opening.openedAt,
                opening,
            ]);
        }
        return rows
            .map((row) => row
            .map((value) => typeof value === 'object' && value !== null
            ? this.csvValue(JSON.stringify(value))
            : this.csvValue(value))
            .join(','))
            .join('\n');
    }
    buildEconomyExportCsv(exportData) {
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
    async getModerationTarget(adminUser, userId) {
        const safeUserId = this.assertPositiveInt(userId, 'userId');
        if (safeUserId === adminUser.id) {
            throw new common_1.BadRequestException('Tu ne peux pas modérer ton propre compte admin.');
        }
        const target = await this.usersRepo.findOne({ where: { id: safeUserId } });
        if (!target)
            throw new common_1.NotFoundException('Utilisateur introuvable.');
        if (target.role === 'admin') {
            throw new common_1.BadRequestException('La modération directe d’un compte admin est refusée.');
        }
        return target;
    }
    resolveModerationUntil(input) {
        const rawUntil = String(input.until ?? '').trim();
        const durationHours = Number(input.durationHours ?? 24);
        const now = Date.now();
        const until = rawUntil
            ? new Date(rawUntil)
            : new Date(now + durationHours * 60 * 60 * 1000);
        if (!Number.isFinite(durationHours) || durationHours <= 0) {
            throw new common_1.BadRequestException('La durée doit être supérieure à 0 heure.');
        }
        if (Number.isNaN(until.getTime()) || until.getTime() <= now) {
            throw new common_1.BadRequestException('La date de fin doit être dans le futur.');
        }
        const maxUntil = now + 365 * 24 * 60 * 60 * 1000;
        if (until.getTime() > maxUntil) {
            throw new common_1.BadRequestException('La durée maximale de modération est de 365 jours.');
        }
        return until;
    }
    mapModeratedUser(user) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            suspendedUntil: user.suspendedUntil,
            suspensionReason: user.suspensionReason,
            marketBlockedUntil: user.marketBlockedUntil,
            marketBlockReason: user.marketBlockReason,
            createdAt: user.createdAt,
        };
    }
    mapModerationListing(listing) {
        return {
            id: listing.id,
            sellerId: listing.seller?.id ?? null,
            sellerUsername: listing.seller?.username ?? null,
            cardId: listing.card?.id ?? null,
            cardName: listing.card?.name ?? null,
            rarity: listing.card?.rarity ?? null,
            status: listing.status,
            quantity: listing.quantity,
            remainingQuantity: listing.remainingQuantity,
            priceCredits: listing.priceCredits,
            createdAt: listing.createdAt,
            closedAt: listing.closedAt,
        };
    }
    assertPositiveInt(value, field) {
        const num = Number(value);
        if (!Number.isInteger(num) || num < 1) {
            throw new common_1.BadRequestException(`${field} doit être un entier positif.`);
        }
        return num;
    }
    assertNonNegativeInt(value, field) {
        const num = Number(value);
        if (!Number.isInteger(num) || num < 0) {
            throw new common_1.BadRequestException(`${field} doit être un entier positif ou nul.`);
        }
        return num;
    }
    requireReason(reason) {
        const value = String(reason ?? '').trim();
        if (value.length < 6) {
            throw new common_1.BadRequestException('Une raison claire est obligatoire pour toute correction admin.');
        }
        return value.slice(0, 255);
    }
    findUserCardForUpdate(repo, userId, cardId) {
        return repo
            .createQueryBuilder('uc')
            .leftJoinAndSelect('uc.user', 'user')
            .leftJoinAndSelect('uc.card', 'card')
            .setLock('pessimistic_write')
            .where('user.id = :userId', { userId })
            .andWhere('card.id = :cardId', { cardId })
            .getOne();
    }
    async getOrCreateUserCardForUpdate(repo, userId, cardId) {
        const existing = await this.findUserCardForUpdate(repo, userId, cardId);
        if (existing)
            return existing;
        return repo.create({
            user: { id: userId },
            card: { id: cardId },
            quantity: 0,
            quantityLocked: 0,
        });
    }
    async getOrCreateEconomyForUpdate(repo, userId) {
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
    getCardSeasonGroup(card) {
        const seasonNumber = this.normalizePositiveInt(card.seasonNumber);
        if (seasonNumber) {
            return {
                key: `season-${seasonNumber}`,
                label: card.extension?.trim() || card.season?.trim() || `Saison ${seasonNumber}`,
            };
        }
        return {
            key: 'special',
            label: 'Hors série',
        };
    }
    getCardImageStatus(imageUrl) {
        const rawUrl = String(imageUrl ?? '').trim();
        if (!rawUrl) {
            return {
                exists: false,
                status: 'missing',
                path: null,
            };
        }
        if (/^https?:\/\//i.test(rawUrl)) {
            return {
                exists: true,
                status: 'external',
                path: rawUrl,
            };
        }
        const normalized = rawUrl
            .replace(/^\/+/, '')
            .replace(/^api\/+/i, '')
            .replace(/\\/g, '/');
        const candidates = [
            path.join(process.cwd(), 'public', normalized),
            path.join(process.cwd(), normalized),
        ];
        const exists = candidates.some((candidate) => fs.existsSync(candidate));
        return {
            exists,
            status: exists ? 'ok' : 'missing',
            path: normalized,
        };
    }
    getCardAvailability(card) {
        const seasonNumber = this.normalizePositiveInt(card.seasonNumber);
        const affiliatedSeasonNumber = this.normalizePositiveInt(card.affiliatedSeasonNumber);
        const rarity = this.normalizeText(card.rarity);
        const category = this.normalizeText(card.specialCategory);
        const sourceRarity = this.normalizeText(card.sourceRarity);
        const sourceRaritySlug = this.normalizeText(card.sourceRaritySlug);
        const type = this.normalizeText(card.type);
        const tokens = [rarity, category, sourceRarity, sourceRaritySlug, type].join(' ');
        const isBoosterGold = tokens.includes('booster') && tokens.includes('gold');
        const isTicketOr = rarity === "ticket d'or" ||
            rarity === 'ticket d or' ||
            category === "ticket d'or" ||
            category === 'ticket d or' ||
            sourceRarity === "ticket d'or" ||
            sourceRarity === 'ticket d or';
        const isGagnantTicketOr = tokens.includes('gagnant') && tokens.includes('ticket') && tokens.includes('or');
        if (isBoosterGold) {
            return {
                obtainable: true,
                boosterAvailable: true,
                source: 'Booster Gold',
                reason: 'Carte disponible via les boosters Gold.',
            };
        }
        if (isTicketOr) {
            return {
                obtainable: true,
                boosterAvailable: true,
                source: '11e carte bonus',
                reason: "Ticket d'or disponible dans le slot bonus très rare.",
            };
        }
        if (isGagnantTicketOr) {
            const label = affiliatedSeasonNumber
                ? `Saison ${affiliatedSeasonNumber}`
                : 'saison affiliée';
            return {
                obtainable: true,
                boosterAvailable: true,
                source: `11e carte bonus ${label}`,
                reason: "Carte gagnant Ticket d'or disponible dans le slot bonus de sa saison affiliée.",
            };
        }
        const isSpecialPack = card.specialEdition ||
            rarity.includes('starter pack') ||
            category.includes('starter pack') ||
            sourceRarity.includes('starter pack') ||
            sourceRaritySlug.includes('starter pack') ||
            category.includes('pgw') ||
            sourceRaritySlug.includes('pgw') ||
            category.includes('noel') ||
            sourceRaritySlug.includes('noel') ||
            category.includes('gemmes') ||
            sourceRaritySlug.includes('gemmes') ||
            category.includes('edition speciale') ||
            sourceRaritySlug.includes('edition speciale') ||
            rarity.includes('carte speciale') ||
            sourceRarity.includes('carte speciale');
        if (isSpecialPack) {
            return {
                obtainable: false,
                boosterAvailable: false,
                source: 'Hors série',
                reason: "Carte hors série non distribuée dans les boosters pour le moment.",
            };
        }
        const isDuo = rarity === 'duo' || rarity.includes('carte duo');
        if (isDuo) {
            const isLegacyDuo = seasonNumber === 5;
            return {
                obtainable: isLegacyDuo,
                boosterAvailable: isLegacyDuo,
                source: isLegacyDuo ? 'Boosters Legacy' : 'Non configuré',
                reason: isLegacyDuo
                    ? 'Carte Duo disponible uniquement dans les boosters/display Legacy.'
                    : 'Rareté Duo non configurée pour cette saison.',
            };
        }
        if (seasonNumber) {
            return {
                obtainable: true,
                boosterAvailable: true,
                source: `Boosters saison ${seasonNumber}`,
                reason: 'Carte de saison disponible dans les boosters et displays de sa saison.',
            };
        }
        return {
            obtainable: false,
            boosterAvailable: false,
            source: 'Non obtenable',
            reason: "Aucun mode d'obtention automatique configuré.",
        };
    }
    normalizePositiveInt(value) {
        const num = Number(value);
        return Number.isInteger(num) && num > 0 ? num : null;
    }
    normalizeText(value) {
        return (value ?? '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[’]/g, "'")
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    isPushSubscriptionExpired(subscription, nowMs = Date.now()) {
        const expirationMs = Number(subscription.expirationTime ?? 0);
        return Number.isFinite(expirationMs) && expirationMs > 0 && expirationMs <= nowMs;
    }
    hasPushSubscriptionRecentFailure(subscription) {
        if (!subscription.lastFailureAt)
            return false;
        if (!subscription.lastSuccessfulPushAt)
            return true;
        return (new Date(subscription.lastFailureAt).getTime() >
            new Date(subscription.lastSuccessfulPushAt).getTime());
    }
    buildPushDeliveryKindStats(logs) {
        const byKind = new Map();
        for (const log of logs) {
            const key = log.kind || 'unknown';
            const current = byKind.get(key) ??
                {
                    kind: key,
                    sent: 0,
                    failed: 0,
                    total: 0,
                    failureRatePercent: 0,
                    lastSentAt: null,
                    lastFailureAt: null,
                };
            current.total += 1;
            if (log.status === 'sent') {
                current.sent += 1;
                if (!current.lastSentAt || log.createdAt > current.lastSentAt) {
                    current.lastSentAt = log.createdAt;
                }
            }
            else {
                current.failed += 1;
                if (!current.lastFailureAt || log.createdAt > current.lastFailureAt) {
                    current.lastFailureAt = log.createdAt;
                }
            }
            current.failureRatePercent =
                current.total > 0
                    ? Number(((current.failed / current.total) * 100).toFixed(2))
                    : 0;
            byKind.set(key, current);
        }
        return Array.from(byKind.values()).sort((a, b) => b.total - a.total);
    }
    mapPushDeliveryLog(log) {
        return {
            id: log.id,
            userId: log.userId,
            subscriptionId: log.subscriptionId,
            endpointHash: log.endpointHash,
            kind: log.kind,
            tag: log.tag,
            title: log.title,
            url: log.url,
            status: log.status,
            statusCode: log.statusCode,
            errorMessage: log.errorMessage,
            createdAt: log.createdAt,
        };
    }
    mapPushSubscriptionRisk(subscription, nowMs = Date.now()) {
        const expired = this.isPushSubscriptionExpired(subscription, nowMs);
        const failed = this.hasPushSubscriptionRecentFailure(subscription);
        const expirationMs = Number(subscription.expirationTime ?? 0);
        return {
            id: subscription.id,
            userId: subscription.user?.id ?? null,
            username: subscription.user?.username ?? null,
            endpointHash: subscription.endpointHash,
            endpointPreview: `${subscription.endpoint.slice(0, 32)}...`,
            userAgent: subscription.userAgent,
            expired,
            failed,
            status: expired ? 'expired' : failed ? 'failed' : 'stale',
            expirationTime: Number.isFinite(expirationMs) && expirationMs > 0
                ? new Date(expirationMs).toISOString()
                : null,
            lastSuccessfulPushAt: subscription.lastSuccessfulPushAt,
            lastFailureAt: subscription.lastFailureAt,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
        };
    }
    normalizeBackupScope(scope) {
        const value = String(scope ?? 'all').trim().toLowerCase();
        const allowed = [
            'all',
            'logs',
            'sales',
            'users',
            'collections',
            'openings',
        ];
        return allowed.includes(value)
            ? value
            : 'all';
    }
    async buildEconomicLogsBackup(since) {
        const repo = this.dataSource.getRepository(economic_action_log_entity_1.EconomicActionLog);
        const rows = await repo.find({
            where: { createdAt: (0, typeorm_2.MoreThanOrEqual)(since) },
            order: { createdAt: 'DESC' },
        });
        return rows.map((row) => ({
            id: row.id,
            userId: row.userId,
            relatedUserId: row.relatedUserId,
            cardId: row.cardId,
            action: row.action,
            status: row.status,
            severity: row.severity,
            targetType: row.targetType,
            targetId: row.targetId,
            valueCredits: row.valueCredits,
            reason: row.reason,
            metadata: row.metadata,
            createdAt: row.createdAt,
        }));
    }
    async buildSalesBackup(since) {
        const repo = this.dataSource.getRepository(market_transaction_entity_1.MarketTransaction);
        const rows = await repo.find({
            where: { createdAt: (0, typeorm_2.MoreThanOrEqual)(since) },
            relations: ['listing', 'seller', 'buyer', 'card', 'buyerOfferedCard'],
            order: { createdAt: 'DESC' },
        });
        return rows.map((tx) => ({
            id: tx.id,
            listingId: tx.listing?.id ?? null,
            sellerId: tx.seller?.id ?? null,
            sellerUsername: tx.seller?.username ?? null,
            buyerId: tx.buyer?.id ?? null,
            buyerUsername: tx.buyer?.username ?? null,
            cardId: tx.card?.id ?? null,
            cardKey: tx.card?.key ?? null,
            cardName: tx.card?.name ?? null,
            cardRarity: tx.card?.rarity ?? null,
            listingMode: tx.listingMode,
            offerType: tx.offerType,
            quantity: tx.quantity,
            unitPriceCredits: tx.unitPriceCredits,
            totalPriceCredits: tx.totalPriceCredits,
            buyerOfferedCardId: tx.buyerOfferedCard?.id ?? null,
            buyerOfferedCardName: tx.buyerOfferedCard?.name ?? null,
            buyerOfferedCardQuantity: tx.buyerOfferedCardQuantity,
            transactionType: tx.transactionType,
            sellerRewardClaimedAt: tx.sellerRewardClaimedAt,
            createdAt: tx.createdAt,
        }));
    }
    async buildUsersBackup() {
        const economyRepo = this.dataSource.getRepository(user_economy_entity_1.UserEconomy);
        const [users, economies] = await Promise.all([
            this.usersRepo.find({ order: { id: 'ASC' } }),
            economyRepo.find(),
        ]);
        const economiesByUserId = new Map(economies.map((row) => [row.userId, row]));
        return users.map((user) => {
            const economy = economiesByUserId.get(user.id);
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                credits: economy?.credits ?? 0,
                freeBoosterCharges: economy?.freeBoosterCharges ?? 0,
                freeDisplayCharges: economy?.freeDisplayCharges ?? 0,
                boosterRechargeAt: economy?.boosterRechargeAt ?? null,
                displayRechargeAt: economy?.displayRechargeAt ?? null,
                signupBonusGranted: economy?.signupBonusGranted ?? 0,
            };
        });
    }
    async buildCollectionsBackup() {
        const repo = this.dataSource.getRepository(user_card_entity_1.UserCard);
        const rows = await repo.find({
            relations: ['user', 'card'],
            order: { id: 'ASC' },
        });
        return rows.map((row) => ({
            id: row.id,
            userId: row.user?.id ?? null,
            username: row.user?.username ?? null,
            cardId: row.card?.id ?? null,
            cardKey: row.card?.key ?? null,
            cardName: row.card?.name ?? null,
            cardNumber: row.card?.displayNumber ?? row.card?.number ?? null,
            cardRarity: row.card?.rarity ?? null,
            cardSeason: row.card?.season ?? row.card?.extension ?? null,
            cardSeasonNumber: row.card?.seasonNumber ?? row.card?.affiliatedSeasonNumber ?? null,
            quantity: row.quantity,
            quantityLocked: row.quantityLocked,
        }));
    }
    async buildOpeningsBackup(since) {
        const boosterRepo = this.dataSource.getRepository(booster_opening_entity_1.BoosterOpening);
        const displayRepo = this.dataSource.getRepository(display_opening_entity_1.DisplayOpening);
        const [boosters, displays] = await Promise.all([
            boosterRepo.find({
                where: { openedAt: (0, typeorm_2.MoreThanOrEqual)(since) },
                relations: ['user'],
                order: { openedAt: 'DESC' },
            }),
            displayRepo.find({
                where: { openedAt: (0, typeorm_2.MoreThanOrEqual)(since) },
                relations: ['user'],
                order: { openedAt: 'DESC' },
            }),
        ]);
        return {
            boosters: boosters.map((opening) => ({
                id: opening.id,
                userId: opening.user?.id ?? null,
                username: opening.user?.username ?? null,
                openedAt: opening.openedAt,
                seasonNumber: opening.seasonNumber,
                seasonLabel: opening.seasonLabel,
                boosterCount: opening.boosterCount,
                cardIds: opening.cardIds,
                cardCount: Array.isArray(opening.cardIds) ? opening.cardIds.length : 0,
                creditsEarned: this.extractOpeningCredits(opening.resultJson),
                newCount: this.extractOpeningNewCount(opening.resultJson),
                hitCount: this.extractOpeningHitCount(opening.resultJson),
                resultJson: opening.resultJson,
            })),
            displays: displays.map((opening) => ({
                id: opening.id,
                userId: opening.user?.id ?? null,
                username: opening.user?.username ?? null,
                openedAt: opening.openedAt,
                seasonNumber: opening.seasonNumber,
                seasonLabel: opening.season,
                boosterCount: opening.boosterCount,
                cardCount: this.extractOpeningCardCount(opening.resultJson),
                creditsEarned: this.extractOpeningCredits(opening.resultJson),
                newCount: this.extractOpeningNewCount(opening.resultJson),
                hitCount: this.extractOpeningHitCount(opening.resultJson),
                resultJson: opening.resultJson,
            })),
        };
    }
    extractOpeningCredits(result) {
        const candidates = [
            result?.creditsEarnedTotal,
            result?.creditsEarned,
            result?.creditsGained,
            result?.totalCredits,
            result?.credits?.total,
            result?.breakdown?.total,
            result?.economy?.earnedCredits,
            result?.economy?.creditsEarned,
            result?.economy?.totalEarned,
        ];
        for (const value of candidates) {
            const n = Number(value ?? 0);
            if (Number.isFinite(n) && n > 0)
                return Math.round(n);
        }
        return 0;
    }
    extractOpeningNewCount(result) {
        if (Number.isFinite(Number(result?.newCount)))
            return Number(result.newCount);
        return this.flattenOpeningCards(result).filter((card) => card?.isNew).length;
    }
    extractOpeningHitCount(result) {
        if (Number.isFinite(Number(result?.hitCount)))
            return Number(result.hitCount);
        return this.flattenOpeningCards(result).filter((card) => card?.isHit).length;
    }
    extractOpeningCardCount(result) {
        return this.flattenOpeningCards(result).length;
    }
    flattenOpeningCards(result) {
        const cards = [];
        if (Array.isArray(result?.cards)) {
            cards.push(...result.cards);
        }
        if (Array.isArray(result?.boosters)) {
            for (const booster of result.boosters) {
                if (Array.isArray(booster)) {
                    cards.push(...booster);
                }
                else if (Array.isArray(booster?.cards)) {
                    cards.push(...booster.cards);
                }
            }
        }
        return cards;
    }
    csvValue(value) {
        const text = String(value ?? '');
        if (!/[",\n\r]/.test(text))
            return text;
        return `"${text.replace(/"/g, '""')}"`;
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(bug_report_entity_1.BugReport)),
    __param(2, (0, typeorm_1.InjectRepository)(bug_report_status_history_entity_1.BugReportStatusHistory)),
    __param(3, (0, typeorm_1.InjectRepository)(market_listing_entity_1.MarketListing)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        jwt_1.JwtService,
        economy_analytics_service_1.EconomyAnalyticsService,
        anti_abuse_service_1.AntiAbuseService])
], AdminService);
//# sourceMappingURL=admin.service.js.map