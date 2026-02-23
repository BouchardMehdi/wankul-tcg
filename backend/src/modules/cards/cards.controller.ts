import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { CardsService } from './cards.service';
import { ListCardsQueryDto } from './dto/list-cards.query';
import { normalizeCardKey } from './cards.util';

@Controller('cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get()
  list(@Query() query: ListCardsQueryDto) {
    return this.cards.list(query);
  }

  @Get('meta')
  meta() {
    return this.cards.meta();
  }

@Get(':key')
async get(@Param('key') key: string) {
  return this.cards.findByKeyOrFail(key);
}

}
