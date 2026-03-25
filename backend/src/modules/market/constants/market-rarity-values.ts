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
    baseValue: 4,
    floorPrice: 2,
    ceilingPrice: 8,
    quickSellRate: 0,
    duplicateRewardRate: 0,
    duplicateRewardMin: 0,
    duplicateRewardMax: 0,
    newRewardRate: 0,
    newRewardMin: 6,
    newRewardMax: 6,
  },
  {
    rarity: 'Commune',
    baseValue: 8,
    floorPrice: 6,
    ceilingPrice: 16,
    quickSellRate: 0.7,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 1,
    duplicateRewardMax: 4,
    newRewardRate: 1.35,
    newRewardMin: 8,
    newRewardMax: 20,
  },
  {
    rarity: 'Peu commune',
    baseValue: 14,
    floorPrice: 10,
    ceilingPrice: 24,
    quickSellRate: 0.7,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 2,
    duplicateRewardMax: 6,
    newRewardRate: 1.35,
    newRewardMin: 14,
    newRewardMax: 32,
  },
  {
    rarity: 'Rare',
    baseValue: 32,
    floorPrice: 24,
    ceilingPrice: 60,
    quickSellRate: 0.65,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 6,
    duplicateRewardMax: 16,
    newRewardRate: 1.35,
    newRewardMin: 32,
    newRewardMax: 75,
  },
  {
    rarity: 'U1',
    aliases: ['Ultra Rare (U1)'],
    baseValue: 70,
    floorPrice: 52,
    ceilingPrice: 110,
    quickSellRate: 0.63,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 14,
    duplicateRewardMax: 32,
    newRewardRate: 1.35,
    newRewardMin: 75,
    newRewardMax: 150,
  },
  {
    rarity: 'U2',
    aliases: ['Ultra Rare (U2)'],
    baseValue: 110,
    floorPrice: 85,
    ceilingPrice: 170,
    quickSellRate: 0.62,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 20,
    duplicateRewardMax: 45,
    newRewardRate: 1.35,
    newRewardMin: 120,
    newRewardMax: 230,
  },
  {
    rarity: 'Légendaire bronze',
    baseValue: 180,
    floorPrice: 140,
    ceilingPrice: 260,
    quickSellRate: 0.6,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 35,
    duplicateRewardMax: 70,
    newRewardRate: 1.35,
    newRewardMin: 180,
    newRewardMax: 360,
  },
  {
    rarity: 'Légendaire argent',
    baseValue: 320,
    floorPrice: 240,
    ceilingPrice: 460,
    quickSellRate: 0.58,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 60,
    duplicateRewardMax: 120,
    newRewardRate: 1.35,
    newRewardMin: 320,
    newRewardMax: 620,
  },
  {
    rarity: 'Légendaire dorée',
    aliases: ['Légendaire or'],
    baseValue: 520,
    floorPrice: 380,
    ceilingPrice: 760,
    quickSellRate: 0.56,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 90,
    duplicateRewardMax: 190,
    newRewardRate: 1.35,
    newRewardMin: 500,
    newRewardMax: 1020,
  },
  {
    rarity: 'Booster Gold',
    baseValue: 700,
    floorPrice: 520,
    ceilingPrice: 900,
    quickSellRate: 0.55,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 130,
    duplicateRewardMax: 240,
    newRewardRate: 1.35,
    newRewardMin: 700,
    newRewardMax: 1215,
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
    baseValue: 4500,
    floorPrice: 3500,
    ceilingPrice: 5500,
    quickSellRate: 0.5,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 700,
    duplicateRewardMax: 1200,
    newRewardRate: 1.35,
    newRewardMin: 4500,
    newRewardMax: 6075,
  },
  {
    rarity: 'Carte spéciale',
    baseValue: 220,
    floorPrice: 150,
    ceilingPrice: 320,
    quickSellRate: 0.6,
    duplicateRewardRate: 0.25,
    duplicateRewardMin: 40,
    duplicateRewardMax: 80,
    newRewardRate: 1.35,
    newRewardMin: 220,
    newRewardMax: 420,
  },
];

export const DEFAULT_MARKET_BASE_VALUE = 20;
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
      quickSellRate: 0.6,
      duplicateRewardRate: 0.25,
      duplicateRewardMin: 3,
      duplicateRewardMax: 12,
      newRewardRate: 1.35,
      newRewardMin: 18,
      newRewardMax: 42,
    }
  );
}

export const MARKET_RARITY_BASE_VALUES: Record<string, number> = Object.fromEntries(
  Array.from(rarityAliasMap.entries()).map(([rarity, canonical]) => [
    rarity,
    getRarityEconomicRule(canonical).baseValue,
  ]),
);
