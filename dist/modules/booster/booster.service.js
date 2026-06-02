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
exports.BoosterService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const card_entity_1 = require("../cards/card.entity");
const users_service_1 = require("../users/users.service");
const economy_service_1 = require("../economy/economy.service");
const booster_opening_entity_1 = require("./booster-opening.entity");
const display_opening_entity_1 = require("./display-opening.entity");
const economy_analytics_service_1 = require("../economy/economy-analytics.service");
const anti_abuse_service_1 = require("../security/anti-abuse.service");
const profile_service_1 = require("../profile/profile.service");
let BoosterService = class BoosterService {
    cardRepo;
    boosterOpeningRepo;
    displayOpeningRepo;
    users;
    economy;
    economyAnalyticsService;
    antiAbuseService;
    profileService;
    dataSource;
    constructor(cardRepo, boosterOpeningRepo, displayOpeningRepo, users, economy, economyAnalyticsService, antiAbuseService, profileService, dataSource) {
        this.cardRepo = cardRepo;
        this.boosterOpeningRepo = boosterOpeningRepo;
        this.displayOpeningRepo = displayOpeningRepo;
        this.users = users;
        this.economy = economy;
        this.economyAnalyticsService = economyAnalyticsService;
        this.antiAbuseService = antiAbuseService;
        this.profileService = profileService;
        this.dataSource = dataSource;
    }
    FILLER_WEIGHTS = [
        { rarity: 'Commune', weight: 45 },
        { rarity: 'Peu commune', weight: 30 },
        { rarity: 'Rare', weight: 10 },
    ];
    PREMIUM_RARITY_CHANCES = [
        { rarity: 'Ultra Rare (U1)', chance: 0.212 },
        { rarity: 'Ultra Rare (U2)', chance: 0.151 },
        { rarity: 'Légendaire bronze', chance: 0.08 },
        { rarity: 'Légendaire argent', chance: 0.028 },
        { rarity: 'Légendaire dorée', chance: 0.008 },
    ];
    REQUIRED_OPENING_RARITIES = [
        'Commune',
        'Peu commune',
        'Rare',
        'Ultra Rare (U1)',
        'Ultra Rare (U2)',
        'Légendaire bronze',
        'Légendaire argent',
        'Légendaire dorée',
    ];
    CHANCE_TICKET_SLOT = 0.0417;
    CHANCE_TICKET_OR_AS_11TH = 0.001;
    LEGACY_SEASON_NUMBER = 5;
    CHANCE_LEGACY_DUO_IN_BOOSTER = 0.023;
    DISPLAY_BOOSTERS = 24;
    CHANCE_DISPLAY_HAS_GOLD = 1 / 6;
    OPENING_HISTORY_MAX_ITEMS = 50;
    randInt(maxExclusive) {
        return Math.floor(Math.random() * maxExclusive);
    }
    pickWeighted(items) {
        const total = items.reduce((s, it) => s + it.weight, 0);
        let r = Math.random() * total;
        for (const it of items) {
            r -= it.weight;
            if (r <= 0)
                return it;
        }
        return items[items.length - 1];
    }
    pickOne(arr, label) {
        if (!arr.length) {
            throw new common_1.BadRequestException(`Aucune carte trouvée pour: ${label}`);
        }
        return arr[this.randInt(arr.length)];
    }
    pickUnique(pool, already, label) {
        if (!pool.length) {
            throw new common_1.BadRequestException(`Aucune carte trouvée pour: ${label}`);
        }
        if (pool.length <= already.size)
            return this.pickOne(pool, label);
        for (let i = 0; i < 40; i++) {
            const c = this.pickOne(pool, label);
            if (!already.has(c.id))
                return c;
        }
        return this.pickOne(pool, label);
    }
    normalizeText(value) {
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
    normalizeSeasonNumber(value) {
        const num = Number(value);
        return Number.isInteger(num) && num > 0 ? num : null;
    }
    cardTokens(card) {
        const fields = [
            card.key,
            card.slug,
            card.identifier,
            card.code,
            card.rarity,
            card.name,
            card.type,
            card.subtype,
            card.family,
            card.extension,
            card.season,
            card.specialCategory,
            card.affiliatedSeason,
            card.sourceRarity,
            card.sourceRaritySlug,
            card.description,
        ];
        return fields
            .map((v) => this.normalizeText(v))
            .filter((v) => v.length > 0);
    }
    cardMatches(card, ...needles) {
        const hay = this.cardTokens(card).join(' | ');
        return needles.every((n) => hay.includes(this.normalizeText(n)));
    }
    isTicketOrCard(card) {
        const rarity = this.normalizeText(card.rarity);
        const category = this.normalizeText(card.specialCategory);
        const sourceRarity = this.normalizeText(card.sourceRarity);
        const isPureTicket = rarity === "ticket d'or" ||
            rarity === 'ticket d or' ||
            category === "ticket d'or" ||
            category === 'ticket d or' ||
            sourceRarity === "ticket d'or" ||
            sourceRarity === 'ticket d or';
        return isPureTicket && !this.isGtoCard(card);
    }
    isGtoCard(card) {
        const values = [
            card.rarity,
            card.specialCategory,
            card.sourceRarity,
            card.sourceRaritySlug,
        ].map((value) => this.normalizeText(value));
        return values.some((value) => value.includes('gagnant') &&
            value.includes('ticket') &&
            value.includes('or'));
    }
    isGoldBoosterCard(card) {
        const values = [
            card.rarity,
            card.specialCategory,
            card.sourceRarity,
            card.sourceRaritySlug,
        ].map((value) => this.normalizeText(value));
        return values.some((value) => value.includes('booster') && value.includes('gold'));
    }
    getOpeningAffiliatedSeasonNumber(card) {
        return (this.normalizeSeasonNumber(card.seasonNumber) ??
            this.normalizeSeasonNumber(card.affiliatedSeasonNumber));
    }
    getSeasonLabelFromCards(cards, seasonNumber) {
        const firstWithExtension = cards.find((c) => this.normalizeText(c.extension));
        const firstWithSeason = cards.find((c) => this.normalizeText(c.season));
        const extension = firstWithExtension?.extension ?? null;
        const season = firstWithSeason?.season ?? null;
        const label = extension?.toString().trim() ||
            season?.toString().trim() ||
            `Saison ${seasonNumber}`;
        return {
            label,
            extension: extension ? String(extension) : null,
            season: season ? String(season) : null,
        };
    }
    buildSeasonCatalog(cards) {
        const grouped = new Map();
        for (const card of cards) {
            const seasonNumber = this.normalizeSeasonNumber(card.seasonNumber);
            if (!seasonNumber)
                continue;
            const arr = grouped.get(seasonNumber) ?? [];
            arr.push(card);
            grouped.set(seasonNumber, arr);
        }
        return Array.from(grouped.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([seasonNumber, seasonCards]) => {
            const { label, extension, season } = this.getSeasonLabelFromCards(seasonCards, seasonNumber);
            const rarityCounts = {};
            for (const card of seasonCards) {
                rarityCounts[card.rarity] = (rarityCounts[card.rarity] ?? 0) + 1;
            }
            const missingRequirements = [];
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
    async getSeasonDefinitionOrThrow(seasonNumber) {
        const allCards = await this.cardRepo.find();
        const catalog = this.buildSeasonCatalog(allCards);
        const seasonDef = catalog.find((item) => item.seasonNumber === seasonNumber);
        if (!seasonDef) {
            throw new common_1.NotFoundException(`Saison ${seasonNumber} introuvable.`);
        }
        if (!seasonDef.isOpenable) {
            throw new common_1.BadRequestException(`La saison ${seasonDef.label} n'est pas ouvrable. Éléments manquants: ${seasonDef.missingRequirements.join(', ')}`);
        }
        return {
            seasonDef,
            allCards,
        };
    }
    legendaryPickRarityProportional() {
        const items = [
            { rarity: 'Légendaire bronze', weight: 0.8 },
            { rarity: 'Légendaire argent', weight: 0.28 },
            { rarity: 'Légendaire dorée', weight: 0.08 },
        ];
        return this.pickWeighted(items).rarity;
    }
    sortByRarityForDisplay(cards) {
        const order = new Map([
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
        return [...cards].sort((a, b) => (order.get(a.rarity) ?? 999) - (order.get(b.rarity) ?? 999));
    }
    async loadPools(seasonNumber) {
        const { seasonDef, allCards } = await this.getSeasonDefinitionOrThrow(seasonNumber);
        const seasonCards = allCards.filter((c) => this.normalizeSeasonNumber(c.seasonNumber) === seasonNumber);
        const terrain = seasonCards.filter((c) => this.normalizeText(c.rarity) === 'terrain');
        const byRarity = new Map();
        for (const c of seasonCards) {
            const arr = byRarity.get(c.rarity) ?? [];
            arr.push(c);
            byRarity.set(c.rarity, arr);
        }
        const ticketOrCards = allCards.filter((c) => this.isTicketOrCard(c));
        const goldCards = allCards.filter((c) => this.isGoldBoosterCard(c));
        const gtoSeason = allCards.filter((c) => this.isGtoCard(c) &&
            this.getOpeningAffiliatedSeasonNumber(c) === seasonNumber);
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
    pickFillerRarity() {
        return this.pickWeighted(this.FILLER_WEIGHTS).rarity;
    }
    pickOptionalPremiumRarity(args) {
        const items = [...this.PREMIUM_RARITY_CHANCES];
        const duoPool = args.pools.byRarity.get('Duo') ?? [];
        if (args.seasonNumber === this.LEGACY_SEASON_NUMBER && duoPool.length > 0) {
            items.push({ rarity: 'Duo', chance: this.CHANCE_LEGACY_DUO_IN_BOOSTER });
        }
        const totalChance = items.reduce((sum, item) => sum + item.chance, 0);
        if (Math.random() >= totalChance)
            return null;
        let r = Math.random() * totalChance;
        for (const item of items) {
            r -= item.chance;
            if (r <= 0)
                return item.rarity;
        }
        return items[items.length - 1]?.rarity ?? null;
    }
    buildNormalBooster(args) {
        const { seasonLabel, seasonNumber, pools } = args;
        const picked = new Set();
        const out = [];
        const terrain = this.pickUnique(pools.terrain, picked, `Terrain:${seasonLabel}`);
        out.push(terrain);
        picked.add(terrain.id);
        const forceLegendary = Boolean(args.forceOneLegendaryInMain);
        const premiumRarity = forceLegendary
            ? this.legendaryPickRarityProportional()
            : this.pickOptionalPremiumRarity({ seasonNumber, pools });
        const premiumIndex = premiumRarity ? 1 + this.randInt(9) : -1;
        for (let i = 0; i < 9; i++) {
            const outIndex = 1 + i;
            let rarity = outIndex === premiumIndex && premiumRarity
                ? premiumRarity
                : this.pickFillerRarity();
            if (rarity === 'Terrain')
                rarity = 'Commune';
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
                    throw new common_1.BadRequestException(`Aucune carte "Ticket d'or" trouvée en base.`);
                }
                const t = this.pickOne(pools.ticketOrCards, "Ticket d'or");
                out.push(t);
            }
            else {
                if (!pools.gtoCards.length) {
                    throw new common_1.BadRequestException(`Aucune carte "Gagnant ticket d'or" trouvée pour ${seasonLabel}. Vérifie rarity/key/name/extension.`);
                }
                const g = this.pickOne(pools.gtoCards, `GTO:${seasonLabel}`);
                out.push(g);
            }
        }
        return out;
    }
    buildGoldBooster(pools) {
        if (!pools.goldCards.length) {
            throw new common_1.BadRequestException('Aucune carte Booster Gold trouvée en base.');
        }
        const picked = new Set();
        const out = [];
        for (let i = 0; i < 4; i++) {
            const c = this.pickUnique(pools.goldCards, picked, 'Booster Gold');
            out.push(c);
            picked.add(c.id);
        }
        return out;
    }
    cloneOwnedMap(source) {
        return new Map(source);
    }
    applyCardsToOwnedMap(owned, cards) {
        for (const c of cards) {
            owned.set(c.id, (owned.get(c.id) ?? 0) + 1);
        }
    }
    async computeBoosterCreditsFromCards(args) {
        const newCardIds = [];
        const seen = new Set();
        for (const c of args.cards) {
            if (seen.has(c.id))
                continue;
            seen.add(c.id);
            const qty = args.ownedBefore.get(c.id) ?? 0;
            if (qty === 0)
                newCardIds.push(c.id);
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
    computeNewCardsMeta(args) {
        const newCardIds = [];
        const newCardKeys = [];
        const seen = new Set();
        for (const c of args.cards) {
            if (seen.has(c.id))
                continue;
            seen.add(c.id);
            const qty = args.ownedBefore.get(c.id) ?? 0;
            if (qty === 0) {
                newCardIds.push(c.id);
                if (c.key)
                    newCardKeys.push(c.key);
            }
        }
        return { newCardIds, newCardKeys };
    }
    clampHistoryPage(raw) {
        const n = Number.parseInt(String(raw ?? ''), 10);
        if (!Number.isFinite(n))
            return 1;
        return Math.max(1, n);
    }
    clampHistoryPerPage(rawPerPage, rawLimit) {
        const n = Number.parseInt(String(rawPerPage ?? rawLimit ?? ''), 10);
        if (!Number.isFinite(n))
            return 12;
        return Math.max(1, Math.min(50, n));
    }
    isSavedBigHit(card) {
        const rarity = this.normalizeText(card?.rarity);
        return (rarity.includes('u1') ||
            rarity.includes('u2') ||
            rarity.includes('ultra rare') ||
            rarity.includes('duo') ||
            rarity.includes('legendaire') ||
            rarity.includes('booster gold') ||
            rarity.includes('ticket'));
    }
    getStoredCardId(card) {
        const value = Number(card?.id ?? card?.cardId);
        return Number.isFinite(value) ? value : null;
    }
    isStoredCardNew(card, result) {
        if (Boolean(card?.isNew))
            return true;
        const id = this.getStoredCardId(card);
        const key = typeof card?.key === 'string' ? card.key : null;
        const newIds = new Set((Array.isArray(result?.newCardIds) ? result.newCardIds : [])
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value)));
        const newKeys = new Set((Array.isArray(result?.newCardKeys) ? result.newCardKeys : [])
            .map((value) => String(value))
            .filter(Boolean));
        return (id !== null && newIds.has(id)) || (key !== null && newKeys.has(key));
    }
    isOpeningHistoryCard(card, result) {
        return this.isStoredCardNew(card, result) || this.isSavedBigHit(card);
    }
    extractSavedCreditsTotal(result) {
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
            if (typeof value === 'number' && Number.isFinite(value))
                return value;
        }
        return null;
    }
    normalizeStoredOpeningResult(kind, row) {
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
        if (stored &&
            !Array.isArray(stored) &&
            Array.isArray(stored.boosters) &&
            (stored.boosters.length === 0 ||
                !Array.isArray(stored.boosters[0]) ||
                typeof stored.boosters[0]?.[0] === 'object')) {
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
    flattenStoredOpeningCards(kind, result) {
        if (kind === 'display') {
            return Array.isArray(result?.boosters)
                ? result.boosters.flatMap((b) => (Array.isArray(b) ? b : []))
                : [];
        }
        return Array.isArray(result?.cards) ? result.cards : [];
    }
    getOpeningHistoryCards(kind, result) {
        return this
            .flattenStoredOpeningCards(kind, result)
            .filter((card) => this.isOpeningHistoryCard(card, result));
    }
    buildOpeningHistoryReplayResult(kind, result) {
        if (kind === 'display') {
            const boosters = Array.isArray(result?.boosters)
                ? result.boosters
                    .map((boosterCards) => Array.isArray(boosterCards)
                    ? boosterCards.filter((card) => this.isOpeningHistoryCard(card, result))
                    : [])
                    .filter((boosterCards) => boosterCards.length > 0)
                : [];
            return {
                ...result,
                boosters,
            };
        }
        const cards = Array.isArray(result?.cards)
            ? result.cards.filter((card) => this.isOpeningHistoryCard(card, result))
            : [];
        return {
            ...result,
            cards,
        };
    }
    buildOpeningHistoryItem(kind, row) {
        const result = this.normalizeStoredOpeningResult(kind, row);
        const flatCards = this.flattenStoredOpeningCards(kind, result);
        const historyCards = this.getOpeningHistoryCards(kind, result);
        const newIds = Array.isArray(result?.newCardIds) ? result.newCardIds : [];
        const newCards = flatCards.filter((card) => this.isStoredCardNew(card, result));
        const hitCards = flatCards.filter((card) => this.isSavedBigHit(card));
        const coverCard = historyCards.find((card) => this.isSavedBigHit(card)) ??
            historyCards[0] ??
            null;
        return {
            id: row.id,
            kind,
            openedAt: row.openedAt,
            season: result?.season ?? row?.seasonLabel ?? row?.season ?? 'Saison inconnue',
            seasonNumber: result?.seasonNumber ?? row?.seasonNumber ?? null,
            boosterCount: kind === 'display'
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
    buildOpeningLogDetails(kind, result) {
        const flatCards = this.flattenStoredOpeningCards(kind, result);
        const historyCards = this.getOpeningHistoryCards(kind, result);
        const cardIds = Array.from(new Set(flatCards
            .map((card) => this.getStoredCardId(card))
            .filter((id) => Number.isInteger(id) && id > 0)));
        const hitCardIds = Array.from(new Set(historyCards
            .filter((card) => this.isSavedBigHit(card))
            .map((card) => this.getStoredCardId(card))
            .filter((id) => Number.isInteger(id) && id > 0)));
        const newCardIds = Array.isArray(result?.newCardIds)
            ? result.newCardIds.filter((id) => Number.isInteger(id) && id > 0)
            : [];
        const primaryCard = historyCards.find((card) => this.isSavedBigHit(card)) ??
            historyCards[0] ??
            flatCards[0] ??
            null;
        return {
            cardId: this.getStoredCardId(primaryCard),
            cardIds,
            hitCardIds,
            newCardIds,
            highlights: historyCards.slice(0, 6).map((card) => ({
                id: this.getStoredCardId(card),
                name: card?.name ?? null,
                rarity: card?.rarity ?? null,
                isNew: this.isStoredCardNew(card, result),
            })),
        };
    }
    async hydrateHistoryCoverCards(items) {
        const coverIds = Array.from(new Set(items
            .flatMap((item) => [
            Number(item.coverCard?.id),
            ...(Array.isArray(item.previewCards)
                ? item.previewCards.map((card) => Number(card?.id))
                : []),
        ])
            .filter((id) => Number.isFinite(id) && id > 0)));
        if (coverIds.length === 0)
            return items;
        const cards = await this.cardRepo.find({
            where: { id: (0, typeorm_2.In)(coverIds) },
            select: ['id', 'key', 'name', 'rarity', 'imageUrl'],
        });
        const cardsById = new Map(cards.map((card) => [card.id, card]));
        return items.map((item) => {
            const cardId = Number(item.coverCard?.id);
            const freshCard = cardsById.get(cardId);
            const previewCards = Array.isArray(item.previewCards)
                ? item.previewCards.map((card) => {
                    const freshPreviewCard = cardsById.get(Number(card?.id));
                    if (!freshPreviewCard)
                        return card;
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
    async trimOpeningHistoryForUser(userId) {
        const [boosters, displays] = await Promise.all([
            this.boosterOpeningRepo.find({
                where: { user: { id: userId } },
                select: ['id', 'openedAt'],
                order: { openedAt: 'DESC', id: 'DESC' },
            }),
            this.displayOpeningRepo.find({
                where: { user: { id: userId } },
                select: ['id', 'openedAt'],
                order: { openedAt: 'DESC', id: 'DESC' },
            }),
        ]);
        const combined = [
            ...boosters.map((row) => ({
                kind: 'booster',
                id: row.id,
                openedAt: row.openedAt,
            })),
            ...displays.map((row) => ({
                kind: 'display',
                id: row.id,
                openedAt: row.openedAt,
            })),
        ].sort((a, b) => {
            const dateDiff = new Date(b.openedAt).getTime() -
                new Date(a.openedAt).getTime();
            if (dateDiff !== 0)
                return dateDiff;
            return b.id - a.id;
        });
        const rowsToDelete = combined.slice(this.OPENING_HISTORY_MAX_ITEMS);
        if (rowsToDelete.length === 0)
            return;
        const boosterIds = rowsToDelete
            .filter((row) => row.kind === 'booster')
            .map((row) => row.id);
        const displayIds = rowsToDelete
            .filter((row) => row.kind === 'display')
            .map((row) => row.id);
        await Promise.all([
            boosterIds.length > 0
                ? this.boosterOpeningRepo.delete({ id: (0, typeorm_2.In)(boosterIds) })
                : Promise.resolve(),
            displayIds.length > 0
                ? this.displayOpeningRepo.delete({ id: (0, typeorm_2.In)(displayIds) })
                : Promise.resolve(),
        ]);
    }
    async getOpeningHistory(userId, rawPage, rawPerPage, rawLimit) {
        await this.trimOpeningHistoryForUser(userId);
        const page = this.clampHistoryPage(rawPage);
        const perPage = this.clampHistoryPerPage(rawPerPage, rawLimit);
        const [boosters, displays, boosterTotal, displayTotal] = await Promise.all([
            this.boosterOpeningRepo.find({
                where: { user: { id: userId } },
                order: { openedAt: 'DESC', id: 'DESC' },
                take: this.OPENING_HISTORY_MAX_ITEMS,
            }),
            this.displayOpeningRepo.find({
                where: { user: { id: userId } },
                order: { openedAt: 'DESC', id: 'DESC' },
                take: this.OPENING_HISTORY_MAX_ITEMS,
            }),
            this.boosterOpeningRepo.count({
                where: { user: { id: userId } },
            }),
            this.displayOpeningRepo.count({
                where: { user: { id: userId } },
            }),
        ]);
        const total = Math.min(this.OPENING_HISTORY_MAX_ITEMS, boosterTotal + displayTotal);
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const safePage = Math.min(page, totalPages);
        const offset = (safePage - 1) * perPage;
        const rawItems = [
            ...boosters.map((row) => this.buildOpeningHistoryItem('booster', row)),
            ...displays.map((row) => this.buildOpeningHistoryItem('display', row)),
        ]
            .sort((a, b) => new Date(b.openedAt).getTime() -
            new Date(a.openedAt).getTime())
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
    async getOpeningReplay(userId, rawKind, rawId) {
        const kind = rawKind === 'display' ? 'display' : rawKind === 'booster' ? 'booster' : null;
        const id = Number.parseInt(String(rawId), 10);
        if (!kind || !Number.isFinite(id)) {
            throw new common_1.BadRequestException('Ouverture invalide.');
        }
        const repo = kind === 'display' ? this.displayOpeningRepo : this.boosterOpeningRepo;
        const row = await repo.findOne({
            where: { id, user: { id: userId } },
        });
        if (!row) {
            throw new common_1.NotFoundException('Ouverture introuvable.');
        }
        const result = this.normalizeStoredOpeningResult(kind, row);
        const item = this.buildOpeningHistoryItem(kind, row);
        if (!item.canReplay) {
            throw new common_1.BadRequestException('Cette ancienne ouverture ne contient pas assez de données pour être rejouée.');
        }
        return {
            ...item,
            result: this.buildOpeningHistoryReplayResult(kind, result),
        };
    }
    async openBooster(userId, seasonNumber) {
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
            const { breakdown, hasGTO, hasTicketOr, ticketOrIsNew } = await this.computeBoosterCreditsFromCards({
                cards,
                ownedBefore,
            });
            await this.economy.addCredits(userId, breakdown.total, { skipLog: true });
            const newIdsSet = new Set(newMeta.newCardIds);
            const firstOccurrenceMarked = new Set();
            const openingResult = {
                payment,
                season: pools.label,
                seasonNumber,
                cards: this.sortByRarityForDisplay(cards).map((c) => {
                    const isFirstNew = newIdsSet.has(c.id) && !firstOccurrenceMarked.has(c.id);
                    if (isFirstNew)
                        firstOccurrenceMarked.add(c.id);
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
        await this.economyAnalyticsService.addOpeningReward(result.creditsEarnedTotal);
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
    async openDisplay(userId, seasonNumber) {
        await this.antiAbuseService.assertRateLimit(userId, 'OPEN_DISPLAY');
        const payment = await this.economy.consumeOpen(userId, 'display');
        const pools = await this.loadPools(seasonNumber);
        const hasGoldBooster = Math.random() < this.CHANCE_DISPLAY_HAS_GOLD;
        const goldIndex = hasGoldBooster ? this.randInt(this.DISPLAY_BOOSTERS) : -1;
        let forcedLegendaryIndex = this.randInt(this.DISPLAY_BOOSTERS);
        if (hasGoldBooster && forcedLegendaryIndex === goldIndex) {
            forcedLegendaryIndex = (forcedLegendaryIndex + 1) % this.DISPLAY_BOOSTERS;
        }
        const boosters = [];
        for (let i = 0; i < this.DISPLAY_BOOSTERS; i++) {
            if (i === goldIndex) {
                boosters.push(this.buildGoldBooster(pools));
            }
            else {
                const forceLegendary = i === forcedLegendaryIndex;
                boosters.push(this.buildNormalBooster({
                    seasonLabel: pools.label,
                    seasonNumber,
                    pools,
                    forceOneLegendaryInMain: forceLegendary,
                }));
            }
        }
        const result = await this.dataSource.transaction(async (manager) => {
            const allCards = boosters.flat();
            const allCardIds = allCards.map((c) => c.id);
            const ownedBeforeGlobal = await this.users.getOwnedMap(userId, allCardIds);
            const simulatedOwned = this.cloneOwnedMap(ownedBeforeGlobal);
            const boosterBreakdowns = [];
            const displayNewCardIds = [];
            const displayNewCardKeys = [];
            const markedNewOnce = new Set();
            const boostersWithFlags = [];
            for (const boosterCards of boosters) {
                const ownedBeforeThisBooster = this.cloneOwnedMap(simulatedOwned);
                const { breakdown } = await this.computeBoosterCreditsFromCards({
                    cards: boosterCards,
                    ownedBefore: ownedBeforeThisBooster,
                });
                boosterBreakdowns.push(breakdown);
                const seenInsideBooster = new Set();
                const boosterWithFlags = this.sortByRarityForDisplay(boosterCards).map((c) => {
                    const qtyBeforeThisBooster = ownedBeforeThisBooster.get(c.id) ?? 0;
                    const firstTimeInThisBooster = !seenInsideBooster.has(c.id);
                    if (firstTimeInThisBooster) {
                        seenInsideBooster.add(c.id);
                    }
                    const isActuallyNewForDisplay = firstTimeInThisBooster &&
                        qtyBeforeThisBooster === 0 &&
                        !markedNewOnce.has(c.id);
                    if (isActuallyNewForDisplay) {
                        markedNewOnce.add(c.id);
                        displayNewCardIds.push(c.id);
                        if (c.key)
                            displayNewCardKeys.push(c.key);
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
        await this.economyAnalyticsService.addOpeningReward(result.creditsEarnedTotal);
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
    async boosterOpeningRepoSaveSafe(args) {
        try {
            await this.boosterOpeningRepo.save({
                user: { id: args.userId },
                openedAt: new Date(),
                seasonNumber: args.seasonNumber,
                seasonLabel: args.seasonLabel,
                boosterCount: args.boosterCount,
                cardIds: args.cards.map((c) => c.id),
                resultJson: args.result ??
                    args.cards.map((c) => ({
                        id: c.id,
                        key: c.key,
                        name: c.name,
                        rarity: c.rarity,
                        imageUrl: c.imageUrl,
                    })),
            });
            await this.trimOpeningHistoryForUser(args.userId);
        }
        catch {
        }
    }
    async displayOpeningRepoSaveSafe(args) {
        try {
            await this.displayOpeningRepo.save({
                user: { id: args.userId },
                openedAt: new Date(),
                seasonNumber: args.seasonNumber,
                season: args.seasonLabel,
                boosterCount: this.DISPLAY_BOOSTERS,
                resultJson: args.result ??
                    {
                        boosters: args.boosters.map((b) => b.map((c) => c.id)),
                        hasGoldBooster: args.hasGoldBooster,
                        forcedLegendaryIndex: args.forcedLegendaryIndex,
                        goldIndex: args.hasGoldBooster ? args.goldIndex : null,
                    },
            });
            await this.trimOpeningHistoryForUser(args.userId);
        }
        catch {
        }
    }
};
exports.BoosterService = BoosterService;
exports.BoosterService = BoosterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(card_entity_1.Card)),
    __param(1, (0, typeorm_1.InjectRepository)(booster_opening_entity_1.BoosterOpening)),
    __param(2, (0, typeorm_1.InjectRepository)(display_opening_entity_1.DisplayOpening)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService,
        economy_service_1.EconomyService,
        economy_analytics_service_1.EconomyAnalyticsService,
        anti_abuse_service_1.AntiAbuseService,
        profile_service_1.ProfileService,
        typeorm_2.DataSource])
], BoosterService);
//# sourceMappingURL=booster.service.js.map