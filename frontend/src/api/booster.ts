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

export type OpeningHistoryKind = "booster" | "display";

export type OpeningHistoryItem = {
  id: number;
  kind: OpeningHistoryKind;
  openedAt: string;
  season: string;
  seasonNumber: number | null;
  boosterCount: number;
  cardsCount: number;
  totalCardsCount?: number;
  creditsEarnedTotal: number | null;
  newCount: number;
  hitCount: number;
  hasGoldBooster?: boolean;
  coverCard?: any | null;
  previewCards?: any[];
  canReplay: boolean;
};

export type OpeningReplayResponse = OpeningHistoryItem & {
  result: OpenBoosterResponse | OpenDisplayResponse | any;
};

export type OpeningHistoryPage = {
  items: OpeningHistoryItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
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

export async function getOpeningHistory(page = 1, perPage = 12) {
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.max(1, Math.min(50, Math.floor(perPage)));

  return apiFetch<OpeningHistoryPage>(
    `/booster/openings/history?page=${safePage}&perPage=${safePerPage}`,
    {
      method: "GET",
      auth: true,
    }
  );
}

export async function getOpeningHistoryLegacy(limit = 8) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  return apiFetch<OpeningHistoryPage>(`/booster/openings/history?limit=${safeLimit}`, {
    method: "GET",
    auth: true,
  });
}

export async function getOpeningReplay(kind: OpeningHistoryKind, id: number) {
  return apiFetch<OpeningReplayResponse>(`/booster/openings/${kind}/${id}`, {
    method: "GET",
    auth: true,
  });
}
