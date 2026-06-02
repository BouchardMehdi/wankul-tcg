import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetMarketPriceHistoryDto } from './dto/get-market-price-history.dto';
import { MarketPriceHistoryService } from './market-price-history.service';

@Controller('market/cards')
@UseGuards(JwtAuthGuard)
export class MarketPriceHistoryController {
  constructor(
    private readonly marketPriceHistoryService: MarketPriceHistoryService,
  ) {}

  @Get(':cardId/price-history')
  async getCardPriceHistory(
    @Param('cardId', ParseIntPipe) cardId: number,
    @Query() query: GetMarketPriceHistoryDto,
  ) {
    return this.marketPriceHistoryService.getHistory(cardId, query);
  }
}