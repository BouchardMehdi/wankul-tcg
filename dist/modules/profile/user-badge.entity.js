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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserBadge = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let UserBadge = class UserBadge {
    id;
    userId;
    user;
    badgeCode;
    rewardCredits;
    rewardFreeBoosters;
    metadata;
    unlockedAt;
};
exports.UserBadge = UserBadge;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], UserBadge.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'int' }),
    __metadata("design:type", Number)
], UserBadge.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserBadge.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'badge_code', type: 'varchar', length: 80 }),
    __metadata("design:type", String)
], UserBadge.prototype, "badgeCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reward_credits', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserBadge.prototype, "rewardCredits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reward_free_boosters', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserBadge.prototype, "rewardFreeBoosters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], UserBadge.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'unlocked_at' }),
    __metadata("design:type", Date)
], UserBadge.prototype, "unlockedAt", void 0);
exports.UserBadge = UserBadge = __decorate([
    (0, typeorm_1.Entity)('user_badges'),
    (0, typeorm_1.Index)(['userId', 'badgeCode'], { unique: true })
], UserBadge);
//# sourceMappingURL=user-badge.entity.js.map