import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

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
}