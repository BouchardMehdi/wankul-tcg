import { apiFetch } from "./http";

export type PushPublicConfig = {
  enabled: boolean;
  publicKey: string | null;
};

export type PushNotificationPreferences = {
  saleRewardEnabled: boolean;
  freeOpeningsReadyEnabled: boolean;
  freeOpeningsSoonEnabled: boolean;
  freeOpeningsSoonMinutes: number;
  watchlistPriceAlertEnabled: boolean;
  staleListingAlertEnabled: boolean;
  staleListingHours: number;
  dailyMarketRecapEnabled: boolean;
};

export type PushWatchlistItem = {
  id: number;
  cardId: number;
  cardKey: string;
  cardName: string;
  rarity: string;
  targetPriceCredits: number;
  currentMarketPrice: number | null;
  targetReachedNotified: boolean;
  lastTriggeredAt: string | null;
  lastTriggeredPrice: number | null;
  createdAt: string;
  updatedAt: string;
};

export type BrowserPushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function getPushPublicConfig() {
  return apiFetch<PushPublicConfig>("/push/public-key", {
    method: "GET",
    auth: false,
  });
}

export async function getPushPreferences() {
  return apiFetch<PushNotificationPreferences>("/push/preferences", {
    method: "GET",
  });
}

export async function updatePushPreferences(
  patch: Partial<PushNotificationPreferences>,
) {
  return apiFetch<PushNotificationPreferences>("/push/preferences", {
    method: "PATCH",
    body: patch,
  });
}

export async function getPushWatchlist() {
  return apiFetch<PushWatchlistItem[]>("/push/watchlist", {
    method: "GET",
  });
}

export async function getPushWatchlistItem(cardId: number) {
  return apiFetch<PushWatchlistItem | null>(`/push/watchlist/card/${cardId}`, {
    method: "GET",
  });
}

export async function upsertPushWatchlistItem(
  cardId: number,
  targetPriceCredits: number,
) {
  return apiFetch<PushWatchlistItem>(`/push/watchlist/card/${cardId}`, {
    method: "PUT",
    body: { targetPriceCredits },
  });
}

export async function deletePushWatchlistItem(cardId: number) {
  return apiFetch<{ success: true; removed: number }>(
    `/push/watchlist/card/${cardId}`,
    {
      method: "DELETE",
    },
  );
}

export async function savePushSubscription(
  subscription: BrowserPushSubscriptionPayload,
  token?: string | null,
) {
  return apiFetch("/push/subscriptions", {
    method: "POST",
    body: subscription,
    token,
  });
}

export async function deletePushSubscription(
  endpoint: string,
  token?: string | null,
) {
  return apiFetch("/push/subscriptions", {
    method: "DELETE",
    body: { endpoint },
    token,
  });
}
