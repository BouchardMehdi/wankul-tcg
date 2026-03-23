import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import { EconomyService } from '../economy/economy.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

const SIGNUP_BONUS = 1500;
const CODE_EXPIRATION_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly economy: EconomyService,
  ) {}

  private async findUserByUsernameOrEmail(identifier: string) {
    const normalized = identifier.trim();
    const lower = normalized.toLowerCase();

    return this.usersRepo.findOne({
      where: [{ username: normalized }, { email: lower }],
    });
  }

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
    const emailVerificationExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    const user = this.usersRepo.create({
      username,
      email,
      passwordHash,
      emailVerificationCodeHash,
      emailVerificationExpiresAt,
      emailVerified: false,
    });

    await this.usersRepo.save(user);

    await this.mail.sendVerificationCode(email, username, code);

    return { message: 'Account created. Verification code sent by email.' };
  }

  async resendVerificationCode(username: string) {
    const normalizedUsername = username.trim();
    const user = await this.usersRepo.findOne({ where: { username: normalizedUsername } });
    if (!user) throw new NotFoundException('User not found');

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const code = generate6DigitCode();
    user.emailVerificationCodeHash = await bcrypt.hash(code, 10);
    user.emailVerificationExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    await this.usersRepo.save(user);

    await this.mail.sendVerificationCode(user.email, user.username, code);

    return { message: 'Verification code resent.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const username = dto.username.trim();
    const code = dto.code.trim();

    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    if (user.emailVerified) {
      return { message: 'Email already verified.' };
    }

    if (!user.emailVerificationCodeHash) {
      throw new BadRequestException('No verification code found. Please resend.');
    }

    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Verification code expired. Please resend.');
    }

    const isValid = await bcrypt.compare(code, user.emailVerificationCodeHash);
    if (!isValid) throw new BadRequestException('Invalid verification code');

    user.emailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;

    await this.usersRepo.save(user);

    if (typeof (this.economy as any).grantSignupBonusIfNeeded === 'function') {
      const bonus = await (this.economy as any).grantSignupBonusIfNeeded(user.id);
      return {
        message: 'Email verified. Welcome credits granted.',
        signupBonusGranted: bonus.granted,
        bonusAmount: bonus.amount,
        currentCredits: bonus.credits,
      };
    }

    if (typeof (this.economy as any).addCredits === 'function') {
      await (this.economy as any).addCredits(user.id, SIGNUP_BONUS, {
        reason: 'signup_verified',
      });
    }

    return {
      message: 'Email verified. Welcome credits granted.',
      bonusAmount: SIGNUP_BONUS,
    };
  }

  async forgotPassword(identifier: string) {
    const user = await this.findUserByUsernameOrEmail(identifier);

    // Réponse volontairement neutre pour éviter d’indiquer si le compte existe
    if (!user) {
      return {
        message:
          'If an account matches this identifier, a password reset code has been sent.',
      };
    }

    if (!user.emailVerified) {
      return {
        message:
          'If an account matches this identifier, a password reset code has been sent.',
      };
    }

    const code = generate6DigitCode();
    user.passwordResetCodeHash = await bcrypt.hash(code, 10);
    user.passwordResetExpiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    await this.usersRepo.save(user);

    await this.mail.sendPasswordResetCode(user.email, user.username, code);

    return {
      message:
        'If an account matches this identifier, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const identifier = dto.identifier.trim();
    const code = dto.code.trim();
    const newPassword = dto.newPassword;

    const user = await this.findUserByUsernameOrEmail(identifier);
    if (!user) throw new BadRequestException('Invalid reset request');

    if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      throw new BadRequestException('No password reset request found');
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Password reset code expired');
    }

    const isValid = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!isValid) throw new BadRequestException('Invalid reset code');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetCodeHash = null;
    user.passwordResetExpiresAt = null;

    await this.usersRepo.save(user);

    return { message: 'Password updated successfully.' };
  }

  async login(dto: LoginDto) {
    const username = dto.username.trim();
    const password = dto.password;

    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new ForbiddenException('Invalid credentials');

    if (!user.emailVerified) {
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