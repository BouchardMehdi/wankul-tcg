"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECONOMY_RULES = void 0;
exports.ECONOMY_RULES = {
    signupBonus: 1500,
    cost: {
        booster: 250,
        display: 7000,
    },
    charges: {
        booster: { cap: 4, rechargeMinutes: 90 },
        display: { cap: 1, rechargeMinutes: 60 * 60 },
    },
    multipliers: {
        gtoBooster: 1.15,
        goldDisplay: 1.05,
    },
    jackpotTicketOr: 5000,
};
//# sourceMappingURL=economy.constants.js.map