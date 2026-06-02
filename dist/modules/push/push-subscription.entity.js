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
exports.PushSubscriptionEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let PushSubscriptionEntity = class PushSubscriptionEntity {
    id;
    user;
    endpoint;
    endpointHash;
    p256dhKey;
    authKey;
    expirationTime;
    userAgent;
    lastSuccessfulPushAt;
    lastFailureAt;
    createdAt;
    updatedAt;
};
exports.PushSubscriptionEntity = PushSubscriptionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PushSubscriptionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], PushSubscriptionEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1000 }),
    __metadata("design:type", String)
], PushSubscriptionEntity.prototype, "endpoint", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'endpoint_hash', type: 'char', length: 64 }),
    __metadata("design:type", String)
], PushSubscriptionEntity.prototype, "endpointHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'p256dh_key', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PushSubscriptionEntity.prototype, "p256dhKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auth_key', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PushSubscriptionEntity.prototype, "authKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiration_time', type: 'varchar', length: 32, nullable: true }),
    __metadata("design:type", Object)
], PushSubscriptionEntity.prototype, "expirationTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_agent', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], PushSubscriptionEntity.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_successful_push_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PushSubscriptionEntity.prototype, "lastSuccessfulPushAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_failure_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PushSubscriptionEntity.prototype, "lastFailureAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PushSubscriptionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PushSubscriptionEntity.prototype, "updatedAt", void 0);
exports.PushSubscriptionEntity = PushSubscriptionEntity = __decorate([
    (0, typeorm_1.Entity)('push_subscriptions'),
    (0, typeorm_1.Index)(['endpointHash'], { unique: true })
], PushSubscriptionEntity);
//# sourceMappingURL=push-subscription.entity.js.map