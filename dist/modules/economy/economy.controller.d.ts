import { EconomyService } from './economy.service';
export declare class EconomyController {
    private readonly economy;
    constructor(economy: EconomyService);
    me(user: {
        id: number;
    }): Promise<{
        credits: number;
        freeBoosterCharges: number;
        freeDisplayCharges: number;
        costs: {
            readonly booster: 250;
            readonly display: 7000;
        };
    }>;
}
