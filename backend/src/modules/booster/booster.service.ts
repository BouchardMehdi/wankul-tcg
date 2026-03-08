import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Card } from '../cards/card.entity';
import { UsersService } from '../users/users.service';
import { EconomyService, type CreditBreakdown } from '../economy/economy.service';
import { BoosterOpening } from './booster-opening.entity';
import { DisplayOpening } from './display-opening.entity';

type Season = 'Origins' | 'Campus' | 'Battle' | 'Stellar';

type NewCardsMeta = {
  newCardIds: number[];
  newCardKeys: string[];
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
    private readonly dataSource: DataSource,
  ) {}

  private readonly MAIN_WEIGHTS: Array<{ rarity: string; weight: number }> = [
    { rarity: 'Commune', weight: 45 },
    { rarity: 'Peu commune', weight: 30 },
    { rarity: 'Rare', weight: 10 },
    { rarity: 'Ultra Rare (U1)', weight: 2.24 },
    { rarity: 'Ultra Rare (U2)', weight: 1.6 },
    { rarity: 'Légendaire bronze', weight: 0.8 },
    { rarity: 'Légendaire argent', weight: 0.28 },
    { rarity: 'Légendaire dorée', weight: 0.08 },
  ];
  private readonly MAIN_TOTAL = 90;

  private readonly CHANCE_TICKET_SLOT = 0.0417;
  private readonly CHANCE_TICKET_OR_AS_11TH = 0.001;

  private readonly DISPLAY_BOOSTERS = 24;
  private readonly CHANCE_DISPLAY_HAS_GOLD = 1 / 6;

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
    if (!arr.length) throw new BadRequestException(`Aucune carte trouvée pour: ${label}`);
    return arr[this.randInt(arr.length)];
  }

  private pickUnique(pool: Card[], already: Set<number>, label: string): Card {
    if (!pool.length) throw new BadRequestException(`Aucune carte trouvée pour: ${label}`);

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
    return this.cardMatches(card, 'ticket', 'or') && !this.cardMatches(card, 'gagnant');
  }

  private isGtoCard(card: Card) {
    return this.cardMatches(card, 'gagnant', 'ticket', 'or');
  }

  private isGoldBoosterCard(card: Card) {
    return this.cardMatches(card, 'booster', 'gold');
  }

  private isSeasonMatch(card: Card, season: Season) {
    const wanted = this.normalizeText(season);
    const seasonValue = this.normalizeText((card as any).season);
    const extensionValue = this.normalizeText((card as any).extension);
    return seasonValue === wanted || extensionValue === wanted;
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
      ['Booster Gold', 9],
      ["Gagnant ticket d'or", 10],
      ["Ticket d'or", 11],
    ]);

    return [...cards].sort((a, b) => (order.get(a.rarity) ?? 999) - (order.get(b.rarity) ?? 999));
  }

  private async loadPools(season: Season) {
    const allCards = await this.cardRepo.find();

    const seasonCards = allCards.filter((c) => this.isSeasonMatch(c, season));
    const terrain = seasonCards.filter((c) => this.normalizeText(c.rarity) === 'terrain');

    const byRarity = new Map<string, Card[]>();
    for (const c of seasonCards) {
      const arr = byRarity.get(c.rarity) ?? [];
      arr.push(c);
      byRarity.set(c.rarity, arr);
    }

    const ticketOrCards = allCards.filter((c) => this.isTicketOrCard(c));
    const goldCards = allCards.filter((c) => this.isGoldBoosterCard(c));

    const gtoSeason = allCards.filter((c) => this.isGtoCard(c) && this.isSeasonMatch(c, season));
    const gtoGlobal = allCards.filter((c) => this.isGtoCard(c));

    return {
      terrain,
      byRarity,
      ticketOrCards,
      goldCards,
      gtoCards: gtoSeason.length ? gtoSeason : gtoGlobal,
    };
  }

  private pickMainRarity(): string {
    const r = Math.random() * this.MAIN_TOTAL;
    let acc = 0;
    for (const it of this.MAIN_WEIGHTS) {
      acc += it.weight;
      if (r <= acc) return it.rarity;
    }
    return this.MAIN_WEIGHTS[this.MAIN_WEIGHTS.length - 1].rarity;
  }

  private buildNormalBooster(args: {
    season: Season;
    pools: Awaited<ReturnType<BoosterService['loadPools']>>;
    forceOneLegendaryInMain?: boolean;
  }): Card[] {
    const { season, pools } = args;
    const picked = new Set<number>();
    const out: Card[] = [];

    const terrain = this.pickUnique(pools.terrain, picked, `Terrain:${season}`);
    out.push(terrain);
    picked.add(terrain.id);

    const forceLegendary = Boolean(args.forceOneLegendaryInMain);
    const forcedIndex = forceLegendary ? 1 + this.randInt(9) : -1;

    for (let i = 0; i < 9; i++) {
      const outIndex = 1 + i;

      let rarity = this.pickMainRarity();

      if (outIndex === forcedIndex) {
        rarity = this.legendaryPickRarityProportional();
      }

      if (rarity === 'Terrain') rarity = 'Commune';

      const pool = pools.byRarity.get(rarity) ?? [];
      const card = this.pickUnique(pool, picked, `${season}:${rarity}`);
      out.push(card);
      picked.add(card.id);
    }

    if (season === 'Origins') {
      return out;
    }

    if (Math.random() < this.CHANCE_TICKET_SLOT) {
      const isTicketOr = Math.random() < this.CHANCE_TICKET_OR_AS_11TH;

      if (isTicketOr) {
        if (!pools.ticketOrCards.length) {
          throw new BadRequestException(`Aucune carte "Ticket d'or" trouvée en base.`);
        }
        const t = this.pickOne(pools.ticketOrCards, "Ticket d'or");
        out.push(t);
      } else {
        if (!pools.gtoCards.length) {
          throw new BadRequestException(
            `Aucune carte "Gagnant ticket d'or" trouvée pour ${season}. Vérifie rarity/key/name/extension.`,
          );
        }
        const g = this.pickOne(pools.gtoCards, `GTO:${season}`);
        out.push(g);
      }
    }

    return out;
  }

  private buildGoldBooster(pools: Awaited<ReturnType<BoosterService['loadPools']>>) {
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

  private computeBoosterCreditsFromCards(args: {
    cards: Card[];
    ownedBefore: Map<number, number>;
  }) {
    const rarities = args.cards.map((c) => c.rarity);

    const newCardRarities: string[] = [];
    const seen = new Set<number>();

    for (const c of args.cards) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);

      const qty = args.ownedBefore.get(c.id) ?? 0;
      if (qty === 0) newCardRarities.push(c.rarity);
    }

    const ticketOrCard = args.cards.find((c) => this.isTicketOrCard(c));
    const gtoPresent = args.cards.some((c) => this.isGtoCard(c));
    const ticketOrPresent = Boolean(ticketOrCard);
    const ticketOrIsNew = ticketOrCard ? (args.ownedBefore.get(ticketOrCard.id) ?? 0) === 0 : false;

    const breakdown = this.economy.computeBoosterCredits({
      rarities,
      newCardRarities,
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

  private computeNewCardsMeta(args: { cards: Card[]; ownedBefore: Map<number, number> }): NewCardsMeta {
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

  async openBooster(userId: number, season: Season) {
    const payment = await this.economy.consumeOpen(userId, 'booster');

    const pools = await this.loadPools(season);
    const cards = this.buildNormalBooster({ season, pools });

    return this.dataSource.transaction(async (manager) => {
      const cardIds = cards.map((c) => c.id);
      const ownedBefore = await this.users.getOwnedMap(userId, cardIds);

      const newMeta = this.computeNewCardsMeta({ cards, ownedBefore });

      await this.users.addCardsToUserBulk(userId, cardIds, manager);

      const { breakdown, hasGTO, hasTicketOr, ticketOrIsNew } = this.computeBoosterCreditsFromCards({
        cards,
        ownedBefore,
      });

      await this.economy.addCredits(userId, breakdown.total);

      await this.boosterOpeningRepoSaveSafe({
        userId,
        cards,
        boosterCount: 1,
      });

      const newIdsSet = new Set(newMeta.newCardIds);
      const firstOccurrenceMarked = new Set<number>();

      return {
        payment,
        season,
        cards: this.sortByRarityForDisplay(cards).map((c) => {
          const isFirstNew = newIdsSet.has(c.id) && !firstOccurrenceMarked.has(c.id);
          if (isFirstNew) firstOccurrenceMarked.add(c.id);

          return {
            ...c,
            isNew: isFirstNew,
          };
        }),
        credits: breakdown,
        creditsEarnedTotal: breakdown.total,
        ...newMeta,
        flags: {
          hasGTO,
          hasTicketOr,
          ticketOrIsNew,
        },
      };
    });
  }

  async openDisplay(userId: number, season: Season) {
    const payment = await this.economy.consumeOpen(userId, 'display');

    const pools = await this.loadPools(season);

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
        boosters.push(this.buildNormalBooster({ season, pools, forceOneLegendaryInMain: forceLegendary }));
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const allCards = boosters.flat();
      const allCardIds = allCards.map((c) => c.id);

      const ownedBeforeGlobal = await this.users.getOwnedMap(userId, allCardIds);

      const simulatedOwned = this.cloneOwnedMap(ownedBeforeGlobal);
      const boosterBreakdowns: CreditBreakdown[] = [];

      const displayNewCardIds: number[] = [];
      const displayNewCardKeys: string[] = [];
      const markedNewOnce = new Set<number>();

      const boostersWithFlags = boosters.map((boosterCards) => {
        const ownedBeforeThisBooster = this.cloneOwnedMap(simulatedOwned);

        const { breakdown } = this.computeBoosterCreditsFromCards({
          cards: boosterCards,
          ownedBefore: ownedBeforeThisBooster,
        });
        boosterBreakdowns.push(breakdown);

        const seenInsideBooster = new Set<number>();

        const boosterWithFlags = this.sortByRarityForDisplay(boosterCards).map((c) => {
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

        return boosterWithFlags;
      });

      await this.users.addCardsToUserBulk(userId, allCardIds, manager);

      const displayBreakdown = this.economy.computeDisplayCredits({
        boosterBreakdowns,
        goldMultiplier: hasGoldBooster,
      });

      await this.economy.addCredits(userId, displayBreakdown.total);

      await this.displayOpeningRepoSaveSafe({
        userId,
        season,
        boosters,
        hasGoldBooster,
        forcedLegendaryIndex,
        goldIndex,
      });

      return {
        payment,
        season,
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
    });
  }

  private async boosterOpeningRepoSaveSafe(args: { userId: number; cards: Card[]; boosterCount: number }) {
    try {
      await this.boosterOpeningRepo.save({
        user: { id: args.userId } as any,
        openedAt: new Date() as any,
        boosterCount: args.boosterCount as any,
        cardIds: args.cards.map((c) => c.id) as any,
        resultJson: args.cards.map((c) => ({
          id: c.id,
          key: (c as any).key,
          name: c.name,
          rarity: c.rarity,
          imageUrl: (c as any).imageUrl,
        })) as any,
      } as any);
    } catch {
      //
    }
  }

  private async displayOpeningRepoSaveSafe(args: {
    userId: number;
    season: Season;
    boosters: Card[][];
    hasGoldBooster: boolean;
    forcedLegendaryIndex: number;
    goldIndex: number;
  }) {
    try {
      await this.displayOpeningRepo.save({
        user: { id: args.userId } as any,
        openedAt: new Date() as any,
        season: args.season as any,
        resultJson: {
          boosters: args.boosters.map((b) => b.map((c) => c.id)),
          hasGoldBooster: args.hasGoldBooster,
          forcedLegendaryIndex: args.forcedLegendaryIndex,
          goldIndex: args.hasGoldBooster ? args.goldIndex : null,
        },
      } as any);
    } catch {
      //
    }
  }
}