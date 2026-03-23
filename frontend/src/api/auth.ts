import { apiFetch } from './http';

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
  category: 'bug' | 'visual' | 'performance' | 'market' | 'opening' | 'collection' | 'auth' | 'other';
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
  fixedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  histories: BugReportHistoryItem[];
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

export async function getMyBugReports() {
  return apiFetch<{ items: BugReportListItem[] }>('/auth/my-bug-reports', {
    method: 'GET',
  });
}