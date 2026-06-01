import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(JwtAuthGuard)
  @Post('session/login')
  async adminLogin(
    @CurrentUser() currentUser: { id: number; username: string; role: string },
    @Body() dto: AdminLoginDto,
  ) {
    return this.adminService.adminLogin(currentUser.id, dto.adminPassword);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('tickets')
  async getAllTickets(
    @Query('status') status?: string,
    @Query('handledBy') handledBy?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getAllTickets({
      status: (status as any) ?? '',
      handledBy,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 5),
    });
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('tickets/:id/status')
  async updateTicketStatus(
    @CurrentUser() currentUser: { id: number; username: string; role: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.adminService.updateTicketStatus(
      id,
      currentUser.username,
      dto.status,
      dto.note,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('economy/overview')
  async getEconomyOverview(@Query('days') days?: string) {
    return this.adminService.getEconomyOverview(Number(days ?? 7) || 7);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('seasons/cards')
  async getSeasonCardsOverview() {
    return this.adminService.getSeasonCardsOverview();
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('pwa/monitoring')
  async getPwaMonitoring(@Query('days') days?: string) {
    return this.adminService.getPwaMonitoring(Number(days ?? 30) || 30);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('economy/logs')
  async getEconomyLogs(
    @Query('days') days?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('userId') userId?: string,
    @Query('cardId') cardId?: string,
    @Query('targetType') targetType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getEconomyLogs({
      days: Number(days ?? 7) || 7,
      from,
      to,
      page: Number(page ?? 1) || 1,
      pageSize: Number(pageSize ?? 25) || 25,
      action,
      status: (status as any) ?? '',
      severity: (severity as any) ?? '',
      userId: userId ? Number(userId) : undefined,
      cardId: cardId ? Number(cardId) : undefined,
      targetType,
    });
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('economy/export')
  async exportEconomy(
    @Query('days') days: string | undefined,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const exportData = await this.adminService.getEconomyExport(Number(days ?? 30) || 30);
    const safeDate = new Date().toISOString().slice(0, 10);
    const safeDays = exportData.days;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="wankul-economy-${safeDate}-${safeDays}d.csv"`,
      );
      return this.adminService.buildEconomyExportCsv(exportData);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wankul-economy-${safeDate}-${safeDays}d.json"`,
    );

    return exportData;
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('backup/export')
  async exportBackup(
    @Query('scope') scope: string | undefined,
    @Query('days') days: string | undefined,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const exportData = await this.adminService.getBackupExport(
      scope,
      Number(days ?? 30) || 30,
    );
    const safeDate = new Date().toISOString().slice(0, 10);
    const safeScope = exportData.scope;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="wankul-backup-${safeScope}-${safeDate}.csv"`,
      );
      return this.adminService.buildBackupExportCsv(exportData);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wankul-backup-${safeScope}-${safeDate}.json"`,
    );

    return exportData;
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('economy/corrections/cancel-transaction')
  async cancelMarketTransaction(
    @CurrentUser() currentUser: { id: number; username: string; role: string },
    @Body() body: { transactionId: number; reason?: string },
  ) {
    return this.adminService.cancelMarketTransaction(
      currentUser,
      Number(body.transactionId),
      body.reason,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('economy/corrections/listings/:id/disable')
  async disableMarketListing(
    @CurrentUser() currentUser: { id: number; username: string; role: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.disableMarketListing(currentUser, id, body.reason);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('economy/corrections/listings/:id/price')
  async adjustMarketListingPrice(
    @CurrentUser() currentUser: { id: number; username: string; role: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { priceCredits: number; reason?: string },
  ) {
    return this.adminService.adjustMarketListingPrice(
      currentUser,
      id,
      Number(body.priceCredits),
      body.reason,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('economy/corrections/refund-player')
  async refundPlayer(
    @CurrentUser() currentUser: { id: number; username: string; role: string },
    @Body() body: { userId: number; amount: number; reason?: string },
  ) {
    return this.adminService.refundPlayer(
      currentUser,
      Number(body.userId),
      Number(body.amount),
      body.reason,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('economy/corrections/remove-reward')
  async removeBuggedReward(
    @CurrentUser() currentUser: { id: number; username: string; role: string },
    @Body()
    body: {
      userId: number;
      credits?: number;
      cardId?: number;
      cardQuantity?: number;
      reason?: string;
    },
  ) {
    return this.adminService.removeBuggedReward(currentUser, {
      userId: Number(body.userId),
      credits: body.credits === undefined ? undefined : Number(body.credits),
      cardId: body.cardId === undefined ? undefined : Number(body.cardId),
      cardQuantity:
        body.cardQuantity === undefined ? undefined : Number(body.cardQuantity),
      reason: body.reason,
    });
  }
}
