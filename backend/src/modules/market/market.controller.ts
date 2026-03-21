import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MarketService } from './market.service';
import { QuickSellDto } from './dto/quick-sell.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { BuyListingDto } from './dto/buy-listing.dto';
import { ListMarketListingsQueryDto } from './dto/list-market-listings-query.dto';
import { GetMarketPriceHistoryDto } from './dto/get-market-price-history.dto';
import { MarketPriceHistoryService } from './market-price-history.service';

type CurrentAuthUser = {
  sub?: number;
  userId?: number;
  id?: number;
};

@Controller('market')
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
    private readonly marketPriceHistoryService: MarketPriceHistoryService,
  ) {}

  @Get('price/:cardId')
  async getMarketPrice(@Param('cardId', ParseIntPipe) cardId: number) {
    return this.marketService.getMarketPrice(cardId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cards/:cardId/price-history')
  async getCardPriceHistory(
    @Param('cardId', ParseIntPipe) cardId: number,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetMarketPriceHistoryDto,
  ) {
    return this.marketPriceHistoryService.getHistory(cardId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/sellable-cards')
  async getMySellableCards(@CurrentUser() user: CurrentAuthUser) {
    const userId = this.resolveUserId(user);
    return this.marketService.getMySellableCards(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('quick-sell')
  async quickSell(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: QuickSellDto,
  ) {
    const userId = this.resolveUserId(user);
    return this.marketService.quickSell(userId, dto.cardId, dto.quantity);
  }

  @Get('listings')
  async getActiveListings(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: ListMarketListingsQueryDto,
  ) {
    return this.marketService.getActiveListings(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('listings/me')
  async getMyListings(@CurrentUser() user: CurrentAuthUser) {
    const userId = this.resolveUserId(user);
    return this.marketService.getMyListings(userId);
  }

  @Get('listings/:listingId')
  async getListingById(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.marketService.getListingById(listingId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('listings')
  async createListing(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: CreateListingDto,
  ) {
    const userId = this.resolveUserId(user);

    return this.marketService.createListing(userId, {
      cardId: dto.cardId,
      quantity: dto.quantity,
      listingMode: dto.listingMode,
      offerType: dto.offerType,
      priceCredits: dto.priceCredits,
      wantedCardId: dto.wantedCardId,
      wantedCardQuantity: dto.wantedCardQuantity,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('listings/:listingId/buy')
  async buyListing(
    @CurrentUser() user: CurrentAuthUser,
    @Param('listingId', ParseIntPipe) listingId: number,
    @Body() dto: BuyListingDto,
  ) {
    const userId = this.resolveUserId(user);
    return this.marketService.buyListing(userId, listingId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('listings/:listingId/cancel')
  async cancelListing(
    @CurrentUser() user: CurrentAuthUser,
    @Param('listingId', ParseIntPipe) listingId: number,
  ) {
    const userId = this.resolveUserId(user);
    return this.marketService.cancelListing(userId, listingId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('transactions/:transactionId/claim')
  async claimTransactionReward(
    @CurrentUser() user: CurrentAuthUser,
    @Param('transactionId', ParseIntPipe) transactionId: number,
  ) {
    const userId = this.resolveUserId(user);
    return this.marketService.claimTransactionReward(userId, transactionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/me')
  async getMyTransactions(@CurrentUser() user: CurrentAuthUser) {
    const userId = this.resolveUserId(user);
    return this.marketService.getMyTransactions(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/me/purchases')
  async getMyPurchases(@CurrentUser() user: CurrentAuthUser) {
    const userId = this.resolveUserId(user);
    return this.marketService.getMyPurchases(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/me/sales')
  async getMySales(@CurrentUser() user: CurrentAuthUser) {
    const userId = this.resolveUserId(user);
    return this.marketService.getMySales(userId);
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