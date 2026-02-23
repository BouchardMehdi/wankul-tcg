import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import { EconomyService } from '../economy/economy.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const SIGNUP_BONUS = 1500;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly economy: EconomyService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    const existingUsername = await this.usersRepo.findOne({ where: { username } });
    if (existingUsername) throw new BadRequestException('Username already used');

    const existingEmail = await this.usersRepo.findOne({ where: { email } });
    if (existingEmail) throw new BadRequestException('Email already used');

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generate6DigitCode();
    const emailVerificationCodeHash = await bcrypt.hash(code, 10);

    const user = this.usersRepo.create({
      username,
      email,
      passwordHash,
      emailVerificationCodeHash,
      emailVerified: false, // ✅ IMPORTANT (chez toi c’est ce champ)
    } as any);

    await this.usersRepo.save(user);

    await this.mail.sendVerificationCode(email, username, code);

    return { message: 'Account created. Verification code sent by email.' };
  }

  // =========================
  // RESEND CODE
  // =========================
  async resendVerificationCode(username: string) {
    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    if ((user as any).emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const code = generate6DigitCode();
    user.emailVerificationCodeHash = await bcrypt.hash(code, 10);
    await this.usersRepo.save(user);

    await this.mail.sendVerificationCode(user.email, user.username, code);

    return { message: 'Verification code resent.' };
  }

  // =========================
  // VERIFY EMAIL
  // =========================
  async verifyEmail(dto: VerifyEmailDto) {
    const username = dto.username.trim();
    const code = dto.code.trim();

    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    if ((user as any).emailVerified) {
      return { message: 'Email already verified.' };
    }

    if (!user.emailVerificationCodeHash) {
      throw new BadRequestException('No verification code found. Please resend.');
    }

    const isValid = await bcrypt.compare(code, user.emailVerificationCodeHash);
    if (!isValid) throw new BadRequestException('Invalid verification code');

    // ✅ LA VRAIE CORRECTION : on met emailVerified = 1
    (user as any).emailVerified = true;
    user.emailVerificationCodeHash = null;

    await this.usersRepo.save(user);

    // 🎁 BONUS DE DÉPART : 1500 après vérif, idempotent si tu as grantSignupBonusIfNeeded
    if (typeof (this.economy as any).grantSignupBonusIfNeeded === 'function') {
      const bonus = await (this.economy as any).grantSignupBonusIfNeeded(user.id);
      return {
        message: 'Email verified. Welcome credits granted.',
        signupBonusGranted: bonus.granted,
        bonusAmount: bonus.amount,
        currentCredits: bonus.credits,
      };
    }

    // fallback simple à 1500 si pas la méthode idempotente (moins idéal)
    if (typeof (this.economy as any).addCredits === 'function') {
      await (this.economy as any).addCredits(user.id, SIGNUP_BONUS, { reason: 'signup_verified' });
    }

    return {
      message: 'Email verified. Welcome credits granted.',
      bonusAmount: SIGNUP_BONUS,
    };
  }

  // =========================
  // LOGIN (username + password)
  // =========================
  async login(dto: LoginDto) {
    const username = dto.username.trim();
    const password = dto.password;

    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new ForbiddenException('Invalid credentials');

    if (!(user as any).emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new ForbiddenException('Invalid credentials');

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET missing');

    const payload = { sub: user.id, username: user.username };
    const access_token = await this.jwt.signAsync(payload);

    return { access_token };
  }
}
