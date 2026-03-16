export type CollectionLayout = "standard" | "compact" | "large";

export type AppSettings = {
  skipOpeningAnimations: boolean;
  autoFlipCards: boolean;
  fastReveal: boolean;
  disableHoloEffects: boolean;
  showDuplicatesCounter: boolean;
  collectionLayout: CollectionLayout;
  hideMissingCards: boolean;
  autoHighlightNewCards: boolean;
  showDropRates: boolean;
  confirmPurchases: boolean;

  /**
   * Compat ancienne version.
   * Laisse cette clé pour éviter de casser d'anciens appels éventuels.
   */
  compactCollectionGrid?: boolean;
};

const APP_SETTINGS_KEY = "wankul_app_settings";
const LAST_NEW_CARD_IDS_KEY = "wankul_last_new_card_ids";

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  skipOpeningAnimations: false,
  autoFlipCards: false,
  fastReveal: false,
  disableHoloEffects: false,
  showDuplicatesCounter: true,
  collectionLayout: "standard",
  hideMissingCards: false,
  autoHighlightNewCards: true,
  showDropRates: true,
  confirmPurchases: true,
  compactCollectionGrid: false,
};

function normalizeLayout(value: unknown): CollectionLayout {
  if (value === "compact" || value === "large" || value === "standard") return value;
  return "standard";
}

function migrateSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const base = { ...APP_SETTINGS_DEFAULTS, ...(raw ?? {}) };

  if (!("collectionLayout" in (raw ?? {})) && typeof raw?.compactCollectionGrid === "boolean") {
    base.collectionLayout = raw.compactCollectionGrid ? "compact" : "standard";
  }

  base.collectionLayout = normalizeLayout(base.collectionLayout);
  base.compactCollectionGrid = base.collectionLayout === "compact";

  return base;
}

export function readAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return { ...APP_SETTINGS_DEFAULTS };
    return migrateSettings(JSON.parse(raw));
  } catch {
    return { ...APP_SETTINGS_DEFAULTS };
  }
}

export function writeAppSettings(patch: Partial<AppSettings>) {
  const current = readAppSettings();
  const merged = migrateSettings({ ...current, ...patch });

  if ("compactCollectionGrid" in patch && !("collectionLayout" in patch)) {
    merged.collectionLayout = patch.compactCollectionGrid ? "compact" : "standard";
  }

  merged.compactCollectionGrid = merged.collectionLayout === "compact";
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent("wankul:settings-changed"));
}

export function subscribeAppSettings(callback: () => void) {
  const onChange = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === APP_SETTINGS_KEY || e.key === null) callback();
  };

  window.addEventListener("wankul:settings-changed", onChange as EventListener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("wankul:settings-changed", onChange as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}

export function readLastNewCardIds(): number[] {
  try {
    const raw = localStorage.getItem(LAST_NEW_CARD_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
  } catch {
    return [];
  }
}

export function writeLastNewCardIds(ids: Array<number | string>) {
  const normalized = Array.from(
    new Set(
      ids
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v)),
    ),
  );
  localStorage.setItem(LAST_NEW_CARD_IDS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("wankul:last-new-cards-changed"));
}
