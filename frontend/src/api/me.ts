import { apiFetch } from "./http";

export type MeResponse = {
  id: number;
  username: string;
  email?: string;
  emailVerified?: boolean;
};

export type WalletResponse = {
  credits: number;
};

export async function getMe() {
  return apiFetch<MeResponse>("/me", { method: "GET" });
}

export async function getWallet() {
  return apiFetch<WalletResponse>("/me/wallet", { method: "GET" });
}