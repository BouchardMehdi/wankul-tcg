import { API_ORIGIN, apiFetch } from './http';

function getApiBase() {
  return `${API_ORIGIN}/api`;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const adminToken = localStorage.getItem('admin_token');
  const url = `${getApiBase()}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data as T;
}

export type LoginDto = {
  username: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
};

export type RegisterDto = {
  username: string;
  email: string;
  password: string;
};

export type SimpleMessage = {
  message?: string;
};

export type VerifyEmailDto = {
  username: string;
  code: string;
};

export type ForgotPasswordDto = {
  identifier: string;
};

export type ResetPasswordDto = {
  identifier: string;
  code: string;
  newPassword: string;
};

export type BugReportStatus =
  | 'open'
  | 'investigating'
  | 'planned'
  | 'fixed'
  | 'closed'
  | 'rejected';

export type ReportBugDto = {
  category:
    | 'bug'
    | 'visual'
    | 'performance'
    | 'market'
    | 'opening'
    | 'collection'
    | 'auth'
    | 'other';
  page: string;
  feature: string;
  priority: 'minor' | 'medium' | 'high' | 'blocking';
  description: string;
  reproductionSteps?: string;
  currentUrl?: string;
  browserInfo?: string;
  screenshotDataUrl?: string;
  screenshotFilename?: string;
};

export type BugReportHistoryItem = {
  id: number;
  fromStatus: string | null;
  toStatus: BugReportStatus;
  note: string | null;
  changedBy: string;
  changedAt: string;
};

export type BugReportListItem = {
  id: number;
  userId?: number;
  usernameSnapshot?: string;
  emailSnapshot?: string;
  category: string;
  page: string;
  feature: string;
  priority: string;
  description: string;
  reproductionSteps: string | null;
  currentUrl: string | null;
  browserInfo: string | null;
  screenshotUrl: string | null;
  status: BugReportStatus;
  resolutionNote: string | null;
  treatedAt: string | null;
  treatedBy: string | null;
  fixedAt: string | null;
  fixedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  lastStatusChangedBy: string | null;
  createdAt: string;
  updatedAt: string;
  histories: BugReportHistoryItem[];
};

export type PlayerBugReportsResponse = {
  items: BugReportListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status: string | null;
  };
  availableStatuses: Array<{
    value: string;
    label: string;
  }>;
};

export type AdminTicketsResponse = {
  items: BugReportListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status: string | null;
    handledBy: string | null;
  };
  adminUsers: string[];
};

export type EconomyDailyStatRow = {
  id: number;
  date: string;
  boostersOpened: number;
  displaysOpened: number;
  creditsSpent: number;
  creditsEarnedOpening: number;
  creditsEarnedQuickSell: number;
  creditsEarnedJackpot: number;
  marketVolume: number;
  createdAt: string;
};

export type AdminEconomyOverviewResponse = {
  days: number;
  rows: EconomyDailyStatRow[];
  totals: {
    creditsSpent: number;
    creditsEarned: number;
    creditsEarnedOpening?: number;
    creditsEarnedQuickSell?: number;
    creditsEarnedJackpot?: number;
    marketVolume?: number;
  };
  inflation: number;
  advanced?: {
    health: {
      creditsCreated: number;
      creditsCreatedOpening: number;
      creditsCreatedQuickSell: number;
      creditsCreatedJackpot: number;
      creditsDestroyed: number;
      netInflation: number;
      inflationRatePercent: number;
      marketVolume: number;
      quickSellToMarketPercent: number;
      quickSellShareOfCreatedPercent: number;
      openingShareOfCreatedPercent: number;
      riskScore: number;
      riskLevel: 'ok' | 'watch' | 'danger';
    };
    rarityProfitability: Array<{
      rarity: string;
      saleCount: number;
      quantitySold: number;
      marketVolume: number;
      avgUnitPrice: number;
      avgMarketSnapshot: number;
      avgVsMarketPercent: number;
      openedCardsCount: number;
      estimatedOpeningRewards: number;
      estimatedRewardPerOpenedCard: number;
      score: number;
      status: 'ok' | 'watch' | 'danger';
    }>;
    manipulatedCards: Array<{
      cardId: number;
      cardName: string;
      rarity: string;
      saleCount: number;
      quantitySold: number;
      marketVolume: number;
      avgUnitPrice: number;
      avgMarketSnapshot: number;
      avgVsMarketPercent: number;
      outlierTrades: number;
      volatilityPercent: number;
      minPrice: number;
      maxPrice: number;
      priceSamples: number;
      lastActivityAt: string | null;
      score: number;
    }>;
    suspiciousUsers: Array<{
      userId: number;
      username: string;
      score: number;
      reasons: string[];
      salesCount: number;
      purchasesCount: number;
      totalTrades: number;
      soldVolume: number;
      boughtVolume: number;
      totalVolume: number;
      listingCount: number;
      cancelledListings: number;
      activeListings: number;
      cancelRatePercent: number;
      openingCount: number;
      currentCredits: number;
      highDeviationTrades: number;
    }>;
  };
  security?: {
    totals: {
      allowed: number;
      flagged: number;
      blocked: number;
      danger: number;
    };
    byAction: Array<{
      action: string;
      status: 'allowed' | 'flagged' | 'blocked';
      severity: 'info' | 'watch' | 'danger';
      count: number;
    }>;
    recentEvents: Array<{
      id: number;
      userId: number | null;
      action: string;
      status: 'allowed' | 'flagged' | 'blocked';
      severity: 'info' | 'watch' | 'danger';
      targetType: string | null;
      targetId: number | null;
      valueCredits: number;
      reason: string | null;
      metadata: Record<string, any> | null;
      createdAt: string;
    }>;
  };
};

export type AdminEconomyLogsResponse = {
  items: NonNullable<AdminEconomyOverviewResponse['security']>['recentEvents'];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    days: number;
    action: string | null;
    status: string | null;
    severity: string | null;
    userId: number | null;
  };
};

export async function login(dto: LoginDto) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: dto,
    auth: false,
  });
}

export async function register(dto: RegisterDto) {
  return apiFetch<SimpleMessage>('/auth/register', {
    method: 'POST',
    body: dto,
    auth: false,
  });
}

export async function verifyEmail(dto: VerifyEmailDto) {
  return apiFetch<SimpleMessage>('/auth/verify-email', {
    method: 'POST',
    body: dto,
    auth: false,
  });
}

export async function resendVerification(dto: { username: string }) {
  return apiFetch<SimpleMessage>('/auth/resend-verification', {
    method: 'POST',
    body: dto,
    auth: false,
  });
}

export async function forgotPassword(dto: ForgotPasswordDto) {
  return apiFetch<SimpleMessage>('/auth/forgot-password', {
    method: 'POST',
    body: dto,
    auth: false,
  });
}

export async function resetPassword(dto: ResetPasswordDto) {
  return apiFetch<SimpleMessage>('/auth/reset-password', {
    method: 'POST',
    body: dto,
    auth: false,
  });
}

export async function reportBug(dto: ReportBugDto) {
  return apiFetch<{ message?: string; reportId?: number }>('/auth/report-bug', {
    method: 'POST',
    body: dto,
  });
}

export async function getMyBugReports(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();

  if (params?.status) search.set('status', params.status);
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));

  const query = search.toString();

  return apiFetch<PlayerBugReportsResponse>(
    `/auth/my-bug-reports${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function adminLogin(adminPassword: string) {
  return apiFetch<{ admin_access_token: string }>('/admin/session/login', {
    method: 'POST',
    body: { adminPassword },
  });
}

export async function getAdminTickets(params?: {
  status?: string;
  handledBy?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();

  if (params?.status) search.set('status', params.status);
  if (params?.handledBy) search.set('handledBy', params.handledBy);
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));

  const query = search.toString();

  return adminFetch<AdminTicketsResponse>(
    `/admin/tickets${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function updateAdminTicketStatus(
  id: number,
  status: BugReportStatus,
  note?: string,
) {
  return adminFetch<{ message?: string; item: BugReportListItem }>(
    `/admin/tickets/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    },
  );
}

export async function getAdminEconomyOverview(days = 7) {
  return adminFetch<AdminEconomyOverviewResponse>(
    `/admin/economy/overview?days=${days}`,
    {
      method: 'GET',
    },
  );
}

export async function getAdminEconomyLogs(params?: {
  days?: number;
  page?: number;
  pageSize?: number;
  action?: string;
  status?: string;
  severity?: string;
  userId?: number;
}) {
  const search = new URLSearchParams();

  if (params?.days) search.set('days', String(params.days));
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));
  if (params?.action) search.set('action', params.action);
  if (params?.status) search.set('status', params.status);
  if (params?.severity) search.set('severity', params.severity);
  if (params?.userId) search.set('userId', String(params.userId));

  const query = search.toString();

  return adminFetch<AdminEconomyLogsResponse>(
    `/admin/economy/logs${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function downloadAdminEconomyExport(days = 30, format: 'json' | 'csv' = 'json') {
  const adminToken = localStorage.getItem('admin_token');
  const url = `${getApiBase()}/admin/economy/export?days=${days}&format=${format}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    },
  });

  const blob = await res.blob();

  if (!res.ok) {
    const text = await blob.text().catch(() => '');
    throw new Error(text || 'Export admin impossible.');
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: match?.[1] ?? `wankul-economy-${days}d.${format}`,
  };
}
