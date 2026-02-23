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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot(typeOrmConfig()),

    // ✅ Sert backend/public/*
    // backend/public/cards/xxx.webp -> http://localhost:3000/cards/xxx.webp
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*'], // OK même si tu n'as pas /api
    }),

    UsersModule,
    AuthModule,
    CardsModule,
    BoosterModule,
    EconomyModule,
    MailModule,
    StatsModule,
  ],
})
export class AppModule {}