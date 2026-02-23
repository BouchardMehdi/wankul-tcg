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
    rarity: string;
    type?: string | null;
    gameplayType?: string | null;
    specialEdition?: boolean;
    artist?: string | null;
    imageUrl: string;
  };
  quantity: number;
};

export async function fetchOwnedCollection() {
  return apiFetch<OwnedCardRow[]>("/me/collection", {
    method: "GET",
  });
}