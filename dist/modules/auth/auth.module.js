"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const users_module_1 = require("../users/users.module");
const mail_module_1 = require("../mail/mail.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const user_entity_1 = require("../users/user.entity");
const jwt_strategy_1 = require("./jwt.strategy");
const economy_module_1 = require("../economy/economy.module");
const bug_report_entity_1 = require("../report/bug-report.entity");
const bug_report_status_history_entity_1 = require("../report/bug-report-status-history.entity");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User]),
            users_module_1.UsersModule,
            mail_module_1.MailModule,
            economy_module_1.EconomyModule,
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, bug_report_entity_1.BugReport, bug_report_status_history_entity_1.BugReportStatusHistory]),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const secret = config.get('JWT_SECRET');
                    if (!secret || !secret.trim()) {
                        throw new Error('JWT_SECRET is missing or empty in .env');
                    }
                    return {
                        secret: secret.trim(),
                        signOptions: {
                            expiresIn: (config.get('JWT_EXPIRES_IN') ?? '1d'),
                        },
                    };
                },
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy],
        exports: [auth_service_1.AuthService, passport_1.PassportModule, jwt_1.JwtModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map