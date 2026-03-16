export type AppSettings = {
  skipOpeningAnimations: boolean;
  autoFlipCards: boolean;
  fastReveal: boolean;
  disableHoloEffects: boolean;
  showDuplicatesCounter: boolean;
  compactCollectionGrid: boolean;
  hideMissingCards: boolean;
  autoHighlightNewCards: boolean;
  showDropRates: boolean;
  confirmPurchases: boolean;
};

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  skipOpeningAnimations: false,
  autoFlipCards: false,
  fastReveal: false,
  disableHoloEffects: false,
  showDuplicatesCounter: true,
  compactCollectionGrid: false,
  hideMissingCards: false,
  autoHighlightNewCards: true,
  showDropRates: true,
  confirmPurchases: true,
};

const SETTINGS_STORAGE_KEY = "wankul_app_settings";
export const LAST_NEW_CARD_IDS_STORAGE_KEY = "wankul_last_new_card_ids";
export const SETTINGS_CHANGED_EVENT = "wankul:settings-changed";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readAppSettings(): AppSettings {
  if (!isBrowser()) return { ...APP_SETTINGS_DEFAULTS };

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...APP_SETTINGS_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...APP_SETTINGS_DEFAULTS,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
  } catch {
    return { ...APP_SETTINGS_DEFAULTS };
  }
}

export function writeAppSettings(next: Partial<AppSettings>) {
  if (!isBrowser()) return;
  const merged = { ...readAppSettings(), ...next };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  localStorage.setItem("wankul_skip_opening_animations", merged.skipOpeningAnimations ? "1" : "0");
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: merged }));
}

export function subscribeAppSettings(callback: () => void) {
  if (!isBrowser()) return () => {};

  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === SETTINGS_STORAGE_KEY || e.key === "wankul_skip_opening_animations") callback();
  };
  const onCustom = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener(SETTINGS_CHANGED_EVENT, onCustom as EventListener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SETTINGS_CHANGED_EVENT, onCustom as EventListener);
  };
}

export function readLastNewCardIds(): number[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(LAST_NEW_CARD_IDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  } catch {
    return [];
  }
}

export function writeLastNewCardIds(ids: Array<number | string>) {
  if (!isBrowser()) return;
  const normalized = ids.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  localStorage.setItem(LAST_NEW_CARD_IDS_STORAGE_KEY, JSON.stringify(normalized));
}
