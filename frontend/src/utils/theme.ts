import {
  readAppSettings,
  subscribeAppSettings,
  type ThemeMode,
} from "./appSettings";

export type ResolvedTheme = "light" | "dark";

const DARK_THEME_COLOR = "#070a12";
const LIGHT_THEME_COLOR = "#f4eddf";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function resolveTheme(mode: ThemeMode = readAppSettings().themeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

function setMetaContent(selector: string, content: string) {
  const node = document.querySelector<HTMLMetaElement>(selector);
  if (node) node.content = content;
}

export function applyTheme(mode: ThemeMode = readAppSettings().themeMode) {
  if (typeof document === "undefined") return;

  const resolvedTheme = resolveTheme(mode);
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = mode;
  root.style.colorScheme = resolvedTheme;

  setMetaContent(
    'meta[name="theme-color"]',
    resolvedTheme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR,
  );
  setMetaContent(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
    resolvedTheme === "light" ? "default" : "black-translucent",
  );
}

export function installThemeSync() {
  applyTheme();

  const media = window.matchMedia?.("(prefers-color-scheme: light)");
  const onSystemChange = () => {
    if (readAppSettings().themeMode === "system") applyTheme("system");
  };
  const unsubscribeSettings = subscribeAppSettings(() => applyTheme());

  media?.addEventListener?.("change", onSystemChange);

  return () => {
    unsubscribeSettings();
    media?.removeEventListener?.("change", onSystemChange);
  };
}
