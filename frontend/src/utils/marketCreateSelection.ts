const STORAGE_KEY = "marketCreateSelectedCardId";

export function saveMarketCreateSelectedCardId(cardId: number) {
  sessionStorage.setItem(STORAGE_KEY, String(cardId));
}

export function readMarketCreateSelectedCardId(): number | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function clearMarketCreateSelectedCardId() {
  sessionStorage.removeItem(STORAGE_KEY);
}