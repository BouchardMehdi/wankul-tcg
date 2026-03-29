import { apiFetch } from "./http";

export type CardDto = {
  id: number;
  key: string;
  name: string;
  season?: string | null;
  seasonNumber?: number | null;
  extension?: string | null;
  number?: number | null;
  rarity: string;
  type?: string | null;
  gameplayType?: string | null;
  specialEdition?: boolean;
  artist?: string | null;
  imageUrl: string;
};

export type CardsListResponse = {
  items: CardDto[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};

/**
 * GET /cards?page=1&limit=2000 (PUBLIC)
 * IMPORTANT: auth:false -> évite Authorization -> évite preflight OPTIONS -> évite Erreur CORS
 */
export async function fetchCardsPage(page = 1, limit = 2000) {
  return apiFetch<CardsListResponse>(`/cards?page=${page}&limit=${limit}`, {
    method: "GET",
    auth: false,
  });
}

/**
 * Récupère TOUTES les cartes en paginant si nécessaire
 */
export async function fetchAllCards(): Promise<CardDto[]> {
  const LIMIT = 2000;

  const first = await fetchCardsPage(1, LIMIT);

  let all = [...(first.items ?? [])];

  for (let p = 2; p <= (first.pages ?? 1); p++) {
    const res = await fetchCardsPage(p, LIMIT);
    all = all.concat(res.items ?? []);
  }

  return all;
}