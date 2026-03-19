import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot(typeOrmConfig()),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api', '/api/*rest'],
    }),

    UsersModule,
    AuthModule,
    CardsModule,
    BoosterModule,
    EconomyModule,
    MailModule,
    StatsModule,
    MarketModule,
  ],
})
export class AppModule {}