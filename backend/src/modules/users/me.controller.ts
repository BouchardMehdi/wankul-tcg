import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { EconomyService } from '../economy/economy.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly economy: EconomyService,
  ) {}

  @Get()
  me(@CurrentUser() user: { id: number }) {
    return this.users.findByIdOrFail(user.id);
  }

  @Get('collection')
  collection(@CurrentUser() user: { id: number }) {
    return this.users.getCollection(user.id);
  }

  @Get('wallet')
  wallet(@CurrentUser() user: { id: number }) {
    return this.economy.getSnapshot(user.id);
  }

  @Post('add-card')
  addCard(
    @CurrentUser() user: { id: number },
    @Body() body: { cardId: number; quantity?: number },
  ) {
    return this.users.addCardToUser(user.id, body.cardId, body.quantity ?? 1);
  }
}
