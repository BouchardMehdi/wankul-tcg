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

export async function login(dto: LoginDto) {
  // ✅ doit correspondre à ton backend: POST /api/auth/login
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
