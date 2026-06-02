import { Repository } from 'typeorm';
import { UserEconomy } from './user-economy.entity';
import { MarketPricingService } from '../market/market-pricing.service';
import { AntiAbuseService } from '../security/anti-abuse.service';
export type OpenKind = 'booster' | 'display';
export type CreditBreakdown = {
    base: number;
    newCardBonus: number;
    boosterMultiplierApplied?: number;
    displayMultiplierApplied?: number;
    ticketGoldJackpot?: number;
    total: number;
};
type EconomyGrantLogOptions = {
    source?: string;
    reason?: string;
    skipLog?: boolean;
    targetType?: string | null;
    targetId?: number | null;
    relatedUserId?: number | null;
    cardId?: number | null;
    metadata?: Record<string, any>;
};
export declare class EconomyService {
    private readonly economyRepo;
    private readonly marketPricingService;
    private readonly antiAbuseService;
    constructor(economyRepo: Repository<UserEconomy>, marketPricingService: MarketPricingService, antiAbuseService: AntiAbuseService);
    getCosts(): {
        readonly booster: 250;
        readonly display: 7000;
    };
    ensure(userId: number): Promise<UserEconomy>;
    getSnapshot(userId: number): Promise<{
        credits: number;
        freeBoosterCharges: number;
        freeDisplayCharges: number;
        costs: {
            readonly booster: 250;
            readonly display: 7000;
        };
    }>;
    consumeOpen(userId: number, kind: OpenKind): Promise<{
        kind: "booster";
        usedFree: boolean;
        cost: number;
    } | {
        kind: "display";
        usedFree: boolean;
        cost: number;
    } | {
        kind: OpenKind;
        usedFree: boolean;
        cost: 250 | 7000;
    }>;
    computeBoosterCredits(args: {
        cards: Array<{
            id: number;
            rarity: string;
        }>;
        newCardIds: number[];
        gtoPresent: boolean;
        ticketOrPresent: boolean;
        ticketOrIsNew: boolean;
    }): Promise<CreditBreakdown>;
    computeDisplayCredits(args: {
        boosterBreakdowns: CreditBreakdown[];
        goldMultiplier: boolean;
    }): CreditBreakdown;
    addCredits(userId: number, amount: number, options?: EconomyGrantLogOptions): Promise<void>;
    addFreeBoosters(userId: number, amount: number, options?: EconomyGrantLogOptions): Promise<void>;
}
export {};
