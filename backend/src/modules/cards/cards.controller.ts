import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CardsService } from './cards.service';
import { ListCardsQueryDto } from './dto/list-cards.query';

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

  @Get('id/:id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.cards.findByIdOrFail(id);
  }

  @Get(':key')
  getByKey(@Param('key') key: string) {
    return this.cards.findByKeyOrFail(key);
  }
}
