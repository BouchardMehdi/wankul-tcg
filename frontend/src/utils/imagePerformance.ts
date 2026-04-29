type PreloadPriority = "high" | "low" | "auto";

type PreloadOptions = {
  concurrency?: number;
  limit?: number;
  priority?: PreloadPriority;
  timeoutMs?: number;
};

type ResolveImageUrl = (url?: string | null) => string;

function uniqueUrls(urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.map((url) => (url ?? "").trim()).filter(Boolean)));
}

export function isDataSaverEnabled() {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as any).connection;
  return Boolean(connection?.saveData);
}

export function isSlowConnection() {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as any).connection;
  const effectiveType = String(connection?.effectiveType ?? "");
  return effectiveType === "slow-2g" || effectiveType === "2g";
}

export function shouldAvoidAggressiveImagePreload() {
  return isDataSaverEnabled() || isSlowConnection();
}

export function runWhenIdle(callback: () => void, timeout = 1200) {
  if (typeof window === "undefined") return () => {};

  const requestIdle = (window as any).requestIdleCallback;
  const cancelIdle = (window as any).cancelIdleCallback;

  if (typeof requestIdle === "function") {
    const id = requestIdle(callback, { timeout });
    return () => {
      if (typeof cancelIdle === "function") cancelIdle(id);
    };
  }

  const id = window.setTimeout(callback, Math.min(timeout, 300));
  return () => window.clearTimeout(id);
}

function loadImage(url: string, priority: PreloadPriority, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ok);
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    (img as any).fetchPriority = priority;
    img.decoding = "async";
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(() => finish(true)).catch(() => finish(true));
      } else {
        finish(true);
      }
    };
    img.onerror = () => finish(false);
    img.src = url;
  });
}

export async function preloadImages(urls: string[], options: PreloadOptions = {}) {
  if (typeof window === "undefined") return { loaded: 0, failed: 0, total: 0 };
  if (shouldAvoidAggressiveImagePreload() && options.priority !== "high") {
    return { loaded: 0, failed: 0, total: 0 };
  }

  const limit = Math.max(0, options.limit ?? urls.length);
  const queue = uniqueUrls(urls).slice(0, limit);
  const total = queue.length;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, 6));
  const priority = options.priority ?? "low";
  const timeoutMs = Math.max(400, options.timeoutMs ?? 2500);

  let cursor = 0;
  let loaded = 0;
  let failed = 0;

  async function worker() {
    while (cursor < queue.length) {
      const url = queue[cursor];
      cursor += 1;
      const ok = await loadImage(url, priority, timeoutMs);
      if (ok) loaded += 1;
      else failed += 1;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
  return { loaded, failed, total };
}

export function resolveImageAssetUrl(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const rawBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const assetBase = rawBase.replace(/\/api\/?$/, "");
  if (url.startsWith("/")) return `${assetBase}${url}`;
  return `${assetBase}/${url}`;
}

function collectCardsFromOpeningResult(result: any) {
  const cards: any[] = [];

  if (Array.isArray(result?.cards)) {
    cards.push(...result.cards);
  }

  if (Array.isArray(result?.boosters)) {
    for (const booster of result.boosters) {
      if (Array.isArray(booster)) {
        cards.push(...booster);
      } else if (Array.isArray(booster?.cards)) {
        cards.push(...booster.cards);
      }
    }
  }

  return cards;
}

export function collectOpeningCardImageUrls(result: any, resolveUrl: ResolveImageUrl = resolveImageAssetUrl) {
  return uniqueUrls(
    collectCardsFromOpeningResult(result).map((card) =>
      resolveUrl(card?.imageUrl ?? card?.image ?? card?.img ?? ""),
    ),
  );
}

export function collectCardImageUrls(cards: any[], resolveUrl: ResolveImageUrl = resolveImageAssetUrl) {
  return uniqueUrls(
    cards.map((card) =>
      resolveUrl(
        card?.imageUrl ??
          card?.image ??
          card?.img ??
          card?.card?.imageUrl ??
          card?.card?.image ??
          "",
      ),
    ),
  );
}
