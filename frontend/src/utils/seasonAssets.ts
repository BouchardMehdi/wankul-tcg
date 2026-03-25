const boosterImageModules = import.meta.glob(
  [
    "../assets/boosters/season-*/booster.png",
    "../assets/boosters/season-*/booster.jpg",
    "../assets/boosters/season-*/booster.jpeg",
    "../assets/boosters/season-*/booster.webp",
    "../assets/boosters/season-*/booster.avif",
    "../assets/boosters/season-*/booster.svg",
  ],
  {
    eager: true,
    import: "default",
  }
) as Record<string, string>;

const displayImageModules = import.meta.glob(
  [
    "../assets/boosters/season-*/display.png",
    "../assets/boosters/season-*/display.jpg",
    "../assets/boosters/season-*/display.jpeg",
    "../assets/boosters/season-*/display.webp",
    "../assets/boosters/season-*/display.avif",
    "../assets/boosters/season-*/display.svg",
  ],
  {
    eager: true,
    import: "default",
  }
) as Record<string, string>;

function extractSeasonNumber(path: string): number | null {
  const match = path.match(/season-(\d+)\//i);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function buildSeasonMap(modules: Record<string, string>) {
  const map = new Map<number, string>();

  for (const [path, assetUrl] of Object.entries(modules)) {
    const seasonNumber = extractSeasonNumber(path);
    if (!seasonNumber) continue;

    if (!map.has(seasonNumber)) {
      map.set(seasonNumber, assetUrl);
    }
  }

  return map;
}

const boosterMap = buildSeasonMap(boosterImageModules);
const displayMap = buildSeasonMap(displayImageModules);

function getFirstAvailable(map: Map<number, string>) {
  const first = Array.from(map.entries()).sort((a, b) => a[0] - b[0])[0];
  return first?.[1] ?? "";
}

const firstBoosterFallback = getFirstAvailable(boosterMap);
const firstDisplayFallback = getFirstAvailable(displayMap);

export function getSeasonBoosterImage(seasonNumber?: number | null) {
  if (!seasonNumber) return firstBoosterFallback;
  return boosterMap.get(seasonNumber) ?? firstBoosterFallback;
}

export function getSeasonDisplayImage(seasonNumber?: number | null) {
  if (!seasonNumber) return firstDisplayFallback;
  return displayMap.get(seasonNumber) ?? firstDisplayFallback;
}

export function hasSeasonBoosterImage(seasonNumber?: number | null) {
  if (!seasonNumber) return false;
  return boosterMap.has(seasonNumber);
}

export function hasSeasonDisplayImage(seasonNumber?: number | null) {
  if (!seasonNumber) return false;
  return displayMap.has(seasonNumber);
}

export function getLoadedSeasonAssetDebug() {
  return {
    boosters: Object.fromEntries(boosterMap),
    displays: Object.fromEntries(displayMap),
  };
}