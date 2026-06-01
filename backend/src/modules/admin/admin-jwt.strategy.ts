import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    const secret = config.get<string>('ADMIN_JWT_SECRET');

    if (!secret || !secret.trim()) {
      throw new Error('ADMIN_JWT_SECRET is missing or empty in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret.trim(),
    });
  }

  async validate(payload: any) {
    if (payload.scope !== 'admin') {
      throw new Error('Invalid admin token scope');
    }

    const user = await this.usersRepo.findOne({ where: { id: Number(payload.sub) } });
    if (!user) {
      throw new UnauthorizedException('Session admin invalide');
    }

    if (user.suspendedUntil) {
      const suspendedUntil = new Date(user.suspendedUntil);
      if (!Number.isNaN(suspendedUntil.getTime()) && suspendedUntil.getTime() > Date.now()) {
        throw new ForbiddenException(
          `Compte suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`,
        );
      }
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      scope: payload.scope,
    };
  }
}
