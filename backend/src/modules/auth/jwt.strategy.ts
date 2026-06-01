import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    const secret = config.get<string>('JWT_SECRET');

    if (!secret || !secret.trim()) {
      // ✅ TS + runtime safe
      throw new Error('JWT_SECRET is missing or empty in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret.trim(), // ✅ string garanti
    });
  }

  async validate(payload: any) {
    const user = await this.usersRepo.findOne({ where: { id: Number(payload.sub) } });
    if (!user) {
      throw new UnauthorizedException('Session invalide');
    }

    if (user.suspendedUntil) {
      const suspendedUntil = new Date(user.suspendedUntil);
      if (!Number.isNaN(suspendedUntil.getTime()) && suspendedUntil.getTime() > Date.now()) {
        throw new ForbiddenException(
          `Compte suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`,
        );
      }
    }

    return { id: user.id, username: user.username, role: user.role };
  }
}
