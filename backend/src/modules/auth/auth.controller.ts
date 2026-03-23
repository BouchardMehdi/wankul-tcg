import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ReportBugDto } from '../report/dto/report-bug.dto';
import { UpdateBugReportStatusDto } from '../report/dto/update-bug-report-status.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

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
  async resendVerification(@Body() dto: ResendCodeDto) {
    return this.auth.resendVerificationCode(dto.username);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.identifier);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('report-bug')
  async reportBug(
    @CurrentUser() currentUser: { id: number; username: string },
    @Body() dto: ReportBugDto,
  ) {
    return this.auth.reportBug(currentUser.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-bug-reports')
  async getMyBugReports(@CurrentUser() currentUser: { id: number; username: string }) {
    return this.auth.getMyBugReports(currentUser.id);
  }

  @Patch('admin/bug-reports/:id/status')
  async updateBugReportStatus(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-support-admin-key') adminKey: string | undefined,
    @Body() dto: UpdateBugReportStatusDto,
  ) {
    return this.auth.updateBugReportStatus(id, adminKey, dto);
  }
}