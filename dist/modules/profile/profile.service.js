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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const typeorm_2 = require("typeorm");
const booster_opening_entity_1 = require("../booster/booster-opening.entity");
const display_opening_entity_1 = require("../booster/display-opening.entity");
const card_entity_1 = require("../cards/card.entity");
const economy_service_1 = require("../economy/economy.service");
const market_transaction_entity_1 = require("../market/market-transaction.entity");
const user_card_entity_1 = require("../users/user-card.entity");
const user_entity_1 = require("../users/user.entity");
const user_badge_entity_1 = require("./user-badge.entity");
const user_profile_entity_1 = require("./user-profile.entity");
const DEFAULT_AVATARS = [
    {
        id: 'default-laink',
        label: 'Laink focus',
        url: '/avatars/wankul_laink.png',
    },
    {
        id: 'default-terra',
        label: 'Terracid chaos',
        url: '/avatars/wankul_terra.png',
    },
];
const AVATAR_FRAMES = [
    { id: 'neon-pink', label: 'Neon rose', cssValue: 'linear-gradient(135deg, #ff4d6d, #9b5cff)' },
    { id: 'cyan-rift', label: 'Faille cyan', cssValue: 'linear-gradient(135deg, #4cc9f0, #65e6a2)' },
    { id: 'gold-hit', label: 'Hit dore', cssValue: 'linear-gradient(135deg, #f6c945, #ff9f1c)' },
    { id: 'bronze-legend', label: 'Bronze légendaire', cssValue: 'linear-gradient(135deg, #b87333, #f0a66b)' },
    { id: 'silver-legend', label: 'Argent légendaire', cssValue: 'linear-gradient(135deg, #cbd5e1, #94a3b8)' },
    { id: 'terra-red', label: 'Rouge chaos', cssValue: 'linear-gradient(135deg, #ef4444, #f97316)' },
    { id: 'campus-green', label: 'Vert campus', cssValue: 'linear-gradient(135deg, #22c55e, #84cc16)' },
    { id: 'stellar-violet', label: 'Violet stellar', cssValue: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
    { id: 'night-blue', label: 'Bleu nuit', cssValue: 'linear-gradient(135deg, #2563eb, #0f172a)' },
    { id: 'rainbow-prism', label: 'Prisme', cssValue: 'conic-gradient(from 180deg, #ff4d6d, #f6c945, #65e6a2, #4cc9f0, #9b5cff, #ff4d6d)' },
];
const AVATAR_BACKGROUNDS = [
    { id: 'deep-space', label: 'Deep space', cssValue: 'radial-gradient(circle at 30% 20%, #4cc9f0 0%, transparent 34%), linear-gradient(135deg, #080b16, #18213a)' },
    { id: 'booster-glow', label: 'Booster glow', cssValue: 'radial-gradient(circle at 70% 20%, #f6c945 0%, transparent 30%), linear-gradient(135deg, #1a1028, #3b145f)' },
    { id: 'market-green', label: 'Market green', cssValue: 'radial-gradient(circle at 28% 18%, #65e6a2 0%, transparent 32%), linear-gradient(135deg, #062018, #123c2b)' },
    { id: 'battle-red', label: 'Battle red', cssValue: 'radial-gradient(circle at 72% 28%, #ff8a70 0%, transparent 32%), linear-gradient(135deg, #2b0c14, #5f1729)' },
    { id: 'campus-day', label: 'Campus day', cssValue: 'radial-gradient(circle at 22% 22%, #a7f3d0 0%, transparent 34%), linear-gradient(135deg, #0f5132, #94d82d)' },
    { id: 'origins-blue', label: 'Origins blue', cssValue: 'radial-gradient(circle at 72% 22%, #93c5fd 0%, transparent 34%), linear-gradient(135deg, #102a56, #1e40af)' },
    { id: 'stellar-night', label: 'Stellar night', cssValue: 'radial-gradient(circle at 50% 20%, #ec4899 0%, transparent 28%), linear-gradient(135deg, #160b2e, #312e81)' },
    { id: 'gold-ticket', label: 'Ticket gold', cssValue: 'radial-gradient(circle at 30% 18%, #fff0a6 0%, transparent 34%), linear-gradient(135deg, #422006, #b7791f)' },
    { id: 'mono-clean', label: 'Clean noir', cssValue: 'radial-gradient(circle at 50% 20%, #ffffff 0%, transparent 28%), linear-gradient(135deg, #0f172a, #475569)' },
    { id: 'candy-pop', label: 'Candy pop', cssValue: 'radial-gradient(circle at 30% 24%, #fb7185 0%, transparent 32%), linear-gradient(135deg, #7c3aed, #06b6d4)' },
];
function clampProgress(current, target, label) {
    const safeTarget = Math.max(1, target);
    const safeCurrent = Math.max(0, Number.isFinite(current) ? current : 0);
    return {
        current: Math.min(safeCurrent, safeTarget),
        target: safeTarget,
        unlocked: safeCurrent >= safeTarget,
        label,
    };
}
function normalizeText(value) {
    return (value ?? '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['`-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function seasonKey(card) {
    const raw = normalizeText(card.extension || card.season);
    if (raw.includes('origin'))
        return 'Origins';
    if (raw.includes('campus'))
        return 'Campus';
    if (raw.includes('battle'))
        return 'Battle';
    if (raw.includes('stellar'))
        return 'Stellar';
    if (raw.includes('legacy'))
        return 'Legacy';
    return null;
}
function isBigHit(card) {
    const haystack = normalizeText(`${card.name} ${card.rarity} ${card.key} ${card.type ?? ''}`);
    return (haystack.includes('u1') ||
        haystack.includes('u2') ||
        haystack.includes('duo') ||
        haystack.includes('legendaire') ||
        haystack.includes('booster gold') ||
        haystack.includes('ticket d or'));
}
const BADGE_DEFINITIONS = [
    {
        code: 'FIRST_BOOSTER',
        title: 'Premier booster',
        description: 'Ouvre ton premier booster.',
        category: 'Opening',
        tier: 'bronze',
        reward: { credits: 150 },
        progress: (ctx) => clampProgress(ctx.boostersOpened, 1),
    },
    {
        code: 'BOOSTER_10',
        title: 'Main chaude',
        description: 'Ouvre 10 boosters.',
        category: 'Opening',
        tier: 'silver',
        reward: { freeBoosters: 1 },
        progress: (ctx) => clampProgress(ctx.boostersOpened, 10),
    },
    {
        code: 'BOOSTER_50',
        title: 'Rituel du paquet',
        description: 'Ouvre 50 boosters.',
        category: 'Opening',
        tier: 'gold',
        reward: { credits: 1000, freeBoosters: 2 },
        progress: (ctx) => clampProgress(ctx.boostersOpened, 50),
    },
    {
        code: 'FIRST_DISPLAY',
        title: 'Display posé sur la table',
        description: 'Ouvre ta première display.',
        category: 'Opening',
        tier: 'silver',
        reward: { credits: 350 },
        progress: (ctx) => clampProgress(ctx.displaysOpened, 1),
    },
    {
        code: 'DISPLAY_5',
        title: 'Carton plein',
        description: 'Ouvre 5 displays.',
        category: 'Opening',
        tier: 'gold',
        reward: { credits: 1000, freeBoosters: 2 },
        progress: (ctx) => clampProgress(ctx.displaysOpened, 5),
    },
    {
        code: 'COLLECTION_25',
        title: 'Quart de classeur',
        description: 'Debloque 25% des cartes.',
        category: 'Collection',
        tier: 'bronze',
        reward: { credits: 600 },
        progress: (ctx) => clampProgress((ctx.uniqueCards / Math.max(1, ctx.totalCards)) * 100, 25, '%'),
    },
    {
        code: 'COLLECTION_50',
        title: 'Demi collection',
        description: 'Debloque 50% des cartes.',
        category: 'Collection',
        tier: 'silver',
        reward: { credits: 1200, freeBoosters: 1 },
        progress: (ctx) => clampProgress((ctx.uniqueCards / Math.max(1, ctx.totalCards)) * 100, 50, '%'),
    },
    {
        code: 'COLLECTION_75',
        title: 'Classeur qui brille',
        description: 'Debloque 75% des cartes.',
        category: 'Collection',
        tier: 'gold',
        reward: { credits: 2000, freeBoosters: 2 },
        progress: (ctx) => clampProgress((ctx.uniqueCards / Math.max(1, ctx.totalCards)) * 100, 75, '%'),
    },
    {
        code: 'SEASON_HALF',
        title: 'Saison accrochee',
        description: 'Atteins 50% sur une saison.',
        category: 'Collection',
        tier: 'silver',
        reward: { credits: 700, freeBoosters: 1 },
        progress: (ctx) => clampProgress((ctx.bestSeasonOwned / Math.max(1, ctx.bestSeasonTotal)) * 100, 50, '%'),
    },
    {
        code: 'SEASON_COMPLETE',
        title: 'Set boucle',
        description: 'Complete une saison entiere.',
        category: 'Collection',
        tier: 'rainbow',
        reward: { credits: 3000, freeBoosters: 3 },
        progress: (ctx) => clampProgress(ctx.completedSeasonCount, 1),
    },
    {
        code: 'FIRST_BIG_HIT',
        title: 'Gros hit',
        description: 'Possède une U1, U2, Duo, légendaire, ticket ou Booster Gold.',
        category: 'Rareté',
        tier: 'gold',
        reward: { credits: 900 },
        progress: (ctx) => clampProgress(ctx.bigHitCount, 1),
    },
    {
        code: 'DUPLICATE_100',
        title: 'Pile de doubles',
        description: 'Cumule 100 doublons dans ta collection.',
        category: 'Collection',
        tier: 'silver',
        reward: { credits: 700 },
        progress: (ctx) => clampProgress(ctx.duplicateCards, 100),
    },
    {
        code: 'FIRST_SALE',
        title: 'Première vente',
        description: 'Réalise ta première vente sur le market.',
        category: 'Market',
        tier: 'bronze',
        reward: { credits: 300 },
        progress: (ctx) => clampProgress(ctx.marketSales, 1),
    },
    {
        code: 'MARKET_25_SALES',
        title: 'Vendeur installé',
        description: 'Réalise 25 ventes sur le market.',
        category: 'Market',
        tier: 'gold',
        reward: { credits: 1500, freeBoosters: 1 },
        progress: (ctx) => clampProgress(ctx.marketSales, 25),
    },
    {
        code: 'CUSTOM_AVATAR',
        title: 'Profil signature',
        description: 'Importe ta propre photo de profil.',
        category: 'Profil',
        tier: 'bronze',
        reward: { credits: 100 },
        progress: (ctx) => clampProgress(ctx.avatarSource === 'custom' ? 1 : 0, 1),
    },
];
let ProfileService = class ProfileService {
    userRepo;
    profileRepo;
    badgeRepo;
    userCardRepo;
    cardRepo;
    boosterOpeningRepo;
    displayOpeningRepo;
    marketTransactionRepo;
    economy;
    constructor(userRepo, profileRepo, badgeRepo, userCardRepo, cardRepo, boosterOpeningRepo, displayOpeningRepo, marketTransactionRepo, economy) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.badgeRepo = badgeRepo;
        this.userCardRepo = userCardRepo;
        this.cardRepo = cardRepo;
        this.boosterOpeningRepo = boosterOpeningRepo;
        this.displayOpeningRepo = displayOpeningRepo;
        this.marketTransactionRepo = marketTransactionRepo;
        this.economy = economy;
    }
    getDefaultAvatars() {
        return DEFAULT_AVATARS;
    }
    getAvatarFrames() {
        return AVATAR_FRAMES;
    }
    getAvatarBackgrounds() {
        return AVATAR_BACKGROUNDS;
    }
    async getProfile(userId) {
        const newlyUnlocked = await this.evaluateAndGrantBadges(userId);
        const [user, profile, badges, context] = await Promise.all([
            this.findUser(userId),
            this.ensureProfile(userId),
            this.badgeRepo.find({ where: { userId }, order: { unlockedAt: 'DESC' } }),
            this.buildBadgeContext(userId),
        ]);
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
            },
            profile: this.mapProfile(profile),
            defaultAvatars: DEFAULT_AVATARS,
            avatarFrames: AVATAR_FRAMES,
            avatarBackgrounds: AVATAR_BACKGROUNDS,
            summary: this.buildSummary(context, badges.length),
            badges: this.mapBadges(badges, context),
            newlyUnlocked,
        };
    }
    async updateProfile(userId, dto) {
        const profile = await this.ensureProfile(userId);
        if (dto.bio !== undefined) {
            profile.bio = dto.bio.trim() || null;
        }
        if (dto.avatarFrameId !== undefined) {
            const frameId = dto.avatarFrameId.trim();
            if (!AVATAR_FRAMES.some((frame) => frame.id === frameId)) {
                throw new common_1.BadRequestException('Cadre avatar invalide.');
            }
            profile.avatarFrameId = frameId;
        }
        if (dto.avatarBackgroundId !== undefined) {
            const backgroundId = dto.avatarBackgroundId.trim();
            if (!AVATAR_BACKGROUNDS.some((background) => background.id === backgroundId)) {
                throw new common_1.BadRequestException('Fond avatar invalide.');
            }
            profile.avatarBackgroundId = backgroundId;
        }
        if (dto.featuredBadgeCode !== undefined) {
            const code = dto.featuredBadgeCode.trim();
            if (!code) {
                profile.featuredBadgeCode = null;
            }
            else {
                const unlocked = await this.badgeRepo.findOne({
                    where: { userId, badgeCode: code },
                });
                if (!unlocked) {
                    throw new common_1.BadRequestException('Badge non débloqué.');
                }
                profile.featuredBadgeCode = code;
            }
        }
        await this.profileRepo.save(profile);
        return this.getProfile(userId);
    }
    async updateAvatar(userId, dto) {
        const profile = await this.ensureProfile(userId);
        if (dto.mode === 'default') {
            const defaultAvatar = DEFAULT_AVATARS.find((avatar) => avatar.id === dto.defaultAvatarId);
            if (!defaultAvatar) {
                throw new common_1.BadRequestException('Avatar par défaut invalide.');
            }
            profile.avatarUrl = defaultAvatar.url;
            profile.avatarSource = defaultAvatar.id;
            await this.profileRepo.save(profile);
            return this.getProfile(userId);
        }
        const imageDataUrl = dto.imageDataUrl ?? '';
        const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
        if (!match) {
            throw new common_1.BadRequestException('Image invalide. Formats acceptes: PNG, JPG, WEBP.');
        }
        const mime = match[1];
        const base64 = match[2];
        const buffer = Buffer.from(base64, 'base64');
        if (buffer.length > 2 * 1024 * 1024) {
            throw new common_1.BadRequestException('Image trop lourde. Maximum 2 Mo.');
        }
        const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
        const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads', 'avatars');
        await (0, promises_1.mkdir)(uploadsDir, { recursive: true });
        const filename = `user-${userId}-${Date.now()}.${extension}`;
        await (0, promises_1.writeFile)((0, path_1.join)(uploadsDir, filename), buffer);
        profile.avatarUrl = `/uploads/avatars/${filename}`;
        profile.avatarSource = 'custom';
        await this.profileRepo.save(profile);
        return this.getProfile(userId);
    }
    async evaluateAndGrantBadges(userId) {
        await this.ensureProfile(userId);
        const [context, existingBadges] = await Promise.all([
            this.buildBadgeContext(userId),
            this.badgeRepo.find({ where: { userId } }),
        ]);
        const existingCodes = new Set(existingBadges.map((badge) => badge.badgeCode));
        const newlyUnlocked = [];
        for (const definition of BADGE_DEFINITIONS) {
            if (existingCodes.has(definition.code))
                continue;
            const progress = definition.progress(context);
            if (!progress.unlocked)
                continue;
            try {
                const saved = await this.badgeRepo.save(this.badgeRepo.create({
                    userId,
                    user: { id: userId },
                    badgeCode: definition.code,
                    rewardCredits: definition.reward.credits ?? 0,
                    rewardFreeBoosters: definition.reward.freeBoosters ?? 0,
                    metadata: {
                        current: progress.current,
                        target: progress.target,
                        category: definition.category,
                    },
                }));
                await this.grantReward(userId, definition.reward, definition.code);
                existingCodes.add(definition.code);
                newlyUnlocked.push(this.mapBadge(definition, saved, progress));
            }
            catch {
            }
        }
        return newlyUnlocked;
    }
    async findUser(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Utilisateur introuvable.');
        return user;
    }
    async ensureProfile(userId) {
        await this.findUser(userId);
        let profile = await this.profileRepo.findOne({ where: { userId } });
        if (profile)
            return profile;
        profile = this.profileRepo.create({
            userId,
            user: { id: userId },
            avatarUrl: DEFAULT_AVATARS[0].url,
            avatarSource: DEFAULT_AVATARS[0].id,
            avatarFrameId: AVATAR_FRAMES[0].id,
            avatarBackgroundId: AVATAR_BACKGROUNDS[0].id,
            featuredBadgeCode: null,
            bio: null,
        });
        return this.profileRepo.save(profile);
    }
    async buildBadgeContext(userId) {
        const [profile, boostersOpened, displaysOpened, userCards, allCards, marketSales] = await Promise.all([
            this.ensureProfile(userId),
            this.boosterOpeningRepo.count({ where: { user: { id: userId } } }),
            this.displayOpeningRepo.count({ where: { user: { id: userId } } }),
            this.userCardRepo.find({
                where: { user: { id: userId } },
                relations: ['card'],
            }),
            this.cardRepo.find(),
            this.marketTransactionRepo.count({
                where: { seller: { id: userId } },
            }),
        ]);
        const seasonTotals = new Map();
        const seasonOwned = new Map();
        for (const card of allCards) {
            const key = seasonKey(card);
            if (!key)
                continue;
            seasonTotals.set(key, (seasonTotals.get(key) ?? 0) + 1);
        }
        let ownedCardsTotal = 0;
        let duplicateCards = 0;
        let bigHitCount = 0;
        for (const row of userCards) {
            ownedCardsTotal += row.quantity;
            duplicateCards += Math.max(0, row.quantity - 1);
            if (row.card && isBigHit(row.card))
                bigHitCount += 1;
            const key = row.card ? seasonKey(row.card) : null;
            if (!key)
                continue;
            seasonOwned.set(key, (seasonOwned.get(key) ?? 0) + 1);
        }
        let bestSeasonOwned = 0;
        let bestSeasonTotal = 0;
        let completedSeasonCount = 0;
        for (const [key, total] of seasonTotals.entries()) {
            const owned = seasonOwned.get(key) ?? 0;
            const currentPercent = total > 0 ? owned / total : 0;
            const bestPercent = bestSeasonTotal > 0 ? bestSeasonOwned / bestSeasonTotal : 0;
            if (currentPercent > bestPercent) {
                bestSeasonOwned = owned;
                bestSeasonTotal = total;
            }
            if (total > 0 && owned >= total)
                completedSeasonCount += 1;
        }
        return {
            boostersOpened,
            displaysOpened,
            uniqueCards: userCards.length,
            totalCards: allCards.length,
            ownedCardsTotal,
            duplicateCards,
            bigHitCount,
            marketSales,
            bestSeasonOwned,
            bestSeasonTotal,
            completedSeasonCount,
            avatarSource: profile.avatarSource,
        };
    }
    async grantReward(userId, reward, badgeCode) {
        if (reward.credits) {
            await this.economy.addCredits(userId, reward.credits, {
                source: 'BADGE_REWARD',
                reason: 'badge_reward',
                targetType: 'badge',
                metadata: {
                    badgeCode,
                    rewardType: 'credits',
                },
            });
        }
        if (reward.freeBoosters) {
            await this.economy.addFreeBoosters(userId, reward.freeBoosters, {
                source: 'BADGE_REWARD',
                reason: 'badge_reward',
                targetType: 'badge',
                metadata: {
                    badgeCode,
                    rewardType: 'free_boosters',
                },
            });
        }
    }
    buildSummary(context, unlockedCount) {
        return {
            unlockedBadges: unlockedCount,
            totalBadges: BADGE_DEFINITIONS.length,
            collectionPercent: Math.round((context.uniqueCards / Math.max(1, context.totalCards)) * 100),
            uniqueCards: context.uniqueCards,
            totalCards: context.totalCards,
            boostersOpened: context.boostersOpened,
            displaysOpened: context.displaysOpened,
        };
    }
    mapProfile(profile) {
        return {
            avatarUrl: profile.avatarUrl,
            avatarSource: profile.avatarSource,
            avatarFrameId: profile.avatarFrameId ?? AVATAR_FRAMES[0].id,
            avatarBackgroundId: profile.avatarBackgroundId ?? AVATAR_BACKGROUNDS[0].id,
            featuredBadgeCode: profile.featuredBadgeCode,
            bio: profile.bio,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }
    mapBadges(unlockedBadges, context) {
        const byCode = new Map(unlockedBadges.map((badge) => [badge.badgeCode, badge]));
        return BADGE_DEFINITIONS.map((definition) => {
            const progress = definition.progress(context);
            return this.mapBadge(definition, byCode.get(definition.code) ?? null, progress);
        });
    }
    mapBadge(definition, unlockedBadge, progress) {
        return {
            code: definition.code,
            title: definition.title,
            description: definition.description,
            category: definition.category,
            tier: definition.tier,
            reward: {
                credits: definition.reward.credits ?? 0,
                freeBoosters: definition.reward.freeBoosters ?? 0,
            },
            progress,
            unlocked: Boolean(unlockedBadge),
            unlockedAt: unlockedBadge?.unlockedAt ?? null,
        };
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_profile_entity_1.UserProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(user_badge_entity_1.UserBadge)),
    __param(3, (0, typeorm_1.InjectRepository)(user_card_entity_1.UserCard)),
    __param(4, (0, typeorm_1.InjectRepository)(card_entity_1.Card)),
    __param(5, (0, typeorm_1.InjectRepository)(booster_opening_entity_1.BoosterOpening)),
    __param(6, (0, typeorm_1.InjectRepository)(display_opening_entity_1.DisplayOpening)),
    __param(7, (0, typeorm_1.InjectRepository)(market_transaction_entity_1.MarketTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        economy_service_1.EconomyService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map