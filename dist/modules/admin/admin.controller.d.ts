import type { Response } from 'express';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    adminLogin(currentUser: {
        id: number;
        username: string;
        role: string;
    }, dto: AdminLoginDto): Promise<{
        admin_access_token: string;
        admin_refresh_token: string;
        admin_refresh_expires_in: import("ms").StringValue;
    }>;
    refreshAdminSession(dto: AdminRefreshDto): Promise<{
        admin_access_token: string;
        admin_refresh_token: string;
        admin_refresh_expires_in: import("ms").StringValue;
    }>;
    getAllTickets(status?: string, handledBy?: string, page?: string, pageSize?: string): Promise<{
        items: {
            id: number;
            userId: number;
            usernameSnapshot: string;
            emailSnapshot: string;
            category: string;
            page: string;
            feature: string;
            priority: string;
            description: string;
            reproductionSteps: string | null;
            currentUrl: string | null;
            browserInfo: string | null;
            screenshotUrl: string | null;
            status: import("../report/bug-report.entity").BugReportStatus;
            resolutionNote: string | null;
            treatedAt: Date | null;
            treatedBy: string | null;
            fixedAt: Date | null;
            fixedBy: string | null;
            closedAt: Date | null;
            closedBy: string | null;
            lastStatusChangedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            histories: {
                id: number;
                fromStatus: string | null;
                toStatus: string;
                note: string | null;
                changedBy: string;
                changedAt: Date;
            }[];
        }[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
        filters: {
            status: string | null;
            handledBy: string | null;
        };
        adminUsers: string[];
    }>;
    updateTicketStatus(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, dto: UpdateTicketStatusDto): Promise<{
        message: string;
        item: {
            id: number;
            userId: number;
            usernameSnapshot: string;
            emailSnapshot: string;
            category: string;
            page: string;
            feature: string;
            priority: string;
            description: string;
            reproductionSteps: string | null;
            currentUrl: string | null;
            browserInfo: string | null;
            screenshotUrl: string | null;
            status: import("../report/bug-report.entity").BugReportStatus;
            resolutionNote: string | null;
            treatedAt: Date | null;
            treatedBy: string | null;
            fixedAt: Date | null;
            fixedBy: string | null;
            closedAt: Date | null;
            closedBy: string | null;
            lastStatusChangedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            histories: {
                id: number;
                fromStatus: string | null;
                toStatus: string;
                note: string | null;
                changedBy: string;
                changedAt: Date;
            }[];
        };
    }>;
    getEconomyOverview(days?: string): Promise<{
        security: {
            totals: {
                allowed: number;
                flagged: number;
                blocked: number;
                danger: number;
            };
            byAction: {
                action: string;
                status: import("../security/economic-action-log.entity").EconomicActionStatus;
                severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
                count: number;
            }[];
            recentEvents: {
                id: number;
                userId: number | null;
                username: string | null;
                relatedUserId: number | null;
                relatedUsername: string | null;
                cardId: number | null;
                cardKey: string | null;
                cardName: string | null;
                cardRarity: string | null;
                action: string;
                status: import("../security/economic-action-log.entity").EconomicActionStatus;
                severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
                targetType: string | null;
                targetId: number | null;
                valueCredits: number;
                reason: string | null;
                metadata: Record<string, any> | null;
                createdAt: Date;
            }[];
            alerts: {
                id: number;
                userId: number | null;
                username: string | null;
                relatedUserId: number | null;
                relatedUsername: string | null;
                cardId: number | null;
                cardKey: string | null;
                cardName: string | null;
                cardRarity: string | null;
                action: string;
                status: import("../security/economic-action-log.entity").EconomicActionStatus;
                severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
                targetType: string | null;
                targetId: number | null;
                valueCredits: number;
                reason: string | null;
                metadata: Record<string, any> | null;
                createdAt: Date;
            }[];
        };
        days: number;
        rows: import("../economy/economy-daily-stats.entity").EconomyDailyStats[];
        totals: {
            creditsSpent: number;
            creditsEarned: number;
            creditsEarnedOpening: number;
            creditsEarnedQuickSell: number;
            creditsEarnedJackpot: number;
            marketVolume: number;
        };
        inflation: number;
        advanced: {
            health: {
                creditsCreated: number;
                creditsCreatedOpening: number;
                creditsCreatedQuickSell: number;
                creditsCreatedJackpot: number;
                creditsDestroyed: number;
                netInflation: number;
                inflationRatePercent: number;
                marketVolume: number;
                quickSellToMarketPercent: number;
                quickSellShareOfCreatedPercent: number;
                openingShareOfCreatedPercent: number;
                riskScore: number;
                riskLevel: string;
            };
            rarityProfitability: {
                rarity: string;
                saleCount: number;
                quantitySold: number;
                marketVolume: number;
                avgUnitPrice: number;
                avgMarketSnapshot: number;
                avgVsMarketPercent: number;
                openedCardsCount: number;
                estimatedOpeningRewards: number;
                estimatedRewardPerOpenedCard: number;
                score: number;
                status: string;
            }[];
            manipulatedCards: {
                cardId: number;
                cardName: any;
                rarity: string;
                saleCount: number;
                quantitySold: number;
                marketVolume: number;
                avgUnitPrice: number;
                avgMarketSnapshot: number;
                avgVsMarketPercent: number;
                outlierTrades: number;
                volatilityPercent: number;
                minPrice: number;
                maxPrice: number;
                priceSamples: number;
                lastActivityAt: any;
                score: number;
            }[];
            suspiciousUsers: {
                userId: number;
                username: string;
                score: number;
                reasons: string[];
                salesCount: number;
                purchasesCount: number;
                totalTrades: number;
                soldVolume: number;
                boughtVolume: number;
                totalVolume: number;
                listingCount: number;
                cancelledListings: number;
                activeListings: number;
                cancelRatePercent: number;
                openingCount: number;
                currentCredits: number;
                highDeviationTrades: number;
            }[];
        };
    }>;
    getSeasonCardsOverview(): Promise<{
        generatedAt: string;
        totals: {
            totalCards: number;
            obtainableCards: number;
            notObtainableCards: number;
            boosterAvailableCards: number;
            missingImages: number;
        };
        seasons: {
            key: string;
            label: string;
            seasonNumber: number | null;
            totalCards: number;
            obtainableCards: number;
            notObtainableCards: number;
            boosterAvailableCards: number;
            missingImages: number;
            rarityCounts: Record<string, number>;
        }[];
        rarities: string[];
        items: {
            id: number;
            key: string;
            name: string;
            number: number | null;
            displayNumber: string | null;
            rarity: string;
            type: string | null;
            gameplayType: string | null;
            specialEdition: boolean;
            specialCategory: string | null;
            sourceRarity: string | null;
            sourceRaritySlug: string | null;
            season: string | null;
            seasonNumber: number | null;
            extension: string | null;
            seasonGroupKey: string;
            seasonGroupLabel: string;
            affiliatedSeason: string | null;
            affiliatedSeasonNumber: number | null;
            affiliatedSeasonLabel: string | null;
            imageUrl: string;
            imageExists: boolean;
            imageStatus: string;
            imagePath: string | null;
            obtainable: boolean;
            boosterAvailable: boolean;
            availabilitySource: string;
            availabilityReason: string;
        }[];
    }>;
    getPwaMonitoring(days?: string): Promise<{
        generatedAt: string;
        days: number;
        totals: {
            subscribedUsers: number;
            totalSubscriptions: number;
            activeSubscriptions: number;
            expiredSubscriptions: number;
            failedSubscriptions: number;
            staleSubscriptions: number;
            notificationsSent: number;
            notificationsFailed: number;
            deliveryAttempts: number;
            failureRatePercent: number;
        };
        preferences: {
            total: number;
            saleRewardEnabled: number;
            freeOpeningsReadyEnabled: number;
            freeOpeningsSoonEnabled: number;
            watchlistPriceAlertEnabled: number;
            staleListingAlertEnabled: number;
            dailyMarketRecapEnabled: number;
        };
        byKind: {
            kind: string;
            sent: number;
            failed: number;
            total: number;
            failureRatePercent: number;
            lastSentAt: Date | null;
            lastFailureAt: Date | null;
        }[];
        recentFailures: {
            id: number;
            userId: number | null;
            subscriptionId: number | null;
            endpointHash: string | null;
            kind: string;
            tag: string | null;
            title: string | null;
            url: string | null;
            status: "sent" | "failed";
            statusCode: number | null;
            errorMessage: string | null;
            createdAt: Date;
        }[];
        atRiskSubscriptions: {
            id: number;
            userId: number;
            username: string;
            endpointHash: string;
            endpointPreview: string;
            userAgent: string | null;
            expired: boolean;
            failed: boolean;
            status: string;
            expirationTime: string | null;
            lastSuccessfulPushAt: Date | null;
            lastFailureAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    getModerationOverview(): Promise<{
        generatedAt: string;
        totals: {
            activeSuspensions: number;
            activeMarketBlocks: number;
            hiddenListings: number;
            openReports: number;
            urgentReports: number;
        };
        reportCounts: Record<string, number>;
        activeSuspensions: {
            id: number;
            username: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            suspendedUntil: Date | null;
            suspensionReason: string | null;
            marketBlockedUntil: Date | null;
            marketBlockReason: string | null;
            createdAt: Date;
        }[];
        activeMarketBlocks: {
            id: number;
            username: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            suspendedUntil: Date | null;
            suspensionReason: string | null;
            marketBlockedUntil: Date | null;
            marketBlockReason: string | null;
            createdAt: Date;
        }[];
        hiddenListings: {
            id: number;
            sellerId: number;
            sellerUsername: string;
            cardId: number;
            cardName: string;
            rarity: string;
            status: import("../market/market-listing-status.enum").MarketListingStatus;
            quantity: number;
            remainingQuantity: number;
            priceCredits: number;
            createdAt: Date;
            closedAt: Date | null;
        }[];
        recentReports: {
            id: number;
            userId: number;
            usernameSnapshot: string;
            page: string;
            feature: string;
            priority: string;
            status: import("../report/bug-report.entity").BugReportStatus;
            createdAt: Date;
        }[];
        recentActions: {
            id: number;
            userId: number | null;
            relatedUserId: number | null;
            action: string;
            status: import("../security/economic-action-log.entity").EconomicActionStatus;
            severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
            targetType: string | null;
            targetId: number | null;
            reason: string | null;
            metadata: Record<string, any> | null;
            createdAt: Date;
        }[];
    }>;
    suspendUser(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, body: {
        durationHours?: number;
        until?: string;
        reason?: string;
    }): Promise<{
        message: string;
        user: {
            id: number;
            username: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            suspendedUntil: Date | null;
            suspensionReason: string | null;
            marketBlockedUntil: Date | null;
            marketBlockReason: string | null;
            createdAt: Date;
        };
    }>;
    clearUserSuspension(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, body: {
        reason?: string;
    }): Promise<{
        message: string;
        user: {
            id: number;
            username: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            suspendedUntil: Date | null;
            suspensionReason: string | null;
            marketBlockedUntil: Date | null;
            marketBlockReason: string | null;
            createdAt: Date;
        };
    }>;
    blockUserMarket(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, body: {
        durationHours?: number;
        until?: string;
        reason?: string;
    }): Promise<{
        message: string;
        user: {
            id: number;
            username: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            suspendedUntil: Date | null;
            suspensionReason: string | null;
            marketBlockedUntil: Date | null;
            marketBlockReason: string | null;
            createdAt: Date;
        };
    }>;
    clearUserMarketBlock(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, body: {
        reason?: string;
    }): Promise<{
        message: string;
        user: {
            id: number;
            username: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            suspendedUntil: Date | null;
            suspensionReason: string | null;
            marketBlockedUntil: Date | null;
            marketBlockReason: string | null;
            createdAt: Date;
        };
    }>;
    hideMarketListing(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, body: {
        reason?: string;
    }): Promise<{
        message: string;
        listing: {
            listingId: number;
            sellerId: number;
            sellerUsername: string;
            cardId: number;
            cardName: string;
            unlockedQuantity: number;
            status: import("../market/market-listing-status.enum").MarketListingStatus.HIDDEN;
            closedAt: Date;
        };
    }>;
    getEconomyLogs(days?: string, page?: string, pageSize?: string, action?: string, status?: string, severity?: string, userId?: string, cardId?: string, targetType?: string, from?: string, to?: string): Promise<{
        items: {
            id: number;
            userId: number | null;
            username: string | null;
            relatedUserId: number | null;
            relatedUsername: string | null;
            cardId: number | null;
            cardKey: string | null;
            cardName: string | null;
            cardRarity: string | null;
            action: string;
            status: import("../security/economic-action-log.entity").EconomicActionStatus;
            severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
            targetType: string | null;
            targetId: number | null;
            valueCredits: number;
            reason: string | null;
            metadata: Record<string, any> | null;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
        filters: {
            days: number;
            from: string;
            to: string;
            action: string | null;
            status: import("../security/economic-action-log.entity").EconomicActionStatus | null;
            severity: import("../security/economic-action-log.entity").EconomicActionSeverity | null;
            userId: number | null;
            cardId: number | null;
            targetType: string | null;
        };
    }>;
    exportEconomy(days: string | undefined, format: string | undefined, res: Response): Promise<string | {
        exportedAt: string;
        days: number;
        overview: {
            security: {
                totals: {
                    allowed: number;
                    flagged: number;
                    blocked: number;
                    danger: number;
                };
                byAction: {
                    action: string;
                    status: import("../security/economic-action-log.entity").EconomicActionStatus;
                    severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
                    count: number;
                }[];
                recentEvents: {
                    id: number;
                    userId: number | null;
                    username: string | null;
                    relatedUserId: number | null;
                    relatedUsername: string | null;
                    cardId: number | null;
                    cardKey: string | null;
                    cardName: string | null;
                    cardRarity: string | null;
                    action: string;
                    status: import("../security/economic-action-log.entity").EconomicActionStatus;
                    severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
                    targetType: string | null;
                    targetId: number | null;
                    valueCredits: number;
                    reason: string | null;
                    metadata: Record<string, any> | null;
                    createdAt: Date;
                }[];
                alerts: {
                    id: number;
                    userId: number | null;
                    username: string | null;
                    relatedUserId: number | null;
                    relatedUsername: string | null;
                    cardId: number | null;
                    cardKey: string | null;
                    cardName: string | null;
                    cardRarity: string | null;
                    action: string;
                    status: import("../security/economic-action-log.entity").EconomicActionStatus;
                    severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
                    targetType: string | null;
                    targetId: number | null;
                    valueCredits: number;
                    reason: string | null;
                    metadata: Record<string, any> | null;
                    createdAt: Date;
                }[];
            };
            days: number;
            rows: import("../economy/economy-daily-stats.entity").EconomyDailyStats[];
            totals: {
                creditsSpent: number;
                creditsEarned: number;
                creditsEarnedOpening: number;
                creditsEarnedQuickSell: number;
                creditsEarnedJackpot: number;
                marketVolume: number;
            };
            inflation: number;
            advanced: {
                health: {
                    creditsCreated: number;
                    creditsCreatedOpening: number;
                    creditsCreatedQuickSell: number;
                    creditsCreatedJackpot: number;
                    creditsDestroyed: number;
                    netInflation: number;
                    inflationRatePercent: number;
                    marketVolume: number;
                    quickSellToMarketPercent: number;
                    quickSellShareOfCreatedPercent: number;
                    openingShareOfCreatedPercent: number;
                    riskScore: number;
                    riskLevel: string;
                };
                rarityProfitability: {
                    rarity: string;
                    saleCount: number;
                    quantitySold: number;
                    marketVolume: number;
                    avgUnitPrice: number;
                    avgMarketSnapshot: number;
                    avgVsMarketPercent: number;
                    openedCardsCount: number;
                    estimatedOpeningRewards: number;
                    estimatedRewardPerOpenedCard: number;
                    score: number;
                    status: string;
                }[];
                manipulatedCards: {
                    cardId: number;
                    cardName: any;
                    rarity: string;
                    saleCount: number;
                    quantitySold: number;
                    marketVolume: number;
                    avgUnitPrice: number;
                    avgMarketSnapshot: number;
                    avgVsMarketPercent: number;
                    outlierTrades: number;
                    volatilityPercent: number;
                    minPrice: number;
                    maxPrice: number;
                    priceSamples: number;
                    lastActivityAt: any;
                    score: number;
                }[];
                suspiciousUsers: {
                    userId: number;
                    username: string;
                    score: number;
                    reasons: string[];
                    salesCount: number;
                    purchasesCount: number;
                    totalTrades: number;
                    soldVolume: number;
                    boughtVolume: number;
                    totalVolume: number;
                    listingCount: number;
                    cancelledListings: number;
                    activeListings: number;
                    cancelRatePercent: number;
                    openingCount: number;
                    currentCredits: number;
                    highDeviationTrades: number;
                }[];
            };
        };
        recentEconomicLogs: {
            id: number;
            userId: number | null;
            username: string | null;
            relatedUserId: number | null;
            relatedUsername: string | null;
            cardId: number | null;
            cardKey: string | null;
            cardName: string | null;
            cardRarity: string | null;
            action: string;
            status: import("../security/economic-action-log.entity").EconomicActionStatus;
            severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
            targetType: string | null;
            targetId: number | null;
            valueCredits: number;
            reason: string | null;
            metadata: Record<string, any> | null;
            createdAt: Date;
        }[];
        rollbackReminder: {
            mode: string;
            note: string;
        };
    }>;
    exportBackup(scope: string | undefined, days: string | undefined, format: string | undefined, res: Response): Promise<string | {
        exportedAt: string;
        scope: "all" | "users" | "logs" | "sales" | "collections" | "openings";
        days: number;
        since: string;
        note: string;
        economicLogs: {
            id: number;
            userId: number | null;
            relatedUserId: number | null;
            cardId: number | null;
            action: string;
            status: import("../security/economic-action-log.entity").EconomicActionStatus;
            severity: import("../security/economic-action-log.entity").EconomicActionSeverity;
            targetType: string | null;
            targetId: number | null;
            valueCredits: number;
            reason: string | null;
            metadata: Record<string, any> | null;
            createdAt: Date;
        }[] | null;
        sales: {
            id: number;
            listingId: number;
            sellerId: number;
            sellerUsername: string;
            buyerId: number;
            buyerUsername: string;
            cardId: number;
            cardKey: string;
            cardName: string;
            cardRarity: string;
            listingMode: import("../market/market-listing-mode.enum").MarketListingMode;
            offerType: import("../market/market-offer-type.enum").MarketOfferType;
            quantity: number;
            unitPriceCredits: number;
            totalPriceCredits: number;
            buyerOfferedCardId: number | null;
            buyerOfferedCardName: string | null;
            buyerOfferedCardQuantity: number;
            transactionType: import("../market/market-transaction-type.enum").MarketTransactionType;
            sellerRewardClaimedAt: Date | null;
            createdAt: Date;
        }[] | null;
        users: {
            id: number;
            username: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            emailVerified: boolean;
            createdAt: Date;
            credits: number;
            freeBoosterCharges: number;
            freeDisplayCharges: number;
            boosterRechargeAt: Date | null;
            displayRechargeAt: Date | null;
            signupBonusGranted: number;
        }[] | null;
        collections: {
            id: number;
            userId: number;
            username: string;
            cardId: number;
            cardKey: string;
            cardName: string;
            cardNumber: string | number | null;
            cardRarity: string;
            cardSeason: string | null;
            cardSeasonNumber: number | null;
            quantity: number;
            quantityLocked: number;
        }[] | null;
        openings: {
            boosters: {
                id: number;
                userId: number;
                username: string;
                openedAt: Date;
                seasonNumber: number | null;
                seasonLabel: string | null;
                boosterCount: number;
                cardIds: number[];
                cardCount: number;
                creditsEarned: number;
                newCount: number;
                hitCount: number;
                resultJson: any;
            }[];
            displays: {
                id: number;
                userId: number;
                username: string;
                openedAt: Date;
                seasonNumber: number | null;
                seasonLabel: string | null;
                boosterCount: number;
                cardCount: number;
                creditsEarned: number;
                newCount: number;
                hitCount: number;
                resultJson: any;
            }[];
        } | null;
    }>;
    cancelMarketTransaction(currentUser: {
        id: number;
        username: string;
        role: string;
    }, body: {
        transactionId: number;
        reason?: string;
    }): Promise<{
        message: string;
        correction: {
            transactionId: number;
            sellerId: number;
            buyerId: number;
            cardId: number;
            cardName: string;
            quantity: number;
            creditsRefunded: number;
            rewardWasClaimed: boolean;
            offeredCardId: number | null;
            offeredCardQuantity: number;
        };
    }>;
    disableMarketListing(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, body: {
        reason?: string;
    }): Promise<{
        message: string;
        correction: {
            listingId: number;
            sellerId: number;
            cardId: number;
            cardName: string;
            unlockedQuantity: number;
            status: import("../market/market-listing-status.enum").MarketListingStatus.CANCELLED;
            closedAt: Date;
        };
    }>;
    adjustMarketListingPrice(currentUser: {
        id: number;
        username: string;
        role: string;
    }, id: number, body: {
        priceCredits: number;
        reason?: string;
    }): Promise<{
        message: string;
        correction: {
            listingId: number;
            sellerId: number;
            cardId: number;
            previousPrice: number;
            nextPrice: number;
        };
    }>;
    refundPlayer(currentUser: {
        id: number;
        username: string;
        role: string;
    }, body: {
        userId: number;
        amount: number;
        reason?: string;
    }): Promise<{
        message: string;
        correction: {
            userId: number;
            username: string;
            amount: number;
            previousCredits: number;
            nextCredits: number;
        };
    }>;
    removeBuggedReward(currentUser: {
        id: number;
        username: string;
        role: string;
    }, body: {
        userId: number;
        credits?: number;
        cardId?: number;
        cardQuantity?: number;
        reason?: string;
    }): Promise<{
        message: string;
        correction: {
            userId: number;
            username: string;
            creditsRemoved: number;
            previousCredits: number | null;
            nextCredits: number | null;
            cardId: number | null;
            cardName: string | null;
            cardQuantityRemoved: number;
        };
    }>;
}
