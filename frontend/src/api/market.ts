import { apiFetch } from "./http";

export type MarketListingMode = "UNIT" | "LOT";
export type MarketOfferType =
  | "CREDITS_ONLY"
  | "CARD_ONLY"
  | "CARD_AND_CREDITS";

export type MarketPricePosition =
  | "BELOW_MARKET"
  | "AT_MARKET"
  | "ABOVE_MARKET"
  | "NOT_COMPARABLE";

export type MarketPriceHistoryRange = "2H" | "7D" | "1M" | "6M" | "1Y";

export type MarketPriceHistoryPoint = {
  timestamp: string;
  price: number;
};

export type MarketPriceHistoryResponse = {
  cardId: number;
  range: MarketPriceHistoryRange;
  points: MarketPriceHistoryPoint[];
};

export type SellableCardRow = {
  cardId: number;
  cardKey: string;
  cardName: string;
  rarity: string;
  season?: string | null;
  type?: string | null;
  artist?: string | null;
  totalQuantity: number;
  quantityLocked: number;
  quantityAvailable: number;
  keptQuantity: number;
  sellableQuantity: number;
  marketPrice: number;
  quickSellUnitPrice: number;
  quickSellTotalPrice: number;
  canCreateUnitListing: boolean;
  canCreateLotListing: boolean;
};

export type MarketListingRow = {
  id: number;
  sellerId: number;
  sellerUsername: string;
  cardId: number;
  cardKey: string;
  cardName: string;
  rarity: string;
  season?: string | null;
  listingMode: MarketListingMode;
  offerType: MarketOfferType;
  quantity: number;
  remainingQuantity: number;
  priceCredits: number;
  wantedCardId: number | null;
  wantedCardKey: string | null;
  wantedCardName: string | null;
  wantedCardRarity: string | null;
  wantedCardQuantity: number;
  marketPriceSnapshot: number;
  wantedCardMarketPriceSnapshot: number;
  referenceListedValue: number;
  referenceRequestedValue: number;
  priceDifference: number;
  priceDifferencePercent: number | null;
  pricePosition: MarketPricePosition;
  status: "ACTIVE" | "SOLD" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type MarketTransactionRow = {
  id: number;
  listingId: number;
  role: "BUYER" | "SELLER" | "BOTH";
  sellerId: number;
  sellerUsername: string;
  buyerId: number;
  buyerUsername: string;
  cardId: number;
  cardKey: string;
  cardName: string;
  rarity: string;
  listingMode: MarketListingMode;
  offerType: MarketOfferType;
  quantity: number;
  unitPriceCredits: number;
  totalPriceCredits: number;
  buyerOfferedCardId: number | null;
  buyerOfferedCardKey: string | null;
  buyerOfferedCardName: string | null;
  buyerOfferedCardRarity: string | null;
  buyerOfferedCardQuantity: number;
  transactionType:
    | "CREDITS_SALE"
    | "CARD_TRADE"
    | "CARD_AND_CREDITS_TRADE";
  sellerRewardClaimedAt: string | null;
  sellerRewardClaimed: boolean;
  pendingRewardCredits: number;
  pendingRewardCardId: number | null;
  pendingRewardCardName: string | null;
  pendingRewardCardQuantity: number;
  createdAt: string;
};

export type CreateListingInput = {
  cardId: number;
  quantity: number;
  listingMode: MarketListingMode;
  offerType: MarketOfferType;
  priceCredits: number;
  wantedCardId?: number;
  wantedCardQuantity?: number;
};

export type BuyListingInput = {
  quantity: number;
  offeredCardId?: number;
};

export type GetListingsParams = {
  search?: string;
  rarity?: string;
  season?: string;
  listingMode?: MarketListingMode | "";
  offerType?: MarketOfferType | "";
  minPrice?: number | "";
  maxPrice?: number | "";
  sortBy?:
    | "createdAt"
    | "priceCredits"
    | "marketPriceSnapshot"
    | "rarity"
    | "cardName";
  sortOrder?: "ASC" | "DESC";
  limit?: number;
};

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      Number.isNaN(value)
    ) {
      return;
    }
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getMySellableCards(): Promise<SellableCardRow[]> {
  return apiFetch("/market/me/sellable-cards", {
    method: "GET",
  });
}

export async function getMarketListings(
  params: GetListingsParams = {},
): Promise<MarketListingRow[]> {
  return apiFetch(`/market/listings${buildQuery(params)}`, {
    method: "GET",
  });
}

export async function getMarketListingById(
  listingId: number,
): Promise<MarketListingRow> {
  return apiFetch(`/market/listings/${listingId}`, {
    method: "GET",
  });
}

export async function getMyMarketListings(): Promise<MarketListingRow[]> {
  return apiFetch("/market/listings/me", {
    method: "GET",
  });
}

export async function createMarketListing(input: CreateListingInput) {
  return apiFetch("/market/listings", {
    method: "POST",
    body: input,
  });
}

export async function buyMarketListing(
  listingId: number,
  input: BuyListingInput,
) {
  return apiFetch(`/market/listings/${listingId}/buy`, {
    method: "POST",
    body: input,
  });
}

export async function cancelMarketListing(listingId: number) {
  return apiFetch(`/market/listings/${listingId}/cancel`, {
    method: "POST",
  });
}

export async function claimMarketTransactionReward(transactionId: number) {
  return apiFetch(`/market/transactions/${transactionId}/claim`, {
    method: "POST",
  });
}

export async function quickSellCard(cardId: number, quantity: number) {
  return apiFetch("/market/quick-sell", {
    method: "POST",
    body: { cardId, quantity },
  });
}

export async function getMyMarketTransactions(): Promise<MarketTransactionRow[]> {
  return apiFetch("/market/transactions/me", {
    method: "GET",
  });
}

export async function getMyMarketPurchases(): Promise<MarketTransactionRow[]> {
  return apiFetch("/market/transactions/me/purchases", {
    method: "GET",
  });
}

export async function getMyMarketSales(): Promise<MarketTransactionRow[]> {
  return apiFetch("/market/transactions/me/sales", {
    method: "GET",
  });
}

export async function getMarketCardPriceHistory(
  cardId: number,
  range: MarketPriceHistoryRange,
): Promise<MarketPriceHistoryResponse> {
  return apiFetch(
    `/market/cards/${cardId}/price-history${buildQuery({ range })}`,
    {
      method: "GET",
    },
  );
}