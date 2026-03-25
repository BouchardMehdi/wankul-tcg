import { apiFetch } from './http';

function getApiBase() {
  return (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
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
  };
  inflation: number;
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