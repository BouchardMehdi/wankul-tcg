import { apiFetch } from "./http";

export type CardDetailsDto = {
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

export type CardPriceHistoryRange = "24H" | "7D" | "30D" | "6M" | "1Y";

export type CardPriceHistoryResponse = {
  cardId: number;
  range: CardPriceHistoryRange;
  points: Array<{
    timestamp: string;
    price: number;
  }>;
};

export async function fetchCardDetails(cardId: number) {
  return apiFetch<CardDetailsDto>(`/cards/id/${cardId}`, {
    method: "GET",
  });
}

export async function fetchCardPriceHistory(
  cardId: number,
  range: CardPriceHistoryRange,
) {
  return apiFetch<CardPriceHistoryResponse>(
    `/market/cards/${cardId}/price-history?range=${encodeURIComponent(range)}`,
    {
      method: "GET",
    },
  );
}
