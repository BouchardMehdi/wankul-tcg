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
exports.EconomicActionLog = void 0;
const typeorm_1 = require("typeorm");
let EconomicActionLog = class EconomicActionLog {
    id;
    userId;
    relatedUserId;
    cardId;
    action;
    status;
    severity;
    targetType;
    targetId;
    valueCredits;
    reason;
    metadata;
    createdAt;
};
exports.EconomicActionLog = EconomicActionLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EconomicActionLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EconomicActionLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'related_user_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EconomicActionLog.prototype, "relatedUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'card_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EconomicActionLog.prototype, "cardId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], EconomicActionLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, default: 'allowed' }),
    __metadata("design:type", String)
], EconomicActionLog.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, default: 'info' }),
    __metadata("design:type", String)
], EconomicActionLog.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_type', type: 'varchar', length: 40, nullable: true }),
    __metadata("design:type", Object)
], EconomicActionLog.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EconomicActionLog.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'value_credits', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], EconomicActionLog.prototype, "valueCredits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], EconomicActionLog.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], EconomicActionLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], EconomicActionLog.prototype, "createdAt", void 0);
exports.EconomicActionLog = EconomicActionLog = __decorate([
    (0, typeorm_1.Entity)('economic_action_logs'),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['action', 'status']),
    (0, typeorm_1.Index)(['userId', 'action', 'createdAt']),
    (0, typeorm_1.Index)(['cardId', 'createdAt']),
    (0, typeorm_1.Index)(['relatedUserId', 'createdAt'])
], EconomicActionLog);
//# sourceMappingURL=economic-action-log.entity.js.map