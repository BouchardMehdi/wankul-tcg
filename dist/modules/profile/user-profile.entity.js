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
exports.UserProfile = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let UserProfile = class UserProfile {
    userId;
    user;
    avatarUrl;
    avatarSource;
    avatarFrameId;
    avatarBackgroundId;
    featuredBadgeCode;
    bio;
    createdAt;
    updatedAt;
};
exports.UserProfile = UserProfile;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'user_id', type: 'int' }),
    __metadata("design:type", Number)
], UserProfile.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserProfile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'avatar_url',
        type: 'varchar',
        length: 500,
        default: '/avatars/default-laink.svg',
    }),
    __metadata("design:type", String)
], UserProfile.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'avatar_source',
        type: 'varchar',
        length: 40,
        default: 'default-laink',
    }),
    __metadata("design:type", String)
], UserProfile.prototype, "avatarSource", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'avatar_frame_id',
        type: 'varchar',
        length: 40,
        default: 'neon-pink',
    }),
    __metadata("design:type", String)
], UserProfile.prototype, "avatarFrameId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'avatar_background_id',
        type: 'varchar',
        length: 40,
        default: 'deep-space',
    }),
    __metadata("design:type", String)
], UserProfile.prototype, "avatarBackgroundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'featured_badge_code', type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], UserProfile.prototype, "featuredBadgeCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 140, nullable: true }),
    __metadata("design:type", Object)
], UserProfile.prototype, "bio", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], UserProfile.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], UserProfile.prototype, "updatedAt", void 0);
exports.UserProfile = UserProfile = __decorate([
    (0, typeorm_1.Entity)('user_profiles')
], UserProfile);
//# sourceMappingURL=user-profile.entity.js.map