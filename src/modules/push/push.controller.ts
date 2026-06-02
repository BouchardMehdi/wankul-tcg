import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PushService } from './push.service';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { DeletePushSubscriptionDto } from './dto/delete-push-subscription.dto';
import { UpdatePushPreferencesDto } from './dto/update-push-preferences.dto';
import { UpsertWatchlistItemDto } from './dto/upsert-watchlist-item.dto';

type CurrentAuthUser = {
  sub?: number;
  userId?: number;
  id?: number;
};

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('public-key')
  getPublicKey() {
    return this.pushService.getPublicConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  async getPreferences(@CurrentUser() user: CurrentAuthUser) {
    const userId = this.resolveUserId(user);
    return this.pushService.getPreferences(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: UpdatePushPreferencesDto,
  ) {
    const userId = this.resolveUserId(user);
    return this.pushService.updatePreferences(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('watchlist')
  async getWatchlist(@CurrentUser() user: CurrentAuthUser) {
    const userId = this.resolveUserId(user);
    return this.pushService.getWatchlist(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('watchlist/card/:cardId')
  async getWatchlistItem(
    @CurrentUser() user: CurrentAuthUser,
    @Param('cardId', ParseIntPipe) cardId: number,
  ) {
    const userId = this.resolveUserId(user);
    return this.pushService.getWatchlistItem(userId, cardId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('watchlist/card/:cardId')
  async upsertWatchlistItem(
    @CurrentUser() user: CurrentAuthUser,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() dto: UpsertWatchlistItemDto,
  ) {
    const userId = this.resolveUserId(user);
    return this.pushService.upsertWatchlistItem(userId, cardId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('watchlist/card/:cardId')
  async deleteWatchlistItem(
    @CurrentUser() user: CurrentAuthUser,
    @Param('cardId', ParseIntPipe) cardId: number,
  ) {
    const userId = this.resolveUserId(user);
    return this.pushService.deleteWatchlistItem(userId, cardId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscriptions')
  async createSubscription(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: CreatePushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    const userId = this.resolveUserId(user);
    return this.pushService.saveSubscription(userId, dto, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscriptions')
  async deleteSubscription(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: DeletePushSubscriptionDto,
  ) {
    const userId = this.resolveUserId(user);
    return this.pushService.deleteSubscription(userId, dto.endpoint);
  }

  private resolveUserId(user: CurrentAuthUser): number {
    const userId = user?.sub ?? user?.userId ?? user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Unable to resolve current user id from JWT payload',
      );
    }

    return userId;
  }
}
