"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const card_entity_1 = require("../cards/card.entity");
const booster_opening_entity_1 = require("../booster/booster-opening.entity");
const display_opening_entity_1 = require("../booster/display-opening.entity");
const user_card_entity_1 = require("../users/user-card.entity");
function inc(map, key, v = 1) {
    map[key] = (map[key] ?? 0) + v;
}
function toRates(counts, total) {
    const out = {};
    const keys = Object.keys(counts).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    for (const k of keys) {
        const c = counts[k] ?? 0;
        out[k] = { count: c, rate: total > 0 ? c / total : 0 };
    }
    return out;
}
function normalizeText(value) {
    return (value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’`-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function normalizeSeasonKey(value) {
    const s = normalizeText(value);
    if (s.includes('origins'))
        return 'Origins';
    if (s.includes('campus'))
        return 'Campus';
    if (s.includes('battle'))
        return 'Battle';
    if (s.includes('stellar'))
        return 'Stellar';
    if (s.includes('legacy'))
        return 'Legacy';
    return null;
}
function isSpecialCardLike(card) {
    const seasonKey = normalizeSeasonKey(card.seasonKey);
    const name = normalizeText(card.name);
    const rarity = normalizeText(card.rarity);
    const key = normalizeText(card.key);
    const type = normalizeText(card.type);
    const haystack = `${name} ${rarity} ${key} ${type}`;
    if (rarity.includes('booster gold'))
        return true;
    if (haystack.includes('starter'))
        return true;
    if (haystack.includes('ticket d or'))
        return true;
    if (haystack.includes('gagnant ticket d or'))
        return true;
    return !seasonKey;
}
function normalizeRarityBucket(card) {
    const rarity = normalizeText(card.rarity);
    const name = normalizeText(card.name);
    const key = normalizeText(card.key);
    const type = normalizeText(card.type);
    const haystack = `${name} ${rarity} ${key} ${type}`;
    if (haystack.includes('gagnant ticket d or'))
        return "Gagnant ticket d'or";
    if (haystack.includes('ticket d or'))
        return "Ticket d'or";
    if (haystack.includes('starter'))
        return 'Starter Pack';
    if (rarity.includes('booster gold'))
        return 'Booster Gold';
    if (rarity.includes('terrain') || type.includes('terrain'))
        return 'Terrain';
    if (rarity.includes('u1') || rarity.includes('ultra rare holo 1') || rarity.includes('ultra rare u1'))
        return 'U1';
    if (rarity.includes('u2') || rarity.includes('ultra rare holo 2') || rarity.includes('ultra rare u2'))
        return 'U2';
    if (rarity.includes('duo'))
        return 'Duo';
    if (rarity.includes('peu commune') || rarity.includes('peu-commune'))
        return 'Peu commune';
    if (rarity === 'commune' || rarity.endsWith(' commune') || rarity.startsWith('commune '))
        return 'Commune';
    if (rarity === 'rare' || rarity.startsWith('rare '))
        return 'Rare';
    if (rarity.includes('legendaire') || rarity.includes('legendary')) {
        if (rarity.includes('bronze'))
            return 'Légendaire bronze';
        if (rarity.includes('argent') || rarity.includes('silver'))
            return 'Légendaire argent';
        if (rarity.includes('or') || rarity.includes('gold') || rarity.includes('doree') || rarity.includes('dorée')) {
            return 'Légendaire or';
        }
    }
    return card.rarity ?? 'Autre';
}
let StatsService = class StatsService {
    cardRepo;
    boosterOpenRepo;
    displayOpenRepo;
    userCardRepo;
    dataSource;
    constructor(cardRepo, boosterOpenRepo, displayOpenRepo, userCardRepo, dataSource) {
        this.cardRepo = cardRepo;
        this.boosterOpenRepo = boosterOpenRepo;
        this.displayOpenRepo = displayOpenRepo;
        this.userCardRepo = userCardRepo;
        this.dataSource = dataSource;
    }
    async getMyStats(userId) {
        const [boostersOpened, displaysOpened, userCards, allCards] = await Promise.all([
            this.safeCountByUser(this.boosterOpenRepo, 'booster_openings', userId),
            this.safeCountByUser(this.displayOpenRepo, 'display_openings', userId),
            this.getUserCardStatsRows(userId),
            this.getAllCardMetaRows(),
        ]);
        const totalCards = userCards.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
        const uniqueCardsTotal = userCards.length;
        const rarities = {};
        for (const row of userCards) {
            const bucket = normalizeRarityBucket(row);
            inc(rarities, bucket, Number(row.quantity ?? 0));
        }
        const raritiesBySeason = {
            Origins: {},
            Campus: {},
            Battle: {},
            Stellar: {},
            Legacy: {},
        };
        for (const row of userCards) {
            const season = normalizeSeasonKey(row.seasonKey);
            if (!season)
                continue;
            const bucket = normalizeRarityBucket(row);
            inc(raritiesBySeason[season], bucket, Number(row.quantity ?? 0));
        }
        const seasonProgress = this.buildSeasonProgress(userCards, allCards);
        return {
            boostersOpened,
            displaysOpened,
            cardsTotal: totalCards,
            uniqueCardsTotal,
            uniqueCards: uniqueCardsTotal,
            seasonProgress,
            rarities,
            raritiesBySeason,
        };
    }
    async safeCountByUser(repo, tableName, userId) {
        try {
            return await repo.count({ where: { user: { id: userId } } });
        }
        catch { }
        try {
            return await repo.count({ where: { userId } });
        }
        catch { }
        try {
            const rows = await this.dataSource.query(`SELECT COUNT(*) as c FROM ${tableName} WHERE userId = ?`, [userId]);
            return Number(rows?.[0]?.c ?? 0);
        }
        catch { }
        const rows = await this.dataSource.query(`SELECT COUNT(*) as c FROM ${tableName} WHERE user_id = ?`, [userId]);
        return Number(rows?.[0]?.c ?? 0);
    }
    async getUserCardStatsRows(userId) {
        const rows = await this.dataSource.query(`
      SELECT
        uc.card_id AS card_id,
        uc.quantity AS quantity,
        c.name AS name,
        c.rarity AS rarity,
        c.key AS \`key\`,
        c.type AS type,
        COALESCE(c.season, c.extension) AS seasonKey
      FROM user_cards uc
      INNER JOIN cards c ON c.id = uc.card_id
      WHERE uc.user_id = ?
      `, [userId]);
        return (rows ?? []).map((row) => ({
            card_id: Number(row.card_id),
            quantity: Number(row.quantity ?? 0),
            name: row.name ?? null,
            rarity: row.rarity ?? null,
            key: row.key ?? null,
            type: row.type ?? null,
            seasonKey: row.seasonKey ?? null,
        }));
    }
    async getAllCardMetaRows() {
        const rows = await this.dataSource.query(`
      SELECT
        c.id AS id,
        c.name AS name,
        c.rarity AS rarity,
        c.key AS \`key\`,
        c.type AS type,
        COALESCE(c.season, c.extension) AS seasonKey
      FROM cards c
      `);
        return (rows ?? []).map((row) => ({
            id: Number(row.id),
            name: row.name ?? null,
            rarity: row.rarity ?? null,
            key: row.key ?? null,
            type: row.type ?? null,
            seasonKey: row.seasonKey ?? null,
        }));
    }
    buildSeasonProgress(ownedCards, allCards) {
        const OFFICIAL_TOTALS = {
            Origins: 180,
            Campus: 155,
            Battle: 180,
            Stellar: 180,
            Legacy: 185,
        };
        const coreSeasons = ['Origins', 'Campus', 'Battle', 'Stellar', 'Legacy'];
        const ownedMap = new Map();
        for (const season of coreSeasons)
            ownedMap.set(season, 0);
        let ownedSpecial = 0;
        for (const row of ownedCards) {
            if (isSpecialCardLike(row)) {
                ownedSpecial += 1;
                continue;
            }
            const season = normalizeSeasonKey(row.seasonKey);
            if (season)
                ownedMap.set(season, (ownedMap.get(season) ?? 0) + 1);
        }
        const specialTotal = allCards.filter((card) => isSpecialCardLike(card)).length;
        return [
            ...coreSeasons.map((season) => ({
                season,
                ownedUnique: ownedMap.get(season) ?? 0,
                total: OFFICIAL_TOTALS[season],
            })),
            {
                season: 'Hors série',
                ownedUnique: ownedSpecial,
                total: specialTotal,
            },
        ];
    }
    async getDropRates(input) {
        const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
        const wantUnit = input.mode === 'unit' || input.mode === 'global';
        const wantDisplay = input.mode === 'display' || input.mode === 'global';
        const [boosterOpenings, displayOpenings] = await Promise.all([
            wantUnit
                ? this.boosterOpenRepo.find({
                    where: { openedAt: (0, typeorm_2.MoreThanOrEqual)(since) },
                    select: ['id', 'openedAt', 'cardIds'],
                })
                : Promise.resolve([]),
            wantDisplay
                ? this.displayOpenRepo.find({
                    where: { openedAt: (0, typeorm_2.MoreThanOrEqual)(since) },
                    select: ['id', 'openedAt', 'season', 'resultJson'],
                })
                : Promise.resolve([]),
        ]);
        const allIds = new Set();
        for (const o of boosterOpenings) {
            const ids = o.cardIds ?? [];
            for (const id of ids)
                allIds.add(id);
        }
        for (const d of displayOpenings) {
            const boosters = d.resultJson?.boosters ?? [];
            for (const b of boosters)
                for (const id of b)
                    allIds.add(id);
        }
        const idsArr = Array.from(allIds);
        const cards = idsArr.length ? await this.cardRepo.findByIds(idsArr) : [];
        const cardById = new Map();
        for (const c of cards)
            cardById.set(c.id, c);
        const seasons = ['Origins', 'Campus', 'Battle', 'Stellar', 'Legacy'];
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
            slot1_byRarity: {},
            slotMain_byRarity: {},
            slot11_byRarity: {},
            goldBoostersCount: 0,
            goldCardsTotal: 0,
            gold_byRarity: {},
        });
        const accGlobal = makeAcc();
        const accBySeason = {
            Origins: makeAcc(),
            Campus: makeAcc(),
            Battle: makeAcc(),
            Stellar: makeAcc(),
            Legacy: makeAcc(),
        };
        const isGoldBooster = (ids) => {
            if (ids.length !== 4)
                return false;
            for (const id of ids) {
                const c = cardById.get(id);
                if (c?.rarity === 'Booster Gold')
                    return true;
            }
            return false;
        };
        const detectSeasonFromIds = (ids) => {
            if (!ids.length)
                return null;
            const first = cardById.get(ids[0]);
            const season = first?.season;
            if (season && seasons.includes(season))
                return season;
            for (const id of ids) {
                const c = cardById.get(id);
                const s = c?.season;
                if (s && seasons.includes(s))
                    return s;
            }
            return null;
        };
        const addGold = (acc, ids) => {
            acc.boostersCount += 1;
            acc.goldBoostersCount += 1;
            acc.goldCardsTotal += ids.length;
            for (const id of ids) {
                const c = cardById.get(id);
                inc(acc.gold_byRarity, c?.rarity ?? 'UNKNOWN');
            }
        };
        const addNormal = (acc, ids) => {
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
        const pushBooster = (season, ids, origin) => {
            const accS = accBySeason[season];
            const doAcc = (acc) => {
                if (origin === 'unit')
                    acc.unitBoostersCount += 1;
                else
                    acc.displayBoostersCount += 1;
                if (isGoldBooster(ids)) {
                    addGold(acc, ids);
                    if (!input.includeGold)
                        return;
                    return;
                }
                addNormal(acc, ids);
            };
            doAcc(accS);
            doAcc(accGlobal);
        };
        const pushDisplay = (season, boosters) => {
            const accS = accBySeason[season];
            accS.displaysCount += 1;
            accGlobal.displaysCount += 1;
            for (const ids of boosters)
                pushBooster(season, ids, 'display');
        };
        for (const o of boosterOpenings) {
            const ids = o.cardIds ?? [];
            if (!ids.length)
                continue;
            const season = detectSeasonFromIds(ids);
            if (!season)
                continue;
            if (seasonFilter && season !== seasonFilter)
                continue;
            pushBooster(season, ids, 'unit');
        }
        for (const d of displayOpenings) {
            const season = d.season;
            if (!season || !seasons.includes(season))
                continue;
            if (seasonFilter && season !== seasonFilter)
                continue;
            const boosters = d.resultJson?.boosters ?? [];
            if (!boosters.length)
                continue;
            pushDisplay(season, boosters);
        }
        const format = (acc) => ({
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
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(card_entity_1.Card)),
    __param(1, (0, typeorm_1.InjectRepository)(booster_opening_entity_1.BoosterOpening)),
    __param(2, (0, typeorm_1.InjectRepository)(display_opening_entity_1.DisplayOpening)),
    __param(3, (0, typeorm_1.InjectRepository)(user_card_entity_1.UserCard)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], StatsService);
//# sourceMappingURL=stats.service.js.map