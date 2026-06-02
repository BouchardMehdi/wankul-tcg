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
exports.UserEconomy = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let UserEconomy = class UserEconomy {
    userId;
    user;
    credits;
    signupBonusGranted;
    freeBoosterCharges;
    freeDisplayCharges;
    boosterRechargeAt;
    displayRechargeAt;
    lastFreeOpeningsPushAt;
    lastFreeBoosterSoonPushForAt;
    lastFreeDisplaySoonPushForAt;
};
exports.UserEconomy = UserEconomy;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'user_id', type: 'int' }),
    __metadata("design:type", Number)
], UserEconomy.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserEconomy.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserEconomy.prototype, "credits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signup_bonus_granted', type: 'tinyint', default: 0 }),
    __metadata("design:type", Number)
], UserEconomy.prototype, "signupBonusGranted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'free_booster_charges', type: 'tinyint', default: 4 }),
    __metadata("design:type", Number)
], UserEconomy.prototype, "freeBoosterCharges", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'free_display_charges', type: 'tinyint', default: 1 }),
    __metadata("design:type", Number)
], UserEconomy.prototype, "freeDisplayCharges", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booster_recharge_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], UserEconomy.prototype, "boosterRechargeAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_recharge_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], UserEconomy.prototype, "displayRechargeAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_free_openings_push_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], UserEconomy.prototype, "lastFreeOpeningsPushAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_free_booster_soon_push_for_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], UserEconomy.prototype, "lastFreeBoosterSoonPushForAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_free_display_soon_push_for_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], UserEconomy.prototype, "lastFreeDisplaySoonPushForAt", void 0);
exports.UserEconomy = UserEconomy = __decorate([
    (0, typeorm_1.Entity)('user_economy')
], UserEconomy);
//# sourceMappingURL=user-economy.entity.js.map