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
exports.DisplayOpening = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let DisplayOpening = class DisplayOpening {
    id;
    user;
    openedAt;
    seasonNumber;
    season;
    boosterCount;
    resultJson;
};
exports.DisplayOpening = DisplayOpening;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], DisplayOpening.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], DisplayOpening.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DisplayOpening.prototype, "openedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DisplayOpening.prototype, "seasonNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], DisplayOpening.prototype, "season", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 24 }),
    __metadata("design:type", Number)
], DisplayOpening.prototype, "boosterCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], DisplayOpening.prototype, "resultJson", void 0);
exports.DisplayOpening = DisplayOpening = __decorate([
    (0, typeorm_1.Entity)('display_openings')
], DisplayOpening);
//# sourceMappingURL=display-opening.entity.js.map