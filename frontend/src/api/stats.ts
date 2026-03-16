import { apiFetch } from "./http";

export type SeasonProgress = {
  season: string;      // "Origins", "Campus", ...
  ownedUnique: number; // ✅ nombre de cartes UNIQUES débloquées
  total: number;       // total cartes dans la saison
};

export type MyStatsResponse = {
  boostersOpened?: number;
  displaysOpened?: number;

  // total cartes obtenues (avec doublons)
  cardsTotal?: number;

  // total cartes UNIQUES (toutes saisons confondues)
  uniqueCardsTotal?: number;

  legendaries?: number;

  // global
  rarities?: Record<string, number>;

  // par saison core
  raritiesBySeason?: Record<"Origins" | "Campus" | "Battle" | "Stellar", Record<string, number>>;

  // progression par saison en UNIQUES
  seasonProgress?: SeasonProgress[];
};

export async function getMyStats() {
  return apiFetch<MyStatsResponse>("/stats/me", { method: "GET", auth: true });
}