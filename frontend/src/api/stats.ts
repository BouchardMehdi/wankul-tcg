import { apiFetch } from "./http";

export type SeasonProgress = {
  season: string;      // "Origins", "Campus", ...
  ownedUnique: number; // ✅ nombre de cartes UNIQUES débloquées
  total: number;       // total cartes dans la saison
};

export type MyStatsResponse = {
  boostersOpened?: number;
  displaysOpened?: number;

  // ✅ total cartes obtenues (avec doublons) si tu veux l'afficher ailleurs
  cardsTotal?: number;

  // ✅ total cartes UNIQUES (toutes saisons confondues)
  uniqueCardsTotal?: number;

  legendaries?: number;
  rarities?: Record<string, number>;

  // ✅ progression par saison en UNIQUES
  seasonProgress?: SeasonProgress[];
};

export async function getMyStats() {
  return apiFetch<MyStatsResponse>("/stats/me", { method: "GET", auth: true });
}
