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
exports.UserCard = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const card_entity_1 = require("../cards/card.entity");
let UserCard = class UserCard {
    id;
    user;
    card;
    quantity;
    quantityLocked;
};
exports.UserCard = UserCard;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], UserCard.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserCard.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => card_entity_1.Card, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'card_id' }),
    __metadata("design:type", card_entity_1.Card)
], UserCard.prototype, "card", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserCard.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_locked', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserCard.prototype, "quantityLocked", void 0);
exports.UserCard = UserCard = __decorate([
    (0, typeorm_1.Entity)('user_cards'),
    (0, typeorm_1.Index)(['user', 'card'], { unique: true })
], UserCard);
//# sourceMappingURL=user-card.entity.js.map