"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const serve_static_1 = require("@nestjs/serve-static");
const schedule_1 = require("@nestjs/schedule");
const path_1 = require("path");
const typeorm_config_1 = require("./config/typeorm.config");
const users_module_1 = require("./modules/users/users.module");
const auth_module_1 = require("./modules/auth/auth.module");
const cards_module_1 = require("./modules/cards/cards.module");
const booster_module_1 = require("./modules/booster/booster.module");
const economy_module_1 = require("./modules/economy/economy.module");
const mail_module_1 = require("./modules/mail/mail.module");
const stats_module_1 = require("./modules/stats/stats.module");
const market_module_1 = require("./modules/market/market.module");
const admin_module_1 = require("./modules/admin/admin.module");
const push_module_1 = require("./modules/push/push.module");
const profile_module_1 = require("./modules/profile/profile.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            typeorm_1.TypeOrmModule.forRoot((0, typeorm_config_1.typeOrmConfig)()),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'public'),
                serveRoot: '/',
                exclude: ['/api', '/api/*rest'],
                serveStaticOptions: {
                    maxAge: '7d',
                    setHeaders: (res, path) => {
                        if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(path)) {
                            res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
                        }
                    },
                },
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            cards_module_1.CardsModule,
            booster_module_1.BoosterModule,
            economy_module_1.EconomyModule,
            mail_module_1.MailModule,
            stats_module_1.StatsModule,
            market_module_1.MarketModule,
            admin_module_1.AdminModule,
            push_module_1.PushModule,
            profile_module_1.ProfileModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map