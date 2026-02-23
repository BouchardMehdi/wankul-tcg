import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BoosterService } from './booster.service';
import { OpenBoosterDto } from './dto/open-booster.dto';
import { OpenDisplayDto } from './dto/open-display.dto';

@Controller('booster')
@UseGuards(JwtAuthGuard)
export class BoosterController {
  constructor(private readonly booster: BoosterService) {}

  @Post('open')
  open(@CurrentUser() user: { id: number }, @Body() dto: OpenBoosterDto) {
    return this.booster.openBooster(user.id, dto.season);
  }

  @Post('open-display')
  openDisplay(@CurrentUser() user: { id: number }, @Body() dto: OpenDisplayDto) {
    return this.booster.openDisplay(user.id, dto.season);
  }
}
  