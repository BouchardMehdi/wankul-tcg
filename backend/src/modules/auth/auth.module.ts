import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { JwtStrategy } from './jwt.strategy';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    UsersModule,
    MailModule,
    EconomyModule,

    // ✅ enregistre passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // ✅ JwtService correctement configuré (registerAsync)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret || !secret.trim()) {
          throw new Error('JWT_SECRET is missing or empty in .env');
        }

        return {
          secret: secret.trim(),
          signOptions: {
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '1d') as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // ✅ IMPORTANT: stratégie enregistrée ici
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
