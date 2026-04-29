import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { fetchOwnedCollection } from "../api/collection";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";
import { isPwaCacheSupported, warmCardImageCache } from "../utils/pwaCache";

const AUTO_CACHE_KEY = "wankul_pwa_auto_card_cache_at";
const AUTO_CACHE_INTERVAL_MS = 12 * 60 * 60 * 1000;

function getApiOrigin() {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  return raw.replace(/\/api\/?$/, "");
}

function toAbsoluteAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${getApiOrigin()}${url}`;
}

export default function PwaCacheManager() {
  const { isAuthenticated } = useAuth();
  const [autoCacheEnabled, setAutoCacheEnabled] = useState(
    () => readAppSettings().pwaAutoCacheCardImages,
  );

  useEffect(
    () =>
      subscribeAppSettings(() => {
        setAutoCacheEnabled(readAppSettings().pwaAutoCacheCardImages);
      }),
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || !autoCacheEnabled || !isPwaCacheSupported() || !navigator.onLine) {
      return;
    }

    const lastRun = Number(localStorage.getItem(AUTO_CACHE_KEY) ?? "0");
    if (Date.now() - lastRun < AUTO_CACHE_INTERVAL_MS) {
      return;
    }

    let cancelled = false;

    async function cacheOwnedCards() {
      try {
        const ownedRows = await fetchOwnedCollection();
        if (cancelled) return;
        const urls = ownedRows
          .map((row) => toAbsoluteAssetUrl(row.card.imageUrl))
          .filter(Boolean)
          .slice(0, 180);

        if (urls.length > 0) {
          await warmCardImageCache(urls);
          localStorage.setItem(AUTO_CACHE_KEY, String(Date.now()));
        }
      } catch {
        // Silent by design: this is a comfort feature, never a blocking path.
      }
    }

    cacheOwnedCards();

    return () => {
      cancelled = true;
    };
  }, [autoCacheEnabled, isAuthenticated]);

  return null;
}
