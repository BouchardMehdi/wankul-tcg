import { apiFetch } from "./http";

export type EconomySnapshot = {
  credits: number;

  freeBoosterCharges: number;
  freeDisplayCharges: number;

  nextBoosterChargeAt: string | null;
  nextDisplayChargeAt: string | null;

  costs: {
    booster: number;
    display: number;
  };

  signupBonusGranted: boolean;
  signupBonusAmount: number;
};

export async function getEconomyMe() {
  return apiFetch<EconomySnapshot>("/economy/me", { method: "GET", auth: true });
}

export function formatCooldown(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalMin = Math.ceil(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h} h`;
  return `${h} h ${m} min`;
}