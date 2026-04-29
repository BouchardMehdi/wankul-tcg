import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { fetchOwnedCollection } from "../api/collection";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";
import {
  collectCardImageUrls,
  runWhenIdle,
  shouldAvoidAggressiveImagePreload,
} from "../utils/imagePerformance";
import { isPwaCacheSupported, warmCardImageCache } from "../utils/pwaCache";

const AUTO_CACHE_KEY = "wankul_pwa_auto_card_cache_at";
const AUTO_CACHE_INTERVAL_MS = 12 * 60 * 60 * 1000;

function getRarityWeight(rarity?: string | null) {
  const value = String(rarity ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (value.includes("ticket")) return 100;
  if (value.includes("booster gold")) return 90;
  if (value.includes("legendaire") && value.includes("or")) return 80;
  if (value.includes("legendaire") && value.includes("argent")) return 70;
  if (value.includes("legendaire") && value.includes("bronze")) return 60;
  if (value.includes("u2")) return 50;
  if (value.includes("u1")) return 40;
  if (value.includes("rare")) return 30;
  return 10;
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
    if (
      !isAuthenticated ||
      !autoCacheEnabled ||
      !isPwaCacheSupported() ||
      !navigator.onLine ||
      shouldAvoidAggressiveImagePreload()
    ) {
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
        const prioritizedCards = [...ownedRows]
          .sort((a, b) => {
            const rarityDiff = getRarityWeight(b.card.rarity) - getRarityWeight(a.card.rarity);
            if (rarityDiff !== 0) return rarityDiff;
            return Number(b.quantity ?? 0) - Number(a.quantity ?? 0);
          })
          .map((row) => row.card);

        const urls = collectCardImageUrls(prioritizedCards).slice(0, 160);

        if (urls.length > 0) {
          await warmCardImageCache(urls);
          localStorage.setItem(AUTO_CACHE_KEY, String(Date.now()));
        }
      } catch {
        // Silent by design: this is a comfort feature, never a blocking path.
      }
    }

    const cancelIdle = runWhenIdle(cacheOwnedCards, 1800);

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [autoCacheEnabled, isAuthenticated]);

  return null;
}
