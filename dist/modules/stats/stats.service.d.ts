import { Repository, DataSource } from 'typeorm';
import { Card } from '../cards/card.entity';
import { BoosterOpening } from '../booster/booster-opening.entity';
import { DisplayOpening } from '../booster/display-opening.entity';
import { UserCard } from '../users/user-card.entity';
type CoreSeason = 'Origins' | 'Campus' | 'Battle' | 'Stellar' | 'Legacy';
type MenuSeason = CoreSeason | 'Hors série';
type Mode = 'unit' | 'display' | 'global';
type GetDropRatesInput = {
    mode: Mode;
    days: number;
    season?: CoreSeason;
    includeGold: boolean;
};
type Bucket = {
    count: number;
    rate: number;
};
type RarityMap = Record<string, Bucket>;
export declare class StatsService {
    private readonly cardRepo;
    private readonly boosterOpenRepo;
    private readonly displayOpenRepo;
    private readonly userCardRepo;
    private readonly dataSource;
    constructor(cardRepo: Repository<Card>, boosterOpenRepo: Repository<BoosterOpening>, displayOpenRepo: Repository<DisplayOpening>, userCardRepo: Repository<UserCard>, dataSource: DataSource);
    getMyStats(userId: number): Promise<{
        boostersOpened: number;
        displaysOpened: number;
        cardsTotal: number;
        uniqueCardsTotal: number;
        uniqueCards: number;
        seasonProgress: {
            season: MenuSeason;
            ownedUnique: number;
            total: number;
        }[];
        rarities: Record<string, number>;
        raritiesBySeason: Record<CoreSeason, Record<string, number>>;
    }>;
    private safeCountByUser;
    private getUserCardStatsRows;
    private getAllCardMetaRows;
    private buildSeasonProgress;
    getDropRates(input: GetDropRatesInput): Promise<{
        mode: "global";
        season: CoreSeason | null;
        includeGold: boolean;
        global: {
            windows: {
                since: Date;
                days: number;
            };
            totals: {
                displays: number;
                boosters: number;
                boosters_unit: number;
                boosters_display: number;
            };
            normal: {
                boosters: number;
                cards: number;
                slot1: {
                    total: number;
                    byRarity: RarityMap;
                };
                slots2to10: {
                    total: number;
                    byRarity: RarityMap;
                };
                slot11: {
                    total: number;
                    byRarity: RarityMap;
                };
            };
            gold: {
                boosters: number;
                cards: number;
                byRarity: RarityMap;
            };
        };
        bySeason: {
            [k: string]: {
                windows: {
                    since: Date;
                    days: number;
                };
                totals: {
                    displays: number;
                    boosters: number;
                    boosters_unit: number;
                    boosters_display: number;
                };
                normal: {
                    boosters: number;
                    cards: number;
                    slot1: {
                        total: number;
                        byRarity: RarityMap;
                    };
                    slots2to10: {
                        total: number;
                        byRarity: RarityMap;
                    };
                    slot11: {
                        total: number;
                        byRarity: RarityMap;
                    };
                };
                gold: {
                    boosters: number;
                    cards: number;
                    byRarity: RarityMap;
                };
            };
        };
    } | {
        mode: "display" | "unit";
        season: CoreSeason | null;
        includeGold: boolean;
        global: {
            windows: {
                since: Date;
                days: number;
            };
            totals: {
                displays: number;
                boosters: number;
                boosters_unit: number;
                boosters_display: number;
            };
            normal: {
                boosters: number;
                cards: number;
                slot1: {
                    total: number;
                    byRarity: RarityMap;
                };
                slots2to10: {
                    total: number;
                    byRarity: RarityMap;
                };
                slot11: {
                    total: number;
                    byRarity: RarityMap;
                };
            };
            gold: {
                boosters: number;
                cards: number;
                byRarity: RarityMap;
            };
        };
        bySeason?: undefined;
    }>;
}
export {};
