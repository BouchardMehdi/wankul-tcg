import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Card } from '../cards/card.entity';
import { UsersService } from '../users/users.service';
import { EconomyService } from '../economy/economy.service';
import { BoosterOpening } from './booster-opening.entity';
import { DisplayOpening } from './display-opening.entity';

type Season = 'Origins' | 'Campus' | 'Battle' | 'Stellar';

type BoosterBuild = {
  cards: Card[];
  isGold: boolean;
  hasGTO: boolean;
  hasTicketOr: boolean;
  creditsBreakdown: ReturnType<EconomyService['computeBoosterCredits']>;
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

  // --- Règles / taux officiels (ton modèle A) ---
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

  private readonly CHANCE_TICKET_SLOT = 0.0417; // 4.17% d'ajouter une 11e carte
  private readonly CHANCE_TICKET_OR_GIVEN_TICKET_SLOT = 0.001; // 0.1% => Ticket d'or sinon GTO

  private readonly DISPLAY_BOOSTERS = 24;
  private readonly CHANCE_DISPLAY_HAS_GOLD = 1 / 6; // 1/6 qu'une display ait un booster gold

  // --- Helpers ---
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
    if (!arr.length) throw new Error(`No cards found for pool: ${label}`);
    return arr[this.randInt(arr.length)];
  }

  private pickUnique(pool: Card[], already: Set<number>, label: string): Card {
    if (!pool.length) throw new Error(`No cards found for pool: ${label}`);

    // si pool trop petit, accepte doublons
    if (pool.length <= already.size) return this.pickOne(pool, label);

    for (let i = 0; i < 40; i++) {
      const c = this.pickOne(pool, label);
      if (!already.has(c.id)) return c;
    }
    return this.pickOne(pool, label);
  }

  private isGoldBooster(cards: Card[]) {
    return cards.length === 4 && cards.some((c) => c.rarity === 'Booster Gold');
  }

  private isLegendaryRarity(r: string) {
    return r === 'Légendaire bronze' || r === 'Légendaire argent' || r === 'Légendaire dorée';
  }

  private legendaryPickRarityProportional(): string {
    // normalisation des taux legendaires (0.80 / 0.28 / 0.08)
    const items = [
      { rarity: 'Légendaire bronze', weight: 0.8 },
      { rarity: 'Légendaire argent', weight: 0.28 },
      { rarity: 'Légendaire dorée', weight: 0.08 },
    ];
    return this.pickWeighted(items).rarity;
  }

  private sortByRarityForDisplay(cards: Card[]) {
    // tri "du moins rare au plus rare" (hors 11e qui reste à part côté front si tu veux)
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
    // IMPORTANT :
    // - Terrain: season-specific
    // - Main: season-specific
    // - GTO: extension-specific (extension === season)
    // - Ticket d'or: global (pas lié à season)
    // - Booster Gold: global (pas lié à season)
    const [seasonCards, ticketOrCards, goldCards] = await Promise.all([
      this.cardRepo.find({ where: { season } as any }),
      this.cardRepo.find({ where: { rarity: "Ticket d'or" } as any }),
      this.cardRepo.find({ where: { rarity: 'Booster Gold' } as any }),
    ]);

    const terrain = seasonCards.filter((c) => c.rarity === 'Terrain');

    const byRarity = new Map<string, Card[]>();
    for (const c of seasonCards) {
      const arr = byRarity.get(c.rarity) ?? [];
      arr.push(c);
      byRarity.set(c.rarity, arr);
    }

    // GTO pour cette extension (si la saison en a)
    const gto = await this.cardRepo.find({
      where: { rarity: "Gagnant ticket d'or", extension: season } as any,
    });

    return {
      terrain,
      byRarity,
      ticketOrCards,
      goldCards,
      gtoCards: gto,
    };
  }

  private pickMainRarity(): string {
    // On choisit une rareté selon les poids (total = 90)
    const r = Math.random() * this.MAIN_TOTAL;
    let acc = 0;
    for (const it of this.MAIN_WEIGHTS) {
      acc += it.weight;
      if (r <= acc) return it.rarity;
    }
    return this.MAIN_WEIGHTS[this.MAIN_WEIGHTS.length - 1].rarity;
  }

  // ----------------------------
  // Construction booster NORMAL
  // ----------------------------
  private buildNormalBooster(args: {
    season: Season;
    pools: Awaited<ReturnType<BoosterService['loadPools']>>;
    forceOneLegendaryInMain?: boolean;
  }): Card[] {
    const { season, pools } = args;
    const picked = new Set<number>();
    const out: Card[] = [];

    // Slot 1 : Terrain (100%)
    const terrainPool = pools.terrain;
    const terrain = this.pickUnique(terrainPool, picked, `Terrain:${season}`);
    out.push(terrain);
    picked.add(terrain.id);

    // Slots 2..10 : 9 cartes pondérées, sans Terrain
    // + possibilité de forcer une légendaire dans un des slots main
    const forceLegendary = Boolean(args.forceOneLegendaryInMain);
    const forcedIndex = forceLegendary ? 1 + this.randInt(9) : -1; // index dans out (slot2..10 => positions 1..9)

    for (let i = 0; i < 9; i++) {
      const outIndex = 1 + i;

      let rarity = this.pickMainRarity();

      // si on doit forcer une légendaire sur ce slot
      if (outIndex === forcedIndex) {
        rarity = this.legendaryPickRarityProportional();
      }

      // pas de Terrain dans main
      if (rarity === 'Terrain') rarity = 'Commune';

      const pool = pools.byRarity.get(rarity) ?? [];
      const card = this.pickUnique(pool, picked, `${season}:${rarity}`);
      out.push(card);
      picked.add(card.id);
    }

    // 11e carte : 4.17% chance
    if (Math.random() < this.CHANCE_TICKET_SLOT) {
      // Origins : pas de GTO => 11e = Ticket d'or
      if (season === 'Origins') {
        const t = this.pickOne(pools.ticketOrCards, "Ticket d'or");
        out.push(t);
      } else {
        // 0.1% Ticket d'or sinon GTO
        const isTicketOr = Math.random() < this.CHANCE_TICKET_OR_GIVEN_TICKET_SLOT;

        if (isTicketOr) {
          const t = this.pickOne(pools.ticketOrCards, "Ticket d'or");
          out.push(t);
        } else {
          const gtoPool = pools.gtoCards;
          // si pas de GTO en DB (cas edge), fallback ticket d'or
          if (!gtoPool.length) {
            const t = this.pickOne(pools.ticketOrCards, "Ticket d'or");
            out.push(t);
          } else {
            const g = this.pickOne(gtoPool, `GTO:${season}`);
            out.push(g);
          }
        }
      }
    }

    // Tri d’affichage (optionnel côté back)
    // NB: si tu veux garder la 11e “à part”, tu peux trier seulement les 10 premières côté front.
    return out;
  }

  // ----------------------------
  // Construction booster GOLD (4 cartes)
  // ----------------------------
  private buildGoldBooster(pools: Awaited<ReturnType<BoosterService['loadPools']>>) {
    const picked = new Set<number>();
    const out: Card[] = [];
    for (let i = 0; i < 4; i++) {
      const c = this.pickUnique(pools.goldCards, picked, 'Booster Gold');
      out.push(c);
      picked.add(c.id);
    }
    return out;
  }

  // ----------------------------
  // Crédits : détection nouvelles cartes + multipliers
  // ----------------------------
  private computeBoosterCreditsFromCards(args: {
    cards: Card[];
    ownedBefore: Map<number, number>;
  }) {
    const rarities = args.cards.map((c) => c.rarity);

    // nouvelles cartes (1ère obtention) — une fois par cardId
    const newCardRarities: string[] = [];
    const seen = new Set<number>();
    for (const c of args.cards) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);

      const qty = args.ownedBefore.get(c.id) ?? 0;
      if (qty === 0) newCardRarities.push(c.rarity);
    }

    const hasGTO = rarities.includes("Gagnant ticket d'or");
    const hasTicketOr = rarities.includes("Ticket d'or");

    const breakdown = this.economy.computeBoosterCredits({
      rarities,
      newCardRarities,
      gtoPresent: hasGTO,
      ticketOrPresent: hasTicketOr,
    });

    return { breakdown, hasGTO, hasTicketOr };
  }

  // =========================================================
  // API : OPEN BOOSTER (unité) — saison requise
  // =========================================================
  async openBooster(userId: number, season: Season) {
    // Consomme charge gratuite ou crédits
    const payment = await this.economy.consumeOpen(userId, 'booster');

    const pools = await this.loadPools(season);
    const cards = this.buildNormalBooster({ season, pools });

    // Transaction pour : calcul new cards + update collection + crédits
    return this.dataSource.transaction(async (manager) => {
      const cardIds = cards.map((c) => c.id);

      const ownedBefore = await this.users.getOwnedMap(userId, cardIds);

      // update collection (bulk)
      await this.users.addCardsToUserBulk(userId, cardIds, manager);

      // crédits
      const { breakdown, hasGTO, hasTicketOr } = this.computeBoosterCreditsFromCards({
        cards,
        ownedBefore,
      });
      await this.economy.addCredits(userId, breakdown.total);

      // save opening (si tu le gardes)
      await this.boosterOpeningRepoSaveSafe({
        userId,
        cards,
        boosterCount: 1,
      });

      // Réponse
      return {
        payment,
        season,
        cards: this.sortByRarityForDisplay(cards),
        credits: breakdown,
        flags: { hasGTO, hasTicketOr },
      };
    });
  }

  // =========================================================
  // API : OPEN DISPLAY — 24 boosters + légendaire garantie
  // =========================================================
  async openDisplay(userId: number, season: Season) {
    const payment = await this.economy.consumeOpen(userId, 'display');

    const pools = await this.loadPools(season);

    // 1) décider si cette display a un booster gold
    const hasGoldBooster = Math.random() < this.CHANCE_DISPLAY_HAS_GOLD;
    const goldIndex = hasGoldBooster ? this.randInt(this.DISPLAY_BOOSTERS) : -1;

    // 2) choisir dans quel booster on force une légendaire (si goldIndex, on force sur un booster normal)
    let forcedLegendaryIndex = this.randInt(this.DISPLAY_BOOSTERS);
    if (hasGoldBooster && forcedLegendaryIndex === goldIndex) {
      forcedLegendaryIndex = (forcedLegendaryIndex + 1) % this.DISPLAY_BOOSTERS;
    }

    const boosters: Card[][] = [];

    for (let i = 0; i < this.DISPLAY_BOOSTERS; i++) {
      if (i === goldIndex) {
        boosters.push(this.buildGoldBooster(pools));
        continue;
      }

      const forceLegendary = i === forcedLegendaryIndex;
      boosters.push(this.buildNormalBooster({ season, pools, forceOneLegendaryInMain: forceLegendary }));
    }

    // Transaction : update collection + crédits display (avec multipliers)
    return this.dataSource.transaction(async (manager) => {
      const allCards = boosters.flat();
      const allCardIds = allCards.map((c) => c.id);

      const ownedBefore = await this.users.getOwnedMap(userId, allCardIds);

      await this.users.addCardsToUserBulk(userId, allCardIds, manager);

      // crédits par booster
      const boosterBreakdowns = boosters.map((cards) => {
        const { breakdown } = this.computeBoosterCreditsFromCards({ cards, ownedBefore });
        return breakdown;
      });

      // multiplier display si gold booster présent (x1.25 sur tout sauf jackpot)
      const displayBreakdown = this.economy.computeDisplayCredits({
        boosterBreakdowns,
        goldMultiplier: hasGoldBooster,
      });

      await this.economy.addCredits(userId, displayBreakdown.total);

      // save display opening (si tu le gardes)
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
        boosters: boosters.map((b) => this.sortByRarityForDisplay(b)),
        credits: {
          display: displayBreakdown,
          boosters: boosterBreakdowns,
        },
      };
    });
  }

  // =========================================================
  // Persist helpers (safe) — si tu as une purge derrière
  // =========================================================
  private async boosterOpeningRepoSaveSafe(args: { userId: number; cards: Card[]; boosterCount: number }) {
    try {
      await this.boosterOpeningRepo.save({
        user: { id: args.userId } as any,
        openedAt: new Date() as any,
        boosterCount: args.boosterCount as any,
        cardIds: args.cards.map((c) => c.id) as any,
        // si tu as encore resultJson :
        resultJson: args.cards.map((c) => ({
          id: c.id,
          key: c.key,
          name: c.name,
          rarity: c.rarity,
          imageUrl: c.imageUrl,
        })) as any,
      } as any);
    } catch {
      // si ton entity ne correspond plus exactement, on ignore (le gameplay ne doit pas casser)
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
      // ignore
    }
  }
}
