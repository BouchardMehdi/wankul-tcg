import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

import { typeOrmConfig } from './config/typeorm.config';

// Modules
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CardsModule } from './modules/cards/cards.module';
import { BoosterModule } from './modules/booster/booster.module';
import { EconomyModule } from './modules/economy/economy.module';
import { MailModule } from './modules/mail/mail.module';
import { StatsModule } from './modules/stats/stats.module';
import { MarketModule } from './modules/market/market.module';
import { AdminModule } from './modules/admin/admin.module';
import { PushModule } from './modules/push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRoot(typeOrmConfig()),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api', '/api/*rest'],
      serveStaticOptions: {
        maxAge: '7d',
        setHeaders: (res, path) => {
          if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(path)) {
            res.setHeader(
              'Cache-Control',
              'public, max-age=604800, stale-while-revalidate=86400',
            );
          }
        },
      },
    }),

    UsersModule,
    AuthModule,
    CardsModule,
    BoosterModule,
    EconomyModule,
    MailModule,
    StatsModule,
    MarketModule,
    AdminModule,
    PushModule,
  ],
})
export class AppModule {}
