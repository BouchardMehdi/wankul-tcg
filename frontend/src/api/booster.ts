import { apiFetch } from "./http";

export type BoosterSeasonInfo = {
  seasonNumber: number;
  label: string;
  season: string | null;
  extension: string | null;
  cardCount: number;
  rarityCounts: Record<string, number>;
  isOpenable: boolean;
  missingRequirements: string[];
};

export type OpenBoosterResponse = {
  payment: { paid: boolean; cost: number };
  season: string;
  seasonNumber: number;
  cards: any[];
  credits: any;
  creditsEarnedTotal?: number;
  newCardIds?: Array<number | string>;
  newCardKeys?: string[];
  flags: { hasGTO: boolean; hasTicketOr: boolean; ticketOrIsNew?: boolean };
};

export type OpenDisplayResponse = {
  payment: { paid: boolean; cost: number };
  season: string;
  seasonNumber: number;
  meta: {
    boosters: number;
    hasGoldBooster: boolean;
    goldIndex: number | null;
    forcedLegendaryIndex: number;
  };
  boosters: any[][];
  credits: any;
  creditsEarnedTotal?: number;
  newCardIds?: Array<number | string>;
  newCardKeys?: string[];
};

export async function getBoosterSeasons() {
  return apiFetch<BoosterSeasonInfo[]>("/booster/seasons", {
    method: "GET",
    auth: true,
  });
}

export async function openBooster(seasonNumber: number) {
  return apiFetch<OpenBoosterResponse>("/booster/open", {
    method: "POST",
    body: { seasonNumber },
    auth: true,
  });
}

export async function openDisplay(seasonNumber: number) {
  return apiFetch<OpenDisplayResponse>("/booster/open-display", {
    method: "POST",
    body: { seasonNumber },
    auth: true,
  });
}