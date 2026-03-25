import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from '../users/user.entity';
import { BugReport } from '../report/bug-report.entity';
import { BugReportStatusHistory } from '../report/bug-report-status-history.entity';
import { BugReportStatus } from '../report/bug-report.entity';
import { EconomyAnalyticsService } from '../economy/economy-analytics.service';

type GetAllTicketsParams = {
  status?: BugReportStatus | '';
  handledBy?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(BugReport) private readonly reportsRepo: Repository<BugReport>,
    @InjectRepository(BugReportStatusHistory)
    private readonly historyRepo: Repository<BugReportStatusHistory>,
    private readonly jwt: JwtService,
    private readonly economyAnalyticsService: EconomyAnalyticsService,
  ) {}

  private formatReport(report: BugReport) {
    return {
      id: report.id,
      userId: report.userId,
      usernameSnapshot: report.usernameSnapshot,
      emailSnapshot: report.emailSnapshot,
      category: report.category,
      page: report.page,
      feature: report.feature,
      priority: report.priority,
      description: report.description,
      reproductionSteps: report.reproductionSteps,
      currentUrl: report.currentUrl,
      browserInfo: report.browserInfo,
      screenshotUrl: report.screenshotUrl,
      status: report.status,
      resolutionNote: report.resolutionNote,
      treatedAt: report.treatedAt,
      treatedBy: report.treatedBy,
      fixedAt: report.fixedAt,
      fixedBy: report.fixedBy,
      closedAt: report.closedAt,
      closedBy: report.closedBy,
      lastStatusChangedBy: report.lastStatusChangedBy,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      histories: (report.histories ?? [])
        .slice()
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
        .map((history) => ({
          id: history.id,
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          note: history.note,
          changedBy: history.changedBy,
          changedAt: history.changedAt,
        })),
    };
  }

  async adminLogin(userId: number, adminPassword: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }

    if (!user.adminPasswordHash) {
      throw new ForbiddenException('Admin password not configured');
    }

    const isValid = await bcrypt.compare(adminPassword, user.adminPasswordHash);
    if (!isValid) {
      throw new ForbiddenException('Invalid admin password');
    }

    const admin_access_token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      scope: 'admin',
    });

    return { admin_access_token };
  }

  async getAllTickets(params: GetAllTicketsParams = {}) {
    const status = (params.status ?? '').trim();
    const handledBy = (params.handledBy ?? '').trim();
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize = Math.min(5, Math.max(1, Number(params.pageSize ?? 5) || 5));

    const qb = this.reportsRepo
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.histories', 'history');

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    if (handledBy) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('report.treatedBy = :handledBy', { handledBy })
            .orWhere('report.fixedBy = :handledBy', { handledBy })
            .orWhere('report.closedBy = :handledBy', { handledBy })
            .orWhere('report.lastStatusChangedBy = :handledBy', { handledBy });
        }),
      );
    }

    qb.orderBy('report.createdAt', 'DESC');

    const [reports, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const adminNameRows = await this.reportsRepo
      .createQueryBuilder('report')
      .select([
        'report.treatedBy AS treatedBy',
        'report.fixedBy AS fixedBy',
        'report.closedBy AS closedBy',
        'report.lastStatusChangedBy AS lastStatusChangedBy',
      ])
      .getRawMany<{
        treatedBy: string | null;
        fixedBy: string | null;
        closedBy: string | null;
        lastStatusChangedBy: string | null;
      }>();

    const adminUsers = Array.from(
      new Set(
        adminNameRows
          .flatMap((row) => [
            row.treatedBy,
            row.fixedBy,
            row.closedBy,
            row.lastStatusChangedBy,
          ])
          .map((value) => value?.trim())
          .filter((value): value is string => !!value),
      ),
    ).sort((a, b) => a.localeCompare(b, 'fr'));

    return {
      items: reports.map((report) => this.formatReport(report)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      filters: {
        status: status || null,
        handledBy: handledBy || null,
      },
      adminUsers,
    };
  }

  async updateTicketStatus(
    reportId: number,
    adminUsername: string,
    status: string,
    note?: string,
  ) {
    const report = await this.reportsRepo.findOne({
      where: { id: reportId },
      relations: ['histories'],
    });

    if (!report) throw new NotFoundException('Ticket not found');

    const previousStatus = report.status;
    const now = new Date();

    report.status = status as any;
    report.resolutionNote = note?.trim() || null;
    report.lastStatusChangedBy = adminUsername;

    if ((status === 'investigating' || status === 'planned') && !report.treatedAt) {
      report.treatedAt = now;
      report.treatedBy = adminUsername;
    }

    if (status === 'fixed') {
      if (!report.treatedAt) {
        report.treatedAt = now;
        report.treatedBy = adminUsername;
      }
      report.fixedAt = now;
      report.fixedBy = adminUsername;
    }

    if (status === 'closed' || status === 'rejected') {
      if (!report.treatedAt) {
        report.treatedAt = now;
        report.treatedBy = adminUsername;
      }
      report.closedAt = now;
      report.closedBy = adminUsername;
    }

    if (status === 'open') {
      report.closedAt = null;
      report.closedBy = null;
      report.fixedAt = null;
      report.fixedBy = null;
    }

    const saved = await this.reportsRepo.save(report);

    const history = this.historyRepo.create({
      reportId: saved.id,
      fromStatus: previousStatus,
      toStatus: status,
      note: note?.trim() || null,
      changedBy: adminUsername,
    });

    await this.historyRepo.save(history);

    const refreshed = await this.reportsRepo.findOne({
      where: { id: saved.id },
      relations: ['histories'],
    });

    if (!refreshed) throw new NotFoundException('Ticket not found');

    return {
      message: 'Ticket updated.',
      item: this.formatReport(refreshed),
    };
  }

  async getEconomyOverview(days = 7) {
    return this.economyAnalyticsService.getOverview(days);
  }
}