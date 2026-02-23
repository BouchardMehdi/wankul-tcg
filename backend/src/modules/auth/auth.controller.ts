import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

class ResendVerificationDto {
  username!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerificationCode(dto.username);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
