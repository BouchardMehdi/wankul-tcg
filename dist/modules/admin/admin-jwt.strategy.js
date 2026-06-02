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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let AdminJwtStrategy = class AdminJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'admin-jwt') {
    config;
    usersRepo;
    constructor(config, usersRepo) {
        const secret = config.get('ADMIN_JWT_SECRET');
        if (!secret || !secret.trim()) {
            throw new Error('ADMIN_JWT_SECRET is missing or empty in environment variables');
        }
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret.trim(),
        });
        this.config = config;
        this.usersRepo = usersRepo;
    }
    async validate(payload) {
        if (payload.scope !== 'admin') {
            throw new Error('Invalid admin token scope');
        }
        const user = await this.usersRepo.findOne({ where: { id: Number(payload.sub) } });
        if (!user) {
            throw new common_1.UnauthorizedException('Session admin invalide');
        }
        if (user.suspendedUntil) {
            const suspendedUntil = new Date(user.suspendedUntil);
            if (!Number.isNaN(suspendedUntil.getTime()) && suspendedUntil.getTime() > Date.now()) {
                throw new common_1.ForbiddenException(`Compte suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`);
            }
        }
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            scope: payload.scope,
        };
    }
};
exports.AdminJwtStrategy = AdminJwtStrategy;
exports.AdminJwtStrategy = AdminJwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], AdminJwtStrategy);
//# sourceMappingURL=admin-jwt.strategy.js.map