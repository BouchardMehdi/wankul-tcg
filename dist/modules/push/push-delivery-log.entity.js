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
exports.PushDeliveryLogEntity = void 0;
const typeorm_1 = require("typeorm");
let PushDeliveryLogEntity = class PushDeliveryLogEntity {
    id;
    userId;
    subscriptionId;
    endpointHash;
    kind;
    tag;
    title;
    url;
    status;
    statusCode;
    errorMessage;
    createdAt;
};
exports.PushDeliveryLogEntity = PushDeliveryLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PushDeliveryLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subscription_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'endpoint_hash', type: 'char', length: 64, nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "endpointHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80 }),
    __metadata("design:type", String)
], PushDeliveryLogEntity.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 160, nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "tag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 180, nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], PushDeliveryLogEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status_code', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "statusCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], PushDeliveryLogEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PushDeliveryLogEntity.prototype, "createdAt", void 0);
exports.PushDeliveryLogEntity = PushDeliveryLogEntity = __decorate([
    (0, typeorm_1.Entity)('push_delivery_logs'),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['kind']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['userId'])
], PushDeliveryLogEntity);
//# sourceMappingURL=push-delivery-log.entity.js.map