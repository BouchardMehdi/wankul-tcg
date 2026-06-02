import { StatsService } from './stats.service';
export declare class StatsController {
    private readonly stats;
    constructor(stats: StatsService);
    me(user: {
        id: number;
    }): Promise<{
        boostersOpened: number;
        displaysOpened: number;
        cardsTotal: number;
        uniqueCardsTotal: number;
        uniqueCards: number;
        seasonProgress: {
            season: ("Origins" | "Campus" | "Battle" | "Stellar" | "Legacy") | "Hors série";
            ownedUnique: number;
            total: number;
        }[];
        rarities: Record<string, number>;
        raritiesBySeason: Record<"Origins" | "Campus" | "Battle" | "Stellar" | "Legacy", Record<string, number>>;
    }>;
    dropRates(mode?: string, days?: string, season?: string, includeGold?: string): Promise<{
        mode: "global";
        season: ("Origins" | "Campus" | "Battle" | "Stellar" | "Legacy") | null;
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
                    byRarity: {
                        [x: string]: {
                            count: number;
                            rate: number;
                        };
                    };
                };
                slots2to10: {
                    total: number;
                    byRarity: {
                        [x: string]: {
                            count: number;
                            rate: number;
                        };
                    };
                };
                slot11: {
                    total: number;
                    byRarity: {
                        [x: string]: {
                            count: number;
                            rate: number;
                        };
                    };
                };
            };
            gold: {
                boosters: number;
                cards: number;
                byRarity: {
                    [x: string]: {
                        count: number;
                        rate: number;
                    };
                };
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
                        byRarity: {
                            [x: string]: {
                                count: number;
                                rate: number;
                            };
                        };
                    };
                    slots2to10: {
                        total: number;
                        byRarity: {
                            [x: string]: {
                                count: number;
                                rate: number;
                            };
                        };
                    };
                    slot11: {
                        total: number;
                        byRarity: {
                            [x: string]: {
                                count: number;
                                rate: number;
                            };
                        };
                    };
                };
                gold: {
                    boosters: number;
                    cards: number;
                    byRarity: {
                        [x: string]: {
                            count: number;
                            rate: number;
                        };
                    };
                };
            };
        };
    } | {
        mode: "display" | "unit";
        season: ("Origins" | "Campus" | "Battle" | "Stellar" | "Legacy") | null;
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
                    byRarity: {
                        [x: string]: {
                            count: number;
                            rate: number;
                        };
                    };
                };
                slots2to10: {
                    total: number;
                    byRarity: {
                        [x: string]: {
                            count: number;
                            rate: number;
                        };
                    };
                };
                slot11: {
                    total: number;
                    byRarity: {
                        [x: string]: {
                            count: number;
                            rate: number;
                        };
                    };
                };
            };
            gold: {
                boosters: number;
                cards: number;
                byRarity: {
                    [x: string]: {
                        count: number;
                        rate: number;
                    };
                };
            };
        };
        bySeason?: undefined;
    }> | {
        message: string;
        provided: string | null;
    };
}
