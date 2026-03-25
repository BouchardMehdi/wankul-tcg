import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BoosterService } from './booster.service';
import { OpenBoosterDto } from './dto/open-booster.dto';
import { OpenDisplayDto } from './dto/open-display.dto';

@Controller('booster')
@UseGuards(JwtAuthGuard)
export class BoosterController {
  constructor(private readonly booster: BoosterService) {}

  @Get('seasons')
  getSeasons() {
    return this.booster.getAvailableSeasons();
  }

  @Post('open')
  open(
    @CurrentUser() user: { id: number },
    @Body() dto: OpenBoosterDto,
  ) {
    return this.booster.openBooster(user.id, dto.seasonNumber);
  }

  @Post('open-display')
  openDisplay(
    @CurrentUser() user: { id: number },
    @Body() dto: OpenDisplayDto,
  ) {
    return this.booster.openDisplay(user.id, dto.seasonNumber);
  }
}