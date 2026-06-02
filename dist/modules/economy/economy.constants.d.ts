export declare const ECONOMY_RULES: {
    readonly signupBonus: 1500;
    readonly cost: {
        readonly booster: 250;
        readonly display: 7000;
    };
    readonly charges: {
        readonly booster: {
            readonly cap: 4;
            readonly rechargeMinutes: 90;
        };
        readonly display: {
            readonly cap: 1;
            readonly rechargeMinutes: number;
        };
    };
    readonly multipliers: {
        readonly gtoBooster: 1.15;
        readonly goldDisplay: 1.05;
    };
    readonly jackpotTicketOr: 5000;
};
