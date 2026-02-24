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
  return apiFetch("/me", { method: "GET" });
}

export async function getWallet() {
  return apiFetch("/me/wallet", { method: "GET" });
}