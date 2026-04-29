import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { User } from '../users/user.entity';
import { BugReport } from '../report/bug-report.entity';
import { BugReportStatusHistory } from '../report/bug-report-status-history.entity';
import { EconomyAnalyticsModule } from '../economy/economy-analytics.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, BugReport, BugReportStatusHistory]),
    EconomyAnalyticsModule,
    SecurityModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('ADMIN_JWT_SECRET');
        if (!secret || !secret.trim()) {
          throw new Error('ADMIN_JWT_SECRET is missing or empty in .env');
        }

        return {
          secret: secret.trim(),
          signOptions: {
            expiresIn: (config.get<string>('ADMIN_JWT_EXPIRES_IN') ??
              '15m') as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy],
})
export class AdminModule {}
