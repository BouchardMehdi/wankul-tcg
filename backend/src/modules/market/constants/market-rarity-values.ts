export type RarityEconomicRule = {
  rarity: string;
  aliases?: string[];
  baseValue: number;
  floorPrice: number;
  ceilingPrice: number;
  quickSellRate: number;
  duplicateRewardRate: number;
  duplicateRewardMin: number;
  duplicateRewardMax: number;
  newRewardRate: number;
  newRewardMin: number;
  newRewardMax: number;
};

const RARITY_RULES: RarityEconomicRule[] = [
  {
    rarity: 'Terrain',
    baseValue: 3,
    floorPrice: 1,
    ceilingPrice: 6,
    quickSellRate: 0,
    duplicateRewardRate: 0,
    duplicateRewardMin: 0,
    duplicateRewardMax: 0,
    newRewardRate: 0,
    newRewardMin: 3,
    newRewardMax: 3,
  },
  {
    rarity: 'Commune',
    baseValue: 6,
    floorPrice: 4,
    ceilingPrice: 12,
    quickSellRate: 0.55,
    duplicateRewardRate: 0.18,
    duplicateRewardMin: 1,
    duplicateRewardMax: 2,
    newRewardRate: 1.05,
    newRewardMin: 5,
    newRewardMax: 12,
  },
  {
    rarity: 'Peu commune',
    baseValue: 11,
    floorPrice: 7,
    ceilingPrice: 20,
    quickSellRate: 0.55,
    duplicateRewardRate: 0.18,
    duplicateRewardMin: 2,
    duplicateRewardMax: 4,
    newRewardRate: 1.05,
    newRewardMin: 9,
    newRewardMax: 22,
  },
  {
    rarity: 'Rare',
    baseValue: 26,
    floorPrice: 18,
    ceilingPrice: 50,
    quickSellRate: 0.52,
    duplicateRewardRate: 0.2,
    duplicateRewardMin: 4,
    duplicateRewardMax: 10,
    newRewardRate: 1.05,
    newRewardMin: 24,
    newRewardMax: 55,
  },
  {
    rarity: 'U1',
    aliases: ['Ultra Rare (U1)'],
    baseValue: 70,
    floorPrice: 52,
    ceilingPrice: 120,
    quickSellRate: 0.5,
    duplicateRewardRate: 0.2,
    duplicateRewardMin: 10,
    duplicateRewardMax: 24,
    newRewardRate: 1.08,
    newRewardMin: 70,
    newRewardMax: 130,
  },
  {
    rarity: 'U2',
    aliases: ['Ultra Rare (U2)'],
    baseValue: 120,
    floorPrice: 85,
    ceilingPrice: 205,
    quickSellRate: 0.5,
    duplicateRewardRate: 0.19,
    duplicateRewardMin: 18,
    duplicateRewardMax: 40,
    newRewardRate: 1.08,
    newRewardMin: 115,
    newRewardMax: 225,
  },
  {
    rarity: 'Duo',
    baseValue: 520,
    floorPrice: 380,
    ceilingPrice: 820,
    quickSellRate: 0.45,
    duplicateRewardRate: 0.18,
    duplicateRewardMin: 70,
    duplicateRewardMax: 150,
    newRewardRate: 1,
    newRewardMin: 500,
    newRewardMax: 850,
  },
  {
    rarity: 'Légendaire bronze',
    baseValue: 210,
    floorPrice: 150,
    ceilingPrice: 340,
    quickSellRate: 0.48,
    duplicateRewardRate: 0.2,
    duplicateRewardMin: 30,
    duplicateRewardMax: 68,
    newRewardRate: 1.05,
    newRewardMin: 200,
    newRewardMax: 360,
  },
  {
    rarity: 'Légendaire argent',
    baseValue: 380,
    floorPrice: 270,
    ceilingPrice: 600,
    quickSellRate: 0.47,
    duplicateRewardRate: 0.19,
    duplicateRewardMin: 50,
    duplicateRewardMax: 110,
    newRewardRate: 1.03,
    newRewardMin: 360,
    newRewardMax: 650,
  },
  {
    rarity: 'Légendaire dorée',
    aliases: ['Légendaire or'],
    baseValue: 650,
    floorPrice: 460,
    ceilingPrice: 1000,
    quickSellRate: 0.46,
    duplicateRewardRate: 0.18,
    duplicateRewardMin: 80,
    duplicateRewardMax: 180,
    newRewardRate: 1,
    newRewardMin: 620,
    newRewardMax: 1100,
  },
  {
    rarity: 'Booster Gold',
    baseValue: 780,
    floorPrice: 560,
    ceilingPrice: 1100,
    quickSellRate: 0.45,
    duplicateRewardRate: 0.17,
    duplicateRewardMin: 110,
    duplicateRewardMax: 210,
    newRewardRate: 1,
    newRewardMin: 750,
    newRewardMax: 1200,
  },
  {
    rarity: "Ticket d'or",
    baseValue: 1800,
    floorPrice: 1600,
    ceilingPrice: 2400,
    quickSellRate: 0,
    duplicateRewardRate: 0,
    duplicateRewardMin: 0,
    duplicateRewardMax: 0,
    newRewardRate: 0,
    newRewardMin: 0,
    newRewardMax: 0,
  },
  {
    rarity: "Gagnant ticket d'or",
    baseValue: 1600,
    floorPrice: 1200,
    ceilingPrice: 2400,
    quickSellRate: 0.4,
    duplicateRewardRate: 0.16,
    duplicateRewardMin: 180,
    duplicateRewardMax: 380,
    newRewardRate: 0.95,
    newRewardMin: 1300,
    newRewardMax: 2200,
  },
  {
    rarity: 'Carte spéciale',
    baseValue: 180,
    floorPrice: 120,
    ceilingPrice: 280,
    quickSellRate: 0.45,
    duplicateRewardRate: 0.18,
    duplicateRewardMin: 25,
    duplicateRewardMax: 55,
    newRewardRate: 1,
    newRewardMin: 170,
    newRewardMax: 320,
  },
];

export const DEFAULT_MARKET_BASE_VALUE = 15;
export const MARKET_KEEP_MIN_COPIES = 1;

export const MARKET_PRICE_SMOOTHING_WEIGHT = 0.65;
export const MARKET_DAILY_MAX_UP_PCT = 0.08;
export const MARKET_DAILY_MAX_DOWN_PCT = 0.08;
export const MARKET_SMOOTHING_HISTORY_LIMIT = 7;

const rarityAliasMap = new Map<string, string>();
for (const rule of RARITY_RULES) {
  rarityAliasMap.set(rule.rarity, rule.rarity);
  for (const alias of rule.aliases ?? []) {
    rarityAliasMap.set(alias, rule.rarity);
  }
}

export function normalizeMarketRarity(rarity: string): string {
  return rarityAliasMap.get(rarity) ?? rarity;
}

export function getRarityEconomicRule(rarity: string): RarityEconomicRule {
  const normalized = normalizeMarketRarity(rarity);
  return (
    RARITY_RULES.find((rule) => rule.rarity === normalized) ?? {
      rarity: normalized,
      baseValue: DEFAULT_MARKET_BASE_VALUE,
      floorPrice: Math.max(1, Math.floor(DEFAULT_MARKET_BASE_VALUE * 0.7)),
      ceilingPrice: Math.max(2, Math.ceil(DEFAULT_MARKET_BASE_VALUE * 1.8)),
      quickSellRate: 0.45,
      duplicateRewardRate: 0.18,
      duplicateRewardMin: 2,
      duplicateRewardMax: 8,
      newRewardRate: 1,
      newRewardMin: 12,
      newRewardMax: 30,
    }
  );
}

export const MARKET_RARITY_BASE_VALUES: Record<string, number> = Object.fromEntries(
  Array.from(rarityAliasMap.entries()).map(([rarity, canonical]) => [
    rarity,
    getRarityEconomicRule(canonical).baseValue,
  ]),
);
