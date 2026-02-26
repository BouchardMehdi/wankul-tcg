import { apiFetch } from "./http";

export type SeasonName = "Origins" | "Campus" | "Battle" | "Stellar";

export type OpenBoosterResponse = {
  payment: { paid: boolean; cost: number };
  season: SeasonName;
  cards: any[];
  credits: any;
  flags: { hasGTO: boolean; hasTicketOr: boolean };
};

export type OpenDisplayResponse = {
  payment: { paid: boolean; cost: number };
  season: SeasonName;
  meta: {
    boosters: number;
    hasGoldBooster: boolean;
    goldIndex: number | null;
    forcedLegendaryIndex: number;
  };
  boosters: any[][];
  credits: any;
};

export async function openBooster(season: SeasonName) {
  return apiFetch<OpenBoosterResponse>("/booster/open", {
    method: "POST",
    body: { season },
    auth: true,
  });
}

export async function openDisplay(season: SeasonName) {
  return apiFetch<OpenDisplayResponse>("/booster/open-display", {
    method: "POST",
    body: { season },
    auth: true,
  });
}