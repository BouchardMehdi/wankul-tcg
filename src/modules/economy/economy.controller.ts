import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { EconomyService } from './economy.service';

@Controller('economy')
@UseGuards(JwtAuthGuard)
export class EconomyController {
  constructor(private readonly economy: EconomyService) {}

  @Get('me')
  async me(@CurrentUser() user: { id: number }) {
    return this.economy.getSnapshot(user.id);
  }
}
