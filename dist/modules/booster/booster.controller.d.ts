import { BoosterService } from './booster.service';
import { OpenBoosterDto } from './dto/open-booster.dto';
import { OpenDisplayDto } from './dto/open-display.dto';
export declare class BoosterController {
    private readonly booster;
    constructor(booster: BoosterService);
    getSeasons(): Promise<{
        seasonNumber: number;
        label: string;
        season: string | null;
        extension: string | null;
        cardCount: number;
        rarityCounts: Record<string, number>;
        isOpenable: boolean;
        missingRequirements: string[];
    }[]>;
    getOpeningHistory(user: {
        id: number;
    }, limit?: string, page?: string, perPage?: string): Promise<{
        items: {
            id: any;
            kind: "booster" | "display";
            openedAt: any;
            season: any;
            seasonNumber: any;
            boosterCount: any;
            cardsCount: any;
            totalCardsCount: any;
            creditsEarnedTotal: number | null;
            newCount: number;
            hitCount: any;
            hasGoldBooster: boolean;
            coverCard: any;
            previewCards: any;
            canReplay: boolean;
        }[];
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasPrev: boolean;
        hasNext: boolean;
    }>;
    getOpeningReplay(user: {
        id: number;
    }, kind: string, id: string): Promise<{
        result: any;
        id: any;
        kind: "booster" | "display";
        openedAt: any;
        season: any;
        seasonNumber: any;
        boosterCount: any;
        cardsCount: any;
        totalCardsCount: any;
        creditsEarnedTotal: number | null;
        newCount: number;
        hitCount: any;
        hasGoldBooster: boolean;
        coverCard: any;
        previewCards: any;
        canReplay: boolean;
    }>;
    open(user: {
        id: number;
    }, dto: OpenBoosterDto): Promise<{
        payment: {
            kind: "booster";
            usedFree: boolean;
            cost: number;
        } | {
            kind: "display";
            usedFree: boolean;
            cost: number;
        } | {
            kind: import("../economy/economy.service").OpenKind;
            usedFree: boolean;
            cost: 250 | 7000;
        };
        season: string;
        seasonNumber: number;
        cards: {
            isNew: boolean;
            id: number;
            key: string;
            name: string;
            season: string | null;
            seasonNumber: number | null;
            extension: string | null;
            number: number | null;
            displayNumber: string | null;
            rarity: string;
            type: string | null;
            gameplayType: string | null;
            specialEdition: boolean;
            artist: string | null;
            imageUrl: string;
            specialCategory: string | null;
            affiliatedSeason: string | null;
            affiliatedSeasonNumber: number | null;
            sourceRarity: string | null;
            sourceRaritySlug: string | null;
        }[];
        credits: import("../economy/economy.service").CreditBreakdown;
        creditsEarnedTotal: number;
        newCardIds: number[];
        newCardKeys: string[];
        flags: {
            hasGTO: boolean;
            hasTicketOr: boolean;
            ticketOrIsNew: boolean;
        };
    }>;
    openDisplay(user: {
        id: number;
    }, dto: OpenDisplayDto): Promise<{
        payment: {
            kind: "booster";
            usedFree: boolean;
            cost: number;
        } | {
            kind: "display";
            usedFree: boolean;
            cost: number;
        } | {
            kind: import("../economy/economy.service").OpenKind;
            usedFree: boolean;
            cost: 250 | 7000;
        };
        season: string;
        seasonNumber: number;
        meta: {
            boosters: number;
            hasGoldBooster: boolean;
            goldIndex: number | null;
            forcedLegendaryIndex: number;
        };
        boosters: (import("../cards/card.entity").Card & {
            isNew: boolean;
        })[][];
        credits: {
            display: import("../economy/economy.service").CreditBreakdown;
            boosters: import("../economy/economy.service").CreditBreakdown[];
        };
        creditsEarnedTotal: number;
        newCardIds: number[];
        newCardKeys: string[];
    }>;
}
