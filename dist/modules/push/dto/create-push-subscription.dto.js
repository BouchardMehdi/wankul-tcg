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
exports.CreatePushSubscriptionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class PushSubscriptionKeysDto {
    p256dh;
    auth;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PushSubscriptionKeysDto.prototype, "p256dh", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PushSubscriptionKeysDto.prototype, "auth", void 0);
class CreatePushSubscriptionDto {
    endpoint;
    expirationTime;
    keys;
}
exports.CreatePushSubscriptionDto = CreatePushSubscriptionDto;
__decorate([
    (0, class_validator_1.IsUrl)({
        protocols: ['https'],
        require_tld: false,
        require_protocol: true,
    }),
    __metadata("design:type", String)
], CreatePushSubscriptionDto.prototype, "endpoint", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], CreatePushSubscriptionDto.prototype, "expirationTime", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PushSubscriptionKeysDto),
    __metadata("design:type", PushSubscriptionKeysDto)
], CreatePushSubscriptionDto.prototype, "keys", void 0);
//# sourceMappingURL=create-push-subscription.dto.js.map