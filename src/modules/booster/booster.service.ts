import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Card } from '../cards/card.entity';
import { UsersService } from '../users/users.service';
import {
  EconomyService,
  type CreditBreakdown,
} from '../economy/economy.service';
import { BoosterOpening } from './booster-opening.entity';
import { DisplayOpening } from './display-opening.entity';
import { EconomyAnalyticsService } from '../economy/economy-analytics.service';
import { AntiAbuseService } from '../security/anti-abuse.service';
import { ProfileService } from '../profile/profile.service';

type NewCardsMeta = {
  newCardIds: number[];
  newCardKeys: string[];
};

type DisplayBoosterCard = Card & {
  isNew: boolean;
};

type SeasonCatalogItem = {
  seasonNumber: number;
  label: string;
  season: string | null;
  extension: string | null;
  cardCount: number;
  rarityCounts: Record<string, number>;
  isOpenable: boolean;
  missingRequirements: string[];
};

type LoadedPools = {
  seasonNumber: number;
  label: string;
  season: string | null;
  extension: string | null;
  terrain: Card[];
  byRarity: Map<string, Card[]>;
  ticketOrCards: Card[];
  goldCards: Card[];
  gtoCards: Card[];
};

type OpeningHistoryKind = 'booster' | 'display';
type OpeningHistoryRowRef = {
  kind: OpeningHistoryKind;
  id: number;
  openedAt: Date;
};

@Injectable()
export class BoosterService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,

    @InjectRepository(BoosterOpening)
    private readonly boosterOpeningRepo: Repository<BoosterOpening>,

    @InjectRepository(DisplayOpening)
    private readonly displayOpeningRepo: Repository<DisplayOpening>,

    private readonly users: UsersService,
    private readonly economy: EconomyService,
    private readonly economyAnalyticsService: EconomyAnalyticsService,
    private readonly antiAbuseService: AntiAbuseService,
    private readonly profileService: ProfileService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly FILLER_WEIGHTS: Array<{ rarity: string; weight: number }> = [
    { rarity: 'Commune', weight: 45 },
    { rarity: 'Peu commune', weight: 30 },
    { rarity: 'Rare', weight: 10 },
  ];
  private readonly PREMIUM_RARITY_CHANCES: Array<{ rarity: string; chance: number }> = [
    { rarity: 'Ultra Rare (U1)', chance: 0.212 },
    { rarity: 'Ultra Rare (U2)', chance: 0.151 },
    { rarity: 'Légendaire bronze', chance: 0.08 },
    { rarity: 'Légendaire argent', chance: 0.028 },
    { rarity: 'Légendaire dorée', chance: 0.008 },
  ];

  private readonly REQUIRED_OPENING_RARITIES = [
    'Commune',
    'Peu commune',
    'Rare',
    'Ultra Rare (U1)',
    'Ultra Rare (U2)',
    'Légendaire bronze',
    'Légendaire argent',
    'Légendaire dorée',
  ];

  private readonly CHANCE_TICKET_SLOT = 0.0417;
  private readonly CHANCE_TICKET_OR_AS_11TH = 0.001;
  private readonly LEGACY_SEASON_NUMBER = 5;
  private readonly CHANCE_LEGACY_DUO_IN_BOOSTER = 0.023;

  private readonly DISPLAY_BOOSTERS = 24;
  private readonly CHANCE_DISPLAY_HAS_GOLD = 1 / 6;
  private readonly OPENING_HISTORY_MAX_ITEMS = 50;

  private randInt(maxExclusive: number) {
    return Math.floor(Math.random() * maxExclusive);
  }

  private pickWeighted<T extends { weight: number }>(items: T[]): T {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = Math.random() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  private pickOne<T>(arr: T[], label: string): T {
    if (!arr.length) {
      throw new BadRequestException(`Aucune carte trouvée pour: ${label}`);
    }
    return arr[this.randInt(arr.length)];
  }

  private pickUnique(pool: Card[], already: Set<number>, label: string): Card {
    if (!pool.length) {
      throw new BadRequestException(`Aucune carte trouvée pour: ${label}`);
    }

    if (pool.length <= already.size) return this.pickOne(pool, label);

    for (let i = 0; i < 40; i++) {
      const c = this.pickOne(pool, label);
      if (!already.has(c.id)) return c;
    }
    return this.pickOne(pool, label);
  }

  private normalizeText(value?: string | null) {
    return (value ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’]/g, "'")
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSeasonNumber(value: unknown): number | null {
    const num = Number(value);
    return Number.isInteger(num) && num > 0 ? num : null;
  }

  private cardTokens(card: Card): string[] {
    const fields = [
      (card as any).key,
      (card as any).slug,
      (card as any).identifier,
      (card as any).code,
      (card as any).rarity,
      (card as any).name,
      (card as any).type,
      (card as any).subtype,
      (card as any).family,
      (card as any).extension,
      (card as any).season,
      (card as any).specialCategory,
      (card as any).affiliatedSeason,
      (card as any).sourceRarity,
      (card as any).sourceRaritySlug,
      (card as any).description,
    ];

    return fields
      .map((v) => this.normalizeText(v))
      .filter((v) => v.length > 0);
  }

  private cardMatches(card: Card, ...needles: string[]) {
    const hay = this.cardTokens(card).join(' | ');
    return needles.every((n) => hay.includes(this.normalizeText(n)));
  }

  private isTicketOrCard(card: Card) {
    const rarity = this.normalizeText((card as any).rarity);
    const category = this.normalizeText((card as any).specialCategory);
    const sourceRarity = this.normalizeText((card as any).sourceRarity);

    const isPureTicket =
      rarity === "ticket d'or" ||
      rarity === 'ticket d or' ||
      category === "ticket d'or" ||
      category === 'ticket d or' ||
      sourceRarity === "ticket d'or" ||
      sourceRarity === 'ticket d or';

    return isPureTicket && !this.isGtoCard(card);
  }

  private isGtoCard(card: Card) {
    const values = [
      (card as any).rarity,
      (card as any).specialCategory,
      (card as any).sourceRarity,
      (card as any).sourceRaritySlug,
    ].map((value) => this.normalizeText(value));

    return values.some(
      (value) =>
        value.includes('gagnant') &&
        value.includes('ticket') &&
        value.includes('or'),
    );
  }

  private isGoldBoosterCard(card: Card) {
    const values = [
      (card as any).rarity,
      (card as any).specialCategory,
      (card as any).sourceRarity,
      (card as any).sourceRaritySlug,
    ].map((value) => this.normalizeText(value));

    return values.some(
      (value) => value.includes('booster') && value.includes('gold'),
    );
  }

  private getOpeningAffiliatedSeasonNumber(card: Card) {
    return (
      this.normalizeSeasonNumber((card as any).seasonNumber) ??
      this.normalizeSeasonNumber((card as any).affiliatedSeasonNumber)
    );
  }

  private getSeasonLabelFromCards(cards: Card[], seasonNumber: number) {
    const firstWithExtension = cards.find((c) => this.normalizeText((c as any).extension));
    const firstWithSeason = cards.find((c) => this.normalizeText((c as any).season));

    const extension = (firstWithExtension as any)?.extension ?? null;
    const season = (firstWithSeason as any)?.season ?? null;

    const label =
      extension?.toString().trim() ||
      season?.toString().trim() ||
      `Saison ${seasonNumber}`;

    return {
      label,
      extension: extension ? String(extension) : null,
      season: season ? String(season) : null,
    };
  }

  private buildSeasonCatalog(cards: Card[]): SeasonCatalogItem[] {
    const grouped = new Map<number, Card[]>();

    for (const card of cards) {
      const seasonNumber = this.normalizeSeasonNumber((card as any).seasonNumber);
      if (!seasonNumber) continue;

      const arr = grouped.get(seasonNumber) ?? [];
      arr.push(card);
      grouped.set(seasonNumber, arr);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([seasonNumber, seasonCards]) => {
        const { label, extension, season } = this.getSeasonLabelFromCards(
          seasonCards,
          seasonNumber,
        );

        const rarityCounts: Record<string, number> = {};
        for (const card of seasonCards) {
          rarityCounts[card.rarity] = (rarityCounts[card.rarity] ?? 0) + 1;
        }

        const missingRequirements: string[] = [];
        if ((rarityCounts['Terrain'] ?? 0) < 1) {
          missingRequirements.push('Terrain');
        }

        for (const rarity of this.REQUIRED_OPENING_RARITIES) {
          if ((rarityCounts[rarity] ?? 0) < 1) {
            missingRequirements.push(rarity);
          }
        }

        return {
          seasonNumber,
          label,
          season,
          extension,
          cardCount: seasonCards.length,
          rarityCounts,
          isOpenable: missingRequirements.length === 0,
          missingRequirements,
        };
      });
  }

  async getAvailableSeasons() {
    const allCards = await this.cardRepo.find();
    return this.buildSeasonCatalog(allCards).filter((item) => item.cardCount > 0);
  }

  private async getSeasonDefinitionOrThrow(seasonNumber: number) {
    const allCards = await this.cardRepo.find();
    const catalog = this.buildSeasonCatalog(allCards);
    const seasonDef = catalog.find((item) => item.seasonNumber === seasonNumber);

    if (!seasonDef) {
      throw new NotFoundException(`Saison ${seasonNumber} introuvable.`);
    }

    if (!seasonDef.isOpenable) {
      throw new BadRequestException(
        `La saison ${seasonDef.label} n'est pas ouvrable. Éléments manquants: ${seasonDef.missingRequirements.join(', ')}`,
      );
    }

    return {
      seasonDef,
      allCards,
    };
  }

  private legendaryPickRarityProportional(): string {
    const items = [
      { rarity: 'Légendaire bronze', weight: 0.8 },
      { rarity: 'Légendaire argent', weight: 0.28 },
      { rarity: 'Légendaire dorée', weight: 0.08 },
    ];
    return this.pickWeighted(items).rarity;
  }

  private sortByRarityForDisplay(cards: Card[]) {
    const order = new Map<string, number>([
      ['Terrain', 0],
      ['Commune', 1],
      ['Peu commune', 2],
      ['Rare', 3],
      ['Ultra Rare (U1)', 4],
      ['Ultra Rare (U2)', 5],
      ['Légendaire bronze', 6],
      ['Légendaire argent', 7],
      ['Légendaire dorée', 8],
      ['Duo', 9],
      ['Booster Gold', 10],
      ["Gagnant ticket d'or", 11],
      ["Ticket d'or", 12],
    ]);

    return [...cards].sort(
      (a, b) => (order.get(a.rarity) ?? 999) - (order.get(b.rarity) ?? 999),
    );
  }

  private async loadPools(seasonNumber: number): Promise<LoadedPools> {
    const { seasonDef, allCards } = await this.getSeasonDefinitionOrThrow(seasonNumber);

    const seasonCards = allCards.filter(
      (c) => this.normalizeSeasonNumber((c as any).seasonNumber) === seasonNumber,
    );

    const terrain = seasonCards.filter(
      (c) => this.normalizeText(c.rarity) === 'terrain',
    );

    const byRarity = new Map<string, Card[]>();
    for (const c of seasonCards) {
      const arr = byRarity.get(c.rarity) ?? [];
      arr.push(c);
      byRarity.set(c.rarity, arr);
    }

    const ticketOrCards = allCards.filter((c) => this.isTicketOrCard(c));
    const goldCards = allCards.filter((c) => this.isGoldBoosterCard(c));

    const gtoSeason = allCards.filter(
      (c) =>
        this.isGtoCard(c) &&
        this.getOpeningAffiliatedSeasonNumber(c) === seasonNumber,
    );
    const gtoGlobal = allCards.filter((c) => this.isGtoCard(c));

    return {
      seasonNumber,
      label: seasonDef.label,
      season: seasonDef.season,
      extension: seasonDef.extension,
      terrain,
      byRarity,
      ticketOrCards,
      goldCards,
      gtoCards: gtoSeason.length ? gtoSeason : gtoGlobal,
    };
  }

  private pickFillerRarity(): string {
    return this.pickWeighted(this.FILLER_WEIGHTS).rarity;
  }

  private pickOptionalPremiumRarity(args: {
    seasonNumber: number;
    pools: LoadedPools;
  }): string | null {
    const items = [...this.PREMIUM_RARITY_CHANCES];
    const duoPool = args.pools.byRarity.get('Duo') ?? [];

    if (args.seasonNumber === this.LEGACY_SEASON_NUMBER && duoPool.length > 0) {
      items.push({ rarity: 'Duo', chance: this.CHANCE_LEGACY_DUO_IN_BOOSTER });
    }

    const totalChance = items.reduce((sum, item) => sum + item.chance, 0);
    if (Math.random() >= totalChance) return null;

    let r = Math.random() * totalChance;
    for (const item of items) {
      r -= item.chance;
      if (r <= 0) return item.rarity;
    }

    return items[items.length - 1]?.rarity ?? null;
  }

  private buildNormalBooster(args: {
    seasonLabel: string;
    seasonNumber: number;
    pools: LoadedPools;
    forceOneLegendaryInMain?: boolean;
  }): Card[] {
    const { seasonLabel, seasonNumber, pools } = args;
    const picked = new Set<number>();
    const out: Card[] = [];

    const terrain = this.pickUnique(pools.terrain, picked, `Terrain:${seasonLabel}`);
    out.push(terrain);
    picked.add(terrain.id);

    // Un booster ne peut contenir qu'un seul hit premium: U1, U2, légendaire ou Duo.
    const forceLegendary = Boolean(args.forceOneLegendaryInMain);
    const premiumRarity = forceLegendary
      ? this.legendaryPickRarityProportional()
      : this.pickOptionalPremiumRarity({ seasonNumber, pools });
    const premiumIndex = premiumRarity ? 1 + this.randInt(9) : -1;

    for (let i = 0; i < 9; i++) {
      const outIndex = 1 + i;

      let rarity =
        outIndex === premiumIndex && premiumRarity
          ? premiumRarity
          : this.pickFillerRarity();

      if (rarity === 'Terrain') rarity = 'Commune';

      const pool = pools.byRarity.get(rarity) ?? [];
      const card = this.pickUnique(pool, picked, `${seasonLabel}:${rarity}`);
      out.push(card);
      picked.add(card.id);
    }

    if (seasonNumber === 1) {
      return out;
    }

    if (Math.random() < this.CHANCE_TICKET_SLOT) {
      const isTicketOr = Math.random() < this.CHANCE_TICKET_OR_AS_11TH;

      if (isTicketOr) {
        if (!pools.ticketOrCards.length) {
          throw new BadRequestException(
            `Aucune carte "Ticket d'or" trouvée en base.`,
          );
        }
        const t = this.pickOne(pools.ticketOrCards, "Ticket d'or");
        out.push(t);
      } else {
        if (!pools.gtoCards.length) {
          throw new BadRequestException(
            `Aucune carte "Gagnant ticket d'or" trouvée pour ${seasonLabel}. Vérifie rarity/key/name/extension.`,
          );
        }
        const g = this.pickOne(pools.gtoCards, `GTO:${seasonLabel}`);
        out.push(g);
      }
    }

    return out;
  }

  private buildGoldBooster(pools: LoadedPools) {
    if (!pools.goldCards.length) {
      throw new BadRequestException('Aucune carte Booster Gold trouvée en base.');
    }

    const picked = new Set<number>();
    const out: Card[] = [];
    for (let i = 0; i < 4; i++) {
      const c = this.pickUnique(pools.goldCards, picked, 'Booster Gold');
      out.push(c);
      picked.add(c.id);
    }
    return out;
  }

  private cloneOwnedMap(source: Map<number, number>) {
    return new Map<number, number>(source);
  }

  private applyCardsToOwnedMap(owned: Map<number, number>, cards: Card[]) {
    for (const c of cards) {
      owned.set(c.id, (owned.get(c.id) ?? 0) + 1);
    }
  }

  private async computeBoosterCreditsFromCards(args: {
    cards: Card[];
    ownedBefore: Map<number, number>;
  }) {
    const newCardIds: number[] = [];
    const seen = new Set<number>();

    for (const c of args.cards) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);

      const qty = args.ownedBefore.get(c.id) ?? 0;
      if (qty === 0) newCardIds.push(c.id);
    }

    const ticketOrCard = args.cards.find((c) => this.isTicketOrCard(c));
    const gtoPresent = args.cards.some((c) => this.isGtoCard(c));
    const ticketOrPresent = Boolean(ticketOrCard);
    const ticketOrIsNew = ticketOrCard
      ? (args.ownedBefore.get(ticketOrCard.id) ?? 0) === 0
      : false;

    const breakdown = await this.economy.computeBoosterCredits({
      cards: args.cards.map((card) => ({ id: card.id, rarity: card.rarity })),
      newCardIds,
      gtoPresent,
      ticketOrPresent,
      ticketOrIsNew,
    });

    return {
      breakdown,
      hasGTO: gtoPresent,
      hasTicketOr: ticketOrPresent,
      ticketOrIsNew,
    };
  }

  private computeNewCardsMeta(args: {
    cards: Card[];
    ownedBefore: Map<number, number>;
  }): NewCardsMeta {
    const newCardIds: number[] = [];
    const newCardKeys: string[] = [];

    const seen = new Set<number>();
    for (const c of args.cards) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);

      const qty = args.ownedBefore.get(c.id) ?? 0;
      if (qty === 0) {
        newCardIds.push(c.id);
        if ((c as any).key) newCardKeys.push((c as any).key);
      }
    }

    return { newCardIds, newCardKeys };
  }

  private clampHistoryPage(raw?: string) {
    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, n);
  }

  private clampHistoryPerPage(rawPerPage?: string, rawLimit?: string) {
    const n = Number.parseInt(String(rawPerPage ?? rawLimit ?? ''), 10);
    if (!Number.isFinite(n)) return 12;
    return Math.max(1, Math.min(50, n));
  }

  private isSavedBigHit(card: any) {
    const rarity = this.normalizeText(card?.rarity);
    return (
      rarity.includes('u1') ||
      rarity.includes('u2') ||
      rarity.includes('ultra rare') ||
      rarity.includes('duo') ||
      rarity.includes('legendaire') ||
      rarity.includes('booster gold') ||
      rarity.includes('ticket')
    );
  }

  private getStoredCardId(card: any) {
    const value = Number(card?.id ?? card?.cardId);
    return Number.isFinite(value) ? value : null;
  }

  private isStoredCardNew(card: any, result?: any) {
    if (Boolean(card?.isNew)) return true;

    const id = this.getStoredCardId(card);
    const key = typeof card?.key === 'string' ? card.key : null;
    const newIds = new Set(
      (Array.isArray(result?.newCardIds) ? result.newCardIds : [])
        .map((value: any) => Number(value))
        .filter((value: number) => Number.isFinite(value)),
    );
    const newKeys = new Set(
      (Array.isArray(result?.newCardKeys) ? result.newCardKeys : [])
        .map((value: any) => String(value))
        .filter(Boolean),
    );

    return (id !== null && newIds.has(id)) || (key !== null && newKeys.has(key));
  }

  private isOpeningHistoryCard(card: any, result?: any) {
    return this.isStoredCardNew(card, result) || this.isSavedBigHit(card);
  }

  private extractSavedCreditsTotal(result: any): number | null {
    const candidates = [
      result?.creditsEarned,
      result?.creditsEarnedTotal,
      result?.creditsGained,
      result?.totalCredits,
      result?.breakdown?.total,
      result?.credits?.total,
      result?.credits?.display?.total,
      result?.creditBreakdown?.total,
      result?.economy?.earned,
      result?.economy?.earnedCredits,
      result?.economy?.creditsEarned,
      result?.economy?.totalEarned,
    ];

    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }

    return null;
  }

  private normalizeStoredOpeningResult(kind: OpeningHistoryKind, row: any) {
    const stored = row?.resultJson;

    if (kind === 'booster') {
      if (stored && !Array.isArray(stored) && Array.isArray(stored.cards)) {
        return stored;
      }

      const cards = Array.isArray(stored) ? stored : [];
      return {
        payment: { paid: false, cost: 0 },
        season: row?.seasonLabel ?? 'Saison inconnue',
        seasonNumber: row?.seasonNumber ?? null,
        cards,
        credits: {},
        creditsEarnedTotal: null,
        newCardIds: [],
        newCardKeys: [],
        flags: {
          hasGTO: false,
          hasTicketOr: false,
          ticketOrIsNew: false,
        },
      };
    }

    if (
      stored &&
      !Array.isArray(stored) &&
      Array.isArray(stored.boosters) &&
      (stored.boosters.length === 0 ||
        !Array.isArray(stored.boosters[0]) ||
        typeof stored.boosters[0]?.[0] === 'object')
    ) {
      return stored;
    }

    return {
      payment: { paid: false, cost: 0 },
      season: row?.season ?? 'Saison inconnue',
      seasonNumber: row?.seasonNumber ?? null,
      meta: {
        boosters: row?.boosterCount ?? this.DISPLAY_BOOSTERS,
        hasGoldBooster: Boolean(stored?.hasGoldBooster),
        goldIndex: stored?.goldIndex ?? null,
        forcedLegendaryIndex: stored?.forcedLegendaryIndex ?? -1,
      },
      boosters: [],
      credits: {
        display: {},
        boosters: [],
      },
      creditsEarnedTotal: null,
      newCardIds: [],
      newCardKeys: [],
    };
  }

  private flattenStoredOpeningCards(kind: OpeningHistoryKind, result: any) {
    if (kind === 'display') {
      return Array.isArray(result?.boosters)
        ? result.boosters.flatMap((b: any) => (Array.isArray(b) ? b : []))
        : [];
    }

    return Array.isArray(result?.cards) ? result.cards : [];
  }

  private getOpeningHistoryCards(kind: OpeningHistoryKind, result: any) {
    return this
      .flattenStoredOpeningCards(kind, result)
      .filter((card: any) => this.isOpeningHistoryCard(card, result));
  }

  private buildOpeningHistoryReplayResult(kind: OpeningHistoryKind, result: any) {
    if (kind === 'display') {
      const boosters = Array.isArray(result?.boosters)
        ? result.boosters
            .map((boosterCards: any) =>
              Array.isArray(boosterCards)
                ? boosterCards.filter((card: any) =>
                    this.isOpeningHistoryCard(card, result),
                  )
                : [],
            )
            .filter((boosterCards: any[]) => boosterCards.length > 0)
        : [];

      return {
        ...result,
        boosters,
      };
    }

    const cards = Array.isArray(result?.cards)
      ? result.cards.filter((card: any) => this.isOpeningHistoryCard(card, result))
      : [];

    return {
      ...result,
      cards,
    };
  }

  private buildOpeningHistoryItem(kind: OpeningHistoryKind, row: any) {
    const result = this.normalizeStoredOpeningResult(kind, row);
    const flatCards = this.flattenStoredOpeningCards(kind, result);
    const historyCards = this.getOpeningHistoryCards(kind, result);
    const newIds = Array.isArray(result?.newCardIds) ? result.newCardIds : [];
    const newCards = flatCards.filter((card: any) => this.isStoredCardNew(card, result));
    const hitCards = flatCards.filter((card: any) => this.isSavedBigHit(card));
    const coverCard =
      historyCards.find((card: any) => this.isSavedBigHit(card)) ??
      historyCards[0] ??
      null;
    return {
      id: row.id,
      kind,
      openedAt: row.openedAt,
      season: result?.season ?? row?.seasonLabel ?? row?.season ?? 'Saison inconnue',
      seasonNumber: result?.seasonNumber ?? row?.seasonNumber ?? null,
      boosterCount:
        kind === 'display'
          ? row?.boosterCount ?? result?.meta?.boosters ?? this.DISPLAY_BOOSTERS
          : row?.boosterCount ?? 1,
      cardsCount: historyCards.length,
      totalCardsCount: flatCards.length,
      creditsEarnedTotal: this.extractSavedCreditsTotal(result),
      newCount: Math.max(newIds.length, newCards.length),
      hitCount: hitCards.length,
      hasGoldBooster: Boolean(result?.meta?.hasGoldBooster),
      coverCard,
      previewCards: historyCards.slice(0, 8),
      canReplay: historyCards.length > 0,
    };
  }

  private buildOpeningLogDetails(kind: OpeningHistoryKind, result: any) {
    const flatCards = this.flattenStoredOpeningCards(kind, result);
    const historyCards = this.getOpeningHistoryCards(kind, result);
    const cardIds = Array.from(
      new Set(
        flatCards
          .map((card: any) => this.getStoredCardId(card))
          .filter((id): id is number => Number.isInteger(id) && id > 0),
      ),
    );
    const hitCardIds = Array.from(
      new Set(
        historyCards
          .filter((card: any) => this.isSavedBigHit(card))
          .map((card: any) => this.getStoredCardId(card))
          .filter((id): id is number => Number.isInteger(id) && id > 0),
      ),
    );
    const newCardIds = Array.isArray(result?.newCardIds)
      ? result.newCardIds.filter((id: any) => Number.isInteger(id) && id > 0)
      : [];
    const primaryCard =
      historyCards.find((card: any) => this.isSavedBigHit(card)) ??
      historyCards[0] ??
      flatCards[0] ??
      null;

    return {
      cardId: this.getStoredCardId(primaryCard),
      cardIds,
      hitCardIds,
      newCardIds,
      highlights: historyCards.slice(0, 6).map((card: any) => ({
        id: this.getStoredCardId(card),
        name: card?.name ?? null,
        rarity: card?.rarity ?? null,
        isNew: this.isStoredCardNew(card, result),
      })),
    };
  }

  private async hydrateHistoryCoverCards<
    T extends { coverCard?: any | null; previewCards?: any[] },
  >(
    items: T[],
  ) {
    const coverIds = Array.from(
      new Set(
        items
          .flatMap((item) => [
            Number(item.coverCard?.id),
            ...(Array.isArray(item.previewCards)
              ? item.previewCards.map((card) => Number(card?.id))
              : []),
          ])
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    if (coverIds.length === 0) return items;

    const cards = await this.cardRepo.find({
      where: { id: In(coverIds) },
      select: ['id', 'key', 'name', 'rarity', 'imageUrl'],
    });
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return items.map((item) => {
      const cardId = Number(item.coverCard?.id);
      const freshCard = cardsById.get(cardId);
      const previewCards = Array.isArray(item.previewCards)
        ? item.previewCards.map((card) => {
            const freshPreviewCard = cardsById.get(Number(card?.id));
            if (!freshPreviewCard) return card;

            return {
              ...card,
              id: freshPreviewCard.id,
              key: card?.key ?? freshPreviewCard.key,
              name: card?.name ?? freshPreviewCard.name,
              rarity: card?.rarity ?? freshPreviewCard.rarity,
              imageUrl: freshPreviewCard.imageUrl,
            };
          })
        : item.previewCards;

      if (!freshCard) {
        return {
          ...item,
          previewCards,
        };
      }

      return {
        ...item,
        coverCard: {
          ...item.coverCard,
          id: freshCard.id,
          key: item.coverCard?.key ?? freshCard.key,
          name: item.coverCard?.name ?? freshCard.name,
          rarity: item.coverCard?.rarity ?? freshCard.rarity,
          imageUrl: freshCard.imageUrl,
        },
        previewCards,
      };
    });
  }

  private async trimOpeningHistoryForUser(userId: number) {
    const [boosters, displays] = await Promise.all([
      this.boosterOpeningRepo.find({
        where: { user: { id: userId } as any } as any,
        select: ['id', 'openedAt'],
        order: { openedAt: 'DESC', id: 'DESC' },
      }),
      this.displayOpeningRepo.find({
        where: { user: { id: userId } as any } as any,
        select: ['id', 'openedAt'],
        order: { openedAt: 'DESC', id: 'DESC' },
      }),
    ]);

    const combined: OpeningHistoryRowRef[] = [
      ...boosters.map((row) => ({
        kind: 'booster' as const,
        id: row.id,
        openedAt: row.openedAt,
      })),
      ...displays.map((row) => ({
        kind: 'display' as const,
        id: row.id,
        openedAt: row.openedAt,
      })),
    ].sort((a, b) => {
      const dateDiff =
        new Date(b.openedAt as any).getTime() -
        new Date(a.openedAt as any).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id - a.id;
    });

    const rowsToDelete = combined.slice(this.OPENING_HISTORY_MAX_ITEMS);
    if (rowsToDelete.length === 0) return;

    const boosterIds = rowsToDelete
      .filter((row) => row.kind === 'booster')
      .map((row) => row.id);
    const displayIds = rowsToDelete
      .filter((row) => row.kind === 'display')
      .map((row) => row.id);

    await Promise.all([
      boosterIds.length > 0
        ? this.boosterOpeningRepo.delete({ id: In(boosterIds) } as any)
        : Promise.resolve(),
      displayIds.length > 0
        ? this.displayOpeningRepo.delete({ id: In(displayIds) } as any)
        : Promise.resolve(),
    ]);
  }

  async getOpeningHistory(
    userId: number,
    rawPage?: string,
    rawPerPage?: string,
    rawLimit?: string,
  ) {
    await this.trimOpeningHistoryForUser(userId);

    const page = this.clampHistoryPage(rawPage);
    const perPage = this.clampHistoryPerPage(rawPerPage, rawLimit);

    const [boosters, displays, boosterTotal, displayTotal] = await Promise.all([
      this.boosterOpeningRepo.find({
        where: { user: { id: userId } as any } as any,
        order: { openedAt: 'DESC', id: 'DESC' },
        take: this.OPENING_HISTORY_MAX_ITEMS,
      }),
      this.displayOpeningRepo.find({
        where: { user: { id: userId } as any } as any,
        order: { openedAt: 'DESC', id: 'DESC' },
        take: this.OPENING_HISTORY_MAX_ITEMS,
      }),
      this.boosterOpeningRepo.count({
        where: { user: { id: userId } as any } as any,
      }),
      this.displayOpeningRepo.count({
        where: { user: { id: userId } as any } as any,
      }),
    ]);

    const total = Math.min(
      this.OPENING_HISTORY_MAX_ITEMS,
      boosterTotal + displayTotal,
    );
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;
    const rawItems = [
      ...boosters.map((row) => this.buildOpeningHistoryItem('booster', row)),
      ...displays.map((row) => this.buildOpeningHistoryItem('display', row)),
    ]
      .sort(
        (a, b) =>
          new Date(b.openedAt as any).getTime() -
          new Date(a.openedAt as any).getTime(),
      )
      .slice(0, this.OPENING_HISTORY_MAX_ITEMS)
      .slice(offset, offset + perPage);
    const items = await this.hydrateHistoryCoverCards(rawItems);

    return {
      items,
      page: safePage,
      perPage,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    };
  }

  async getOpeningReplay(userId: number, rawKind: string, rawId: string) {
    const kind = rawKind === 'display' ? 'display' : rawKind === 'booster' ? 'booster' : null;
    const id = Number.parseInt(String(rawId), 10);

    if (!kind || !Number.isFinite(id)) {
      throw new BadRequestException('Ouverture invalide.');
    }

    const repo = kind === 'display' ? this.displayOpeningRepo : this.boosterOpeningRepo;
    const row = await repo.findOne({
      where: { id, user: { id: userId } as any } as any,
    });

    if (!row) {
      throw new NotFoundException('Ouverture introuvable.');
    }

    const result = this.normalizeStoredOpeningResult(kind, row);
    const item = this.buildOpeningHistoryItem(kind, row);

    if (!item.canReplay) {
      throw new BadRequestException(
        'Cette ancienne ouverture ne contient pas assez de données pour être rejouée.',
      );
    }

    return {
      ...item,
      result: this.buildOpeningHistoryReplayResult(kind, result),
    };
  }

  async openBooster(userId: number, seasonNumber: number) {
    await this.antiAbuseService.assertRateLimit(userId, 'OPEN_BOOSTER');

    const payment = await this.economy.consumeOpen(userId, 'booster');

    const pools = await this.loadPools(seasonNumber);
    const cards = this.buildNormalBooster({
      seasonLabel: pools.label,
      seasonNumber,
      pools,
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const cardIds = cards.map((c) => c.id);
      const ownedBefore = await this.users.getOwnedMap(userId, cardIds);

      const newMeta = this.computeNewCardsMeta({ cards, ownedBefore });

      await this.users.addCardsToUserBulk(userId, cardIds, manager);

      const { breakdown, hasGTO, hasTicketOr, ticketOrIsNew } =
        await this.computeBoosterCreditsFromCards({
          cards,
          ownedBefore,
        });

      await this.economy.addCredits(userId, breakdown.total, { skipLog: true });

      const newIdsSet = new Set(newMeta.newCardIds);
      const firstOccurrenceMarked = new Set<number>();

      const openingResult = {
        payment,
        season: pools.label,
        seasonNumber,
        cards: this.sortByRarityForDisplay(cards).map((c) => {
          const isFirstNew =
            newIdsSet.has(c.id) && !firstOccurrenceMarked.has(c.id);
          if (isFirstNew) firstOccurrenceMarked.add(c.id);

          return {
            ...c,
            isNew: isFirstNew,
          };
        }),
        credits: breakdown,
        creditsEarnedTotal: breakdown.total,
        newCardIds: newMeta.newCardIds,
        newCardKeys: newMeta.newCardKeys,
        flags: {
          hasGTO,
          hasTicketOr,
          ticketOrIsNew,
        },
      };

      await this.boosterOpeningRepoSaveSafe({
        userId,
        cards,
        boosterCount: 1,
        seasonNumber,
        seasonLabel: pools.label,
        result: openingResult,
      });

      return openingResult;
    });

    await this.economyAnalyticsService.incrementBooster();
    await this.economyAnalyticsService.addCreditsSpent(result.payment?.cost ?? 0);
    await this.economyAnalyticsService.addOpeningReward(
      result.creditsEarnedTotal,
    );
    const logDetails = this.buildOpeningLogDetails('booster', result);
    await this.antiAbuseService.logAction({
      userId,
      cardId: logDetails.cardId,
      action: 'OPEN_BOOSTER',
      status: 'allowed',
      severity: 'info',
      targetType: 'season',
      targetId: seasonNumber,
      valueCredits: result.creditsEarnedTotal,
      metadata: {
        season: result.season,
        seasonNumber,
        payment: result.payment,
        cardIds: logDetails.cardIds,
        hitCardIds: logDetails.hitCardIds,
        highlights: logDetails.highlights,
        newCardCount: result.newCardIds?.length ?? 0,
        flags: result.flags,
      },
    });
    await this.profileService.evaluateAndGrantBadges(userId).catch(() => undefined);

    return result;
  }

  async openDisplay(userId: number, seasonNumber: number) {
    await this.antiAbuseService.assertRateLimit(userId, 'OPEN_DISPLAY');

    const payment = await this.economy.consumeOpen(userId, 'display');

    const pools = await this.loadPools(seasonNumber);

    const hasGoldBooster = Math.random() < this.CHANCE_DISPLAY_HAS_GOLD;
    const goldIndex = hasGoldBooster ? this.randInt(this.DISPLAY_BOOSTERS) : -1;

    let forcedLegendaryIndex = this.randInt(this.DISPLAY_BOOSTERS);
    if (hasGoldBooster && forcedLegendaryIndex === goldIndex) {
      forcedLegendaryIndex = (forcedLegendaryIndex + 1) % this.DISPLAY_BOOSTERS;
    }

    const boosters: Card[][] = [];

    for (let i = 0; i < this.DISPLAY_BOOSTERS; i++) {
      if (i === goldIndex) {
        boosters.push(this.buildGoldBooster(pools));
      } else {
        const forceLegendary = i === forcedLegendaryIndex;
        boosters.push(
          this.buildNormalBooster({
            seasonLabel: pools.label,
            seasonNumber,
            pools,
            forceOneLegendaryInMain: forceLegendary,
          }),
        );
      }
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const allCards = boosters.flat();
      const allCardIds = allCards.map((c) => c.id);

      const ownedBeforeGlobal = await this.users.getOwnedMap(userId, allCardIds);

      const simulatedOwned = this.cloneOwnedMap(ownedBeforeGlobal);
      const boosterBreakdowns: CreditBreakdown[] = [];

      const displayNewCardIds: number[] = [];
      const displayNewCardKeys: string[] = [];
      const markedNewOnce = new Set<number>();

      const boostersWithFlags: DisplayBoosterCard[][] = [];

      for (const boosterCards of boosters) {
        const ownedBeforeThisBooster = this.cloneOwnedMap(simulatedOwned);

        const { breakdown } = await this.computeBoosterCreditsFromCards({
          cards: boosterCards,
          ownedBefore: ownedBeforeThisBooster,
        });
        boosterBreakdowns.push(breakdown);

        const seenInsideBooster = new Set<number>();

        const boosterWithFlags: DisplayBoosterCard[] =
          this.sortByRarityForDisplay(boosterCards).map((c) => {
            const qtyBeforeThisBooster = ownedBeforeThisBooster.get(c.id) ?? 0;
            const firstTimeInThisBooster = !seenInsideBooster.has(c.id);

            if (firstTimeInThisBooster) {
              seenInsideBooster.add(c.id);
            }

            const isActuallyNewForDisplay =
              firstTimeInThisBooster &&
              qtyBeforeThisBooster === 0 &&
              !markedNewOnce.has(c.id);

            if (isActuallyNewForDisplay) {
              markedNewOnce.add(c.id);
              displayNewCardIds.push(c.id);
              if ((c as any).key) displayNewCardKeys.push((c as any).key);
            }

            return {
              ...c,
              isNew: isActuallyNewForDisplay,
            };
          });

        this.applyCardsToOwnedMap(simulatedOwned, boosterCards);
        boostersWithFlags.push(boosterWithFlags);
      }

      await this.users.addCardsToUserBulk(userId, allCardIds, manager);

      const displayBreakdown = this.economy.computeDisplayCredits({
        boosterBreakdowns,
        goldMultiplier: hasGoldBooster,
      });

      await this.economy.addCredits(userId, displayBreakdown.total, { skipLog: true });

      const openingResult = {
        payment,
        season: pools.label,
        seasonNumber,
        meta: {
          boosters: this.DISPLAY_BOOSTERS,
          hasGoldBooster,
          goldIndex: hasGoldBooster ? goldIndex : null,
          forcedLegendaryIndex,
        },
        boosters: boostersWithFlags,
        credits: {
          display: displayBreakdown,
          boosters: boosterBreakdowns,
        },
        creditsEarnedTotal: displayBreakdown.total,
        newCardIds: displayNewCardIds,
        newCardKeys: displayNewCardKeys,
      };

      await this.displayOpeningRepoSaveSafe({
        userId,
        seasonNumber,
        seasonLabel: pools.label,
        boosters,
        hasGoldBooster,
        forcedLegendaryIndex,
        goldIndex,
        result: openingResult,
      });

      return openingResult;
    });

    await this.economyAnalyticsService.incrementDisplay();
    await this.economyAnalyticsService.addCreditsSpent(result.payment?.cost ?? 0);
    await this.economyAnalyticsService.addOpeningReward(
      result.creditsEarnedTotal,
    );
    const logDetails = this.buildOpeningLogDetails('display', result);
    await this.antiAbuseService.logAction({
      userId,
      cardId: logDetails.cardId,
      action: 'OPEN_DISPLAY',
      status: 'allowed',
      severity: hasGoldBooster ? 'watch' : 'info',
      targetType: 'season',
      targetId: seasonNumber,
      valueCredits: result.creditsEarnedTotal,
      metadata: {
        season: result.season,
        seasonNumber,
        payment: result.payment,
        cardIds: logDetails.cardIds,
        hitCardIds: logDetails.hitCardIds,
        highlights: logDetails.highlights,
        newCardCount: result.newCardIds?.length ?? 0,
        hasGoldBooster,
        goldIndex: hasGoldBooster ? goldIndex : null,
        forcedLegendaryIndex,
      },
    });
    await this.profileService.evaluateAndGrantBadges(userId).catch(() => undefined);

    return result;
  }

  private async boosterOpeningRepoSaveSafe(args: {
    userId: number;
    cards: Card[];
    boosterCount: number;
    seasonNumber: number;
    seasonLabel: string;
    result?: any;
  }) {
    try {
      await this.boosterOpeningRepo.save({
        user: { id: args.userId } as any,
        openedAt: new Date() as any,
        seasonNumber: args.seasonNumber,
        seasonLabel: args.seasonLabel,
        boosterCount: args.boosterCount as any,
        cardIds: args.cards.map((c) => c.id) as any,
        resultJson:
          args.result ??
          (args.cards.map((c) => ({
            id: c.id,
            key: (c as any).key,
            name: c.name,
            rarity: c.rarity,
            imageUrl: (c as any).imageUrl,
          })) as any),
      } as any);
      await this.trimOpeningHistoryForUser(args.userId);
    } catch {
      //
    }
  }

  private async displayOpeningRepoSaveSafe(args: {
    userId: number;
    seasonNumber: number;
    seasonLabel: string;
    boosters: Card[][];
    hasGoldBooster: boolean;
    forcedLegendaryIndex: number;
    goldIndex: number;
    result?: any;
  }) {
    try {
      await this.displayOpeningRepo.save({
        user: { id: args.userId } as any,
        openedAt: new Date() as any,
        seasonNumber: args.seasonNumber,
        season: args.seasonLabel,
        boosterCount: this.DISPLAY_BOOSTERS,
        resultJson:
          args.result ??
          ({
            boosters: args.boosters.map((b) => b.map((c) => c.id)),
            hasGoldBooster: args.hasGoldBooster,
            forcedLegendaryIndex: args.forcedLegendaryIndex,
            goldIndex: args.hasGoldBooster ? args.goldIndex : null,
          } as any),
      } as any);
      await this.trimOpeningHistoryForUser(args.userId);
    } catch {
      //
    }
  }
}
