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
exports.CardsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const card_entity_1 = require("./card.entity");
const cards_util_1 = require("./cards.util");
let CardsService = class CardsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async list(query) {
        const page = query.page ?? 1;
        const limitRaw = query.limit ?? 50;
        const limit = Math.max(1, Math.min(2000, limitRaw));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.seasonNumber !== undefined)
            where.seasonNumber = query.seasonNumber;
        if (query.rarity)
            where.rarity = query.rarity;
        if (query.type)
            where.type = query.type;
        if (query.gameplayType)
            where.gameplayType = query.gameplayType;
        if (query.specialEdition !== undefined) {
            if (query.specialEdition === 'true')
                where.specialEdition = true;
            if (query.specialEdition === 'false')
                where.specialEdition = false;
        }
        let whereOr = where;
        if (query.q && query.q.trim().length) {
            const q = `%${query.q.trim()}%`;
            whereOr = [
                { ...where, name: (0, typeorm_2.Like)(q) },
                { ...where, key: (0, typeorm_2.Like)(q) },
                { ...where, artist: (0, typeorm_2.Like)(q) },
            ];
        }
        const [items, total] = await this.repo.findAndCount({
            where: whereOr,
            order: { [query.sort ?? 'seasonNumber']: query.order ?? 'ASC', number: 'ASC' },
            skip,
            take: limit,
        });
        return {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            items,
        };
    }
    async findByIdOrFail(id) {
        const card = await this.repo.findOne({ where: { id } });
        if (!card)
            throw new common_1.NotFoundException('Card not found');
        return card;
    }
    async findByKeyOrFail(input) {
        const key = (0, cards_util_1.normalizeCardKey)(input);
        const card = await this.repo.findOne({ where: { key } });
        if (!card)
            throw new common_1.NotFoundException('Card not found');
        return card;
    }
    async getByKey(key) {
        const k = key.trim();
        const card = await this.repo.findOne({ where: { key: k } });
        if (card)
            return card;
        return this.repo
            .createQueryBuilder('c')
            .where('LOWER(c.key) = LOWER(:k)', { k })
            .getOne();
    }
    async meta() {
        const [seasons, rarities, types, gameplayTypes] = await Promise.all([
            this.repo
                .createQueryBuilder('c')
                .select('DISTINCT c.seasonNumber', 'seasonNumber')
                .where('c.seasonNumber IS NOT NULL')
                .orderBy('c.seasonNumber', 'ASC')
                .getRawMany(),
            this.repo
                .createQueryBuilder('c')
                .select('DISTINCT c.rarity', 'rarity')
                .where('c.rarity IS NOT NULL')
                .orderBy('c.rarity', 'ASC')
                .getRawMany(),
            this.repo
                .createQueryBuilder('c')
                .select('DISTINCT c.type', 'type')
                .where('c.type IS NOT NULL')
                .orderBy('c.type', 'ASC')
                .getRawMany(),
            this.repo
                .createQueryBuilder('c')
                .select('DISTINCT c.gameplayType', 'gameplayType')
                .where('c.gameplayType IS NOT NULL')
                .orderBy('c.gameplayType', 'ASC')
                .getRawMany(),
        ]);
        return {
            seasonNumbers: seasons.map((x) => Number(x.seasonNumber)).filter((n) => Number.isFinite(n)),
            rarities: rarities.map((x) => x.rarity).filter(Boolean),
            types: types.map((x) => x.type).filter(Boolean),
            gameplayTypes: gameplayTypes.map((x) => x.gameplayType).filter(Boolean),
        };
    }
};
exports.CardsService = CardsService;
exports.CardsService = CardsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(card_entity_1.Card)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CardsService);
//# sourceMappingURL=cards.service.js.map