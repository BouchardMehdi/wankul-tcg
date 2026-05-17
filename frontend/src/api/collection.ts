import { apiFetch } from "./http";

export type OwnedCardRow = {
  card: {
    id: number;
    key: string;
    name: string;
    season?: string | null;
    seasonNumber?: number | null;
    extension?: string | null;
    number?: number | null;
    displayNumber?: string | null;
    rarity: string;
    type?: string | null;
    gameplayType?: string | null;
    specialEdition?: boolean;
    artist?: string | null;
    imageUrl: string;
    specialCategory?: string | null;
    affiliatedSeason?: string | null;
    affiliatedSeasonNumber?: number | null;
    sourceRarity?: string | null;
    sourceRaritySlug?: string | null;
  };
  quantity: number;
};

export async function fetchOwnedCollection() {
  return apiFetch<OwnedCardRow[]>("/me/collection", {
    method: "GET",
  });
}
