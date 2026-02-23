import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  // ✅ utilisé par ton Menu (front) : GET /stats/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: number }) {
    return this.stats.getMyStats(user.id);
  }

  @Get('drop-rates')
  dropRates(
    @Query('mode') mode?: string,
    @Query('days') days?: string,
    @Query('season') season?: string,
    @Query('includeGold') includeGold?: string,
  ) {
    const d = days ? Math.max(1, Math.min(365, Number(days))) : 30;
    const m = (mode ?? 'global').toLowerCase();
    const ig = (includeGold ?? 'false').toLowerCase() === 'true';

    if (!['unit', 'display', 'global'].includes(m)) {
      return {
        message: 'Invalid mode. Use unit|display|global',
        provided: mode ?? null,
      };
    }

    return this.stats.getDropRates({
      mode: m as any,
      days: d,
      season: season as any,
      includeGold: ig,
    });
  }
}
