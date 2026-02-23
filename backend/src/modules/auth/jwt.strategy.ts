import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
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
    return { id: payload.sub, username: payload.username };
  }
}
