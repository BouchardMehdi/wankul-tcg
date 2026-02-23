import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository, DataSource } from 'typeorm';
import { Card } from '../cards/card.entity';
import { BoosterOpening } from '../booster/booster-opening.entity';
import { DisplayOpening } from '../booster/display-opening.entity';
import { UserCard } from '../users/user-card.entity';

type Season = 'Origins' | 'Campus' | 'Battle' | 'Stellar';
type Mode = 'unit' | 'display' | 'global';

type GetDropRatesInput = {
  mode: Mode;
  days: number;
  season?: Season;
  includeGold: boolean;
};

type Bucket = { count: number; rate: number };
type RarityMap = Record<string, Bucket>;

function inc(map: Record<string, number>, key: string, v = 1) {
  map[key] = (map[key] ?? 0) + v;
}

function toRates(counts: Record<string, number>, total: number): RarityMap {
  const out: RarityMap = {};
  const keys = Object.keys(counts).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  for (const k of keys) {
    const c = counts[k] ?? 0;
    out[k] = { count: c, rate: total > 0 ? c / total : 0 };
  }
  return out;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(BoosterOpening) private readonly boosterOpenRepo: Repository<BoosterOpening>,
    @InjectRepository(DisplayOpening) private readonly displayOpenRepo: Repository<DisplayOpening>,
    @InjectRepository(UserCard) private readonly userCardRepo: Repository<UserCard>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * ✅ GET /stats/me
   * - cardsTotal = cartes obtenues (avec doublons) = SUM(quantity)
   * - uniqueCardsTotal = cartes uniques débloquées = COUNT(*) sur user_cards
   * - seasonProgress = progression par saison en uniques (COALESCE(season, extension))
   */
  async getMyStats(userId: number) {
    const boostersOpened = await this.safeCountByUser(this.boosterOpenRepo, 'booster_openings', userId);
    const displaysOpened = await this.safeCountByUser(this.displayOpenRepo, 'display_openings', userId);

    const { totalCards, uniqueCardsTotal } = await this.safeUserCardsAggV2(userId);
    const seasonProgress = await this.getSeasonProgress(userId);

    return {
      boostersOpened,
      displaysOpened,

      // ✅ total obtenu (avec doublons)
      cardsTotal: totalCards,

      // ✅ total unique (débloqué)
      uniqueCardsTotal,

      // compat éventuelle si ton front utilise encore uniqueCards
      uniqueCards: uniqueCardsTotal,

      // ✅ pour le graphe
      seasonProgress,
    };
  }

  private async safeCountByUser(repo: Repository<any>, tableName: string, userId: number) {
    try {
      return await repo.count({ where: { user: { id: userId } } as any });
    } catch {}

    try {
      return await repo.count({ where: { userId } as any });
    } catch {}

    try {
      const rows = await this.dataSource.query(
        `SELECT COUNT(*) as c FROM ${tableName} WHERE userId = ?`,
        [userId],
      );
      return Number(rows?.[0]?.c ?? 0);
    } catch {}

    const rows = await this.dataSource.query(
      `SELECT COUNT(*) as c FROM ${tableName} WHERE user_id = ?`,
      [userId],
    );
    return Number(rows?.[0]?.c ?? 0);
  }

  /**
   * ✅ totals fiables car ton UserCard force user_id / card_id + quantity
   */
  private async safeUserCardsAggV2(userId: number): Promise<{ totalCards: number; uniqueCardsTotal: number }> {
    const rows = await this.dataSource.query(
      `
      SELECT
        COALESCE(SUM(uc.quantity), 0) AS totalCards,
        COUNT(*) AS uniqueCardsTotal
      FROM user_cards uc
      WHERE uc.user_id = ?
      `,
      [userId],
    );

    return {
      totalCards: Number(rows?.[0]?.totalCards ?? 0),
      uniqueCardsTotal: Number(rows?.[0]?.uniqueCardsTotal ?? 0),
    };
  }

  /**
   * ✅ Progression par saison (uniques)
   * On utilise COALESCE(cards.season, cards.extension) pour gérer les cartes "season=null" mais extension=Battle/Stellar…
   */
private async getSeasonProgress(userId: number): Promise<
  Array<{ season: Season; ownedUnique: number; total: number }>
> {
  const seasons: Season[] = ['Origins', 'Campus', 'Battle', 'Stellar'];

  // ✅ TOTAL OFFICIEL issu de cards.json (booster-only)
  const OFFICIAL_TOTALS: Record<Season, number> = {
    Origins: 180,
    Campus: 155,
    Battle: 180,
    Stellar: 180,
  };

  // Uniques possédées par saison
  const ownedRows = await this.dataSource.query(
    `
    SELECT
      COALESCE(c.season, c.extension) AS seasonKey,
      COUNT(*) AS ownedUnique
    FROM user_cards uc
    JOIN cards c ON c.id = uc.card_id
    WHERE uc.user_id = ?
      AND COALESCE(c.season, c.extension) IN (?,?,?,?)
    GROUP BY seasonKey
    `,
    [userId, ...seasons],
  );

  const ownedMap = new Map<string, number>();
  for (const r of ownedRows) {
    ownedMap.set(String(r.seasonKey), Number(r.ownedUnique ?? 0));
  }

  return seasons.map((s) => ({
    season: s,
    ownedUnique: ownedMap.get(s) ?? 0,
    total: OFFICIAL_TOTALS[s], // ✅ plus calculé depuis DB
  }));
}

  // ----------------------------
  // DROP RATES (inchangé)
  // ----------------------------

  async getDropRates(input: GetDropRatesInput) {
    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const wantUnit = input.mode === 'unit' || input.mode === 'global';
    const wantDisplay = input.mode === 'display' || input.mode === 'global';

    const [boosterOpenings, displayOpenings] = await Promise.all([
      wantUnit
        ? this.boosterOpenRepo.find({
            where: { openedAt: MoreThanOrEqual(since) } as any,
            select: ['id', 'openedAt', 'cardIds'] as any,
          })
        : Promise.resolve([] as BoosterOpening[]),

      wantDisplay
        ? this.displayOpenRepo.find({
            where: { openedAt: MoreThanOrEqual(since) } as any,
            select: ['id', 'openedAt', 'season', 'resultJson'] as any,
          })
        : Promise.resolve([] as DisplayOpening[]),
    ]);

    const allIds = new Set<number>();

    for (const o of boosterOpenings) {
      const ids: number[] = (o as any).cardIds ?? [];
      for (const id of ids) allIds.add(id);
    }

    for (const d of displayOpenings) {
      const boosters: number[][] = (d as any).resultJson?.boosters ?? [];
      for (const b of boosters) for (const id of b) allIds.add(id);
    }

    const idsArr = Array.from(allIds);
    const cards = idsArr.length ? await (this.cardRepo as any).findByIds(idsArr) : [];
    const cardById = new Map<number, Card>();
    for (const c of cards) cardById.set(c.id, c);

    const seasons: Season[] = ['Origins', 'Campus', 'Battle', 'Stellar'];
    const seasonFilter = input.season;

    const makeAcc = () => ({
      boostersCount: 0,
      unitBoostersCount: 0,
      displayBoostersCount: 0,
      displaysCount: 0,

      normalBoostersCount: 0,
      normalCardsTotal: 0,
      slot1_total: 0,
      slotMain_total: 0,
      slot11_total: 0,
      slot1_byRarity: {} as Record<string, number>,
      slotMain_byRarity: {} as Record<string, number>,
      slot11_byRarity: {} as Record<string, number>,

      goldBoostersCount: 0,
      goldCardsTotal: 0,
      gold_byRarity: {} as Record<string, number>,
    });

    const accGlobal = makeAcc();
    const accBySeason: Record<Season, ReturnType<typeof makeAcc>> = {
      Origins: makeAcc(),
      Campus: makeAcc(),
      Battle: makeAcc(),
      Stellar: makeAcc(),
    };

    const isGoldBooster = (ids: number[]) => {
      if (ids.length !== 4) return false;
      for (const id of ids) {
        const c = cardById.get(id);
        if (c?.rarity === 'Booster Gold') return true;
      }
      return false;
    };

    const detectSeasonFromIds = (ids: number[]): Season | null => {
      if (!ids.length) return null;
      const first = cardById.get(ids[0]);
      const season = first?.season as Season | undefined;
      if (season && seasons.includes(season)) return season;

      for (const id of ids) {
        const c = cardById.get(id);
        const s = c?.season as Season | undefined;
        if (s && seasons.includes(s)) return s;
      }
      return null;
    };

    const addGold = (acc: ReturnType<typeof makeAcc>, ids: number[]) => {
      acc.boostersCount += 1;
      acc.goldBoostersCount += 1;
      acc.goldCardsTotal += ids.length;

      for (const id of ids) {
        const c = cardById.get(id);
        inc(acc.gold_byRarity, c?.rarity ?? 'UNKNOWN');
      }
    };

    const addNormal = (acc: ReturnType<typeof makeAcc>, ids: number[]) => {
      acc.boostersCount += 1;
      acc.normalBoostersCount += 1;
      acc.normalCardsTotal += ids.length;

      if (ids[0]) {
        const c = cardById.get(ids[0]);
        inc(acc.slot1_byRarity, c?.rarity ?? 'UNKNOWN');
        acc.slot1_total += 1;
      }

      const mainIds = ids.slice(1, 10);
      for (const id of mainIds) {
        const c = cardById.get(id);
        inc(acc.slotMain_byRarity, c?.rarity ?? 'UNKNOWN');
        acc.slotMain_total += 1;
      }

      if (ids.length >= 11) {
        const id11 = ids[10];
        const c = cardById.get(id11);
        inc(acc.slot11_byRarity, c?.rarity ?? 'UNKNOWN');
        acc.slot11_total += 1;
      }
    };

    const pushBooster = (season: Season, ids: number[], origin: 'unit' | 'display') => {
      const accS = accBySeason[season];

      const doAcc = (acc: ReturnType<typeof makeAcc>) => {
        if (origin === 'unit') acc.unitBoostersCount += 1;
        else acc.displayBoostersCount += 1;

        if (isGoldBooster(ids)) {
          addGold(acc, ids);
          if (!input.includeGold) return;
          return;
        }

        addNormal(acc, ids);
      };

      doAcc(accS);
      doAcc(accGlobal);
    };

    const pushDisplay = (season: Season, boosters: number[][]) => {
      const accS = accBySeason[season];

      accS.displaysCount += 1;
      accGlobal.displaysCount += 1;

      for (const ids of boosters) pushBooster(season, ids, 'display');
    };

    for (const o of boosterOpenings) {
      const ids: number[] = (o as any).cardIds ?? [];
      if (!ids.length) continue;

      const season = detectSeasonFromIds(ids);
      if (!season) continue;

      if (seasonFilter && season !== seasonFilter) continue;
      pushBooster(season, ids, 'unit');
    }

    for (const d of displayOpenings) {
      const season = (d as any).season as Season;
      if (!season || !seasons.includes(season)) continue;

      if (seasonFilter && season !== seasonFilter) continue;

      const boosters: number[][] = (d as any).resultJson?.boosters ?? [];
      if (!boosters.length) continue;

      pushDisplay(season, boosters);
    }

    const format = (acc: ReturnType<typeof makeAcc>) => ({
      windows: { since, days: input.days },
      totals: {
        displays: acc.displaysCount,
        boosters: acc.boostersCount,
        boosters_unit: acc.unitBoostersCount,
        boosters_display: acc.displayBoostersCount,
      },
      normal: {
        boosters: acc.normalBoostersCount,
        cards: acc.normalCardsTotal,
        slot1: {
          total: acc.slot1_total,
          byRarity: toRates(acc.slot1_byRarity, acc.slot1_total),
        },
        slots2to10: {
          total: acc.slotMain_total,
          byRarity: toRates(acc.slotMain_byRarity, acc.slotMain_total),
        },
        slot11: {
          total: acc.slot11_total,
          byRarity: toRates(acc.slot11_byRarity, acc.slot11_total),
        },
      },
      gold: {
        boosters: acc.goldBoostersCount,
        cards: acc.goldCardsTotal,
        byRarity: toRates(acc.gold_byRarity, acc.goldCardsTotal),
      },
    });

    if (input.mode === 'global') {
      return {
        mode: input.mode,
        season: seasonFilter ?? null,
        includeGold: input.includeGold,
        global: format(accGlobal),
        bySeason: Object.fromEntries(seasons.map((s) => [s, format(accBySeason[s])])),
      };
    }

    return {
      mode: input.mode,
      season: seasonFilter ?? null,
      includeGold: input.includeGold,
      global: format(accGlobal),
    };
  }
}
