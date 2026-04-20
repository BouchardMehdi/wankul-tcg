export const ECONOMY_RULES = {
  signupBonus: 1500,

  cost: {
    booster: 200,
    display: 4800,
  },

  charges: {
    booster: { cap: 4, rechargeMinutes: 90 },
    display: { cap: 1, rechargeMinutes: 60 * 60 },
  },

  multipliers: {
    gtoBooster: 1.35,
    goldDisplay: 1.15,
  },

  jackpotTicketOr: 6000,
} as const;
