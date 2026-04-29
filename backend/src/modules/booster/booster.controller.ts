import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('openings/history')
  getOpeningHistory(
    @CurrentUser() user: { id: number },
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.booster.getOpeningHistory(user.id, page, perPage, limit);
  }

  @Get('openings/:kind/:id')
  getOpeningReplay(
    @CurrentUser() user: { id: number },
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    return this.booster.getOpeningReplay(user.id, kind, id);
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
