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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const user_card_entity_1 = require("./user-card.entity");
const economy_service_1 = require("../economy/economy.service");
let UsersService = class UsersService {
    usersRepo;
    userCardsRepo;
    dataSource;
    economy;
    constructor(usersRepo, userCardsRepo, dataSource, economy) {
        this.usersRepo = usersRepo;
        this.userCardsRepo = userCardsRepo;
        this.dataSource = dataSource;
        this.economy = economy;
    }
    async findByIdOrFail(id) {
        const user = await this.usersRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async findByUsername(username) {
        return this.usersRepo.findOne({ where: { username } });
    }
    async findByEmail(email) {
        return this.usersRepo.findOne({ where: { email } });
    }
    async createUser(data) {
        const user = this.usersRepo.create(data);
        const saved = await this.usersRepo.save(user);
        await this.economy.ensure(saved.id);
        return saved;
    }
    async getOwnedMap(userId, cardIds) {
        const unique = Array.from(new Set(cardIds));
        if (!unique.length)
            return new Map();
        const rows = await this.userCardsRepo.find({
            where: {
                user: { id: userId },
                card: { id: (0, typeorm_2.In)(unique) },
            },
            relations: ['card'],
        });
        const map = new Map();
        for (const r of rows)
            map.set(r.card.id, r.quantity);
        return map;
    }
    async addCardsToUserBulk(userId, cardIds, manager) {
        if (!cardIds.length)
            return;
        const map = new Map();
        for (const id of cardIds)
            map.set(id, (map.get(id) ?? 0) + 1);
        const rows = Array.from(map.entries()).map(([cardId, qty]) => ({
            userId: userId,
            cardId: cardId,
            quantity: qty,
        }));
        const em = manager ?? this.dataSource.manager;
        const valuesSql = rows.map(() => '(?, ?, ?)').join(',');
        const params = rows.flatMap((r) => [r.userId, r.cardId, r.quantity]);
        await em.query(`
    INSERT INTO user_cards (user_id, card_id, quantity)
    VALUES ${valuesSql}
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `, params);
    }
    async addCardToUser(userId, cardId, quantity = 1) {
        const ids = [];
        for (let i = 0; i < quantity; i++)
            ids.push(cardId);
        await this.addCardsToUserBulk(userId, ids);
        return { ok: true };
    }
    async getCollection(userId) {
        const rows = await this.userCardsRepo.find({
            where: { user: { id: userId } },
            relations: ['card'],
            order: { id: 'ASC' },
        });
        return rows.map((r) => ({
            card: r.card,
            quantity: r.quantity,
        }));
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_card_entity_1.UserCard)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        economy_service_1.EconomyService])
], UsersService);
//# sourceMappingURL=users.service.js.map