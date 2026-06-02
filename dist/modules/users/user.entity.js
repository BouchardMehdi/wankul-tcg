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
exports.User = void 0;
const typeorm_1 = require("typeorm");
let User = class User {
    id;
    username;
    email;
    passwordHash;
    createdAt;
    emailVerified;
    emailVerificationCodeHash;
    emailVerificationExpiresAt;
    passwordResetCodeHash;
    passwordResetExpiresAt;
    role;
    adminPasswordHash;
    suspendedUntil;
    suspensionReason;
    marketBlockedUntil;
    marketBlockReason;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 40 }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "emailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "emailVerificationCodeHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "emailVerificationExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "passwordResetCodeHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "passwordResetExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, default: 'player' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "adminPasswordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'suspended_until', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "suspendedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'suspension_reason', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "suspensionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'market_blocked_until', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "marketBlockedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'market_block_reason', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "marketBlockReason", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map