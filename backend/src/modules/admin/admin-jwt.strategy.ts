import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private readonly config: ConfigService) {
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

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      scope: payload.scope,
    };
  }
}