import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Dashboard.css";
import "../styles/Opening.css";

import AppNavbar from "../components/AppNavbar";
import SmartImage from "../components/SmartImage";

import { useAuth } from "../auth/AuthContext";
import { getEconomyMe, type EconomySnapshot } from "../api/economy";
import { openBooster, openDisplay } from "../api/booster";
import { readAppSettings, subscribeAppSettings, writeLastNewCardIds } from "../utils/appSettings";
import {
  collectOpeningCardImageUrls,
  preloadImages,
  runWhenIdle,
} from "../utils/imagePerformance";
import { warmCardImageCache } from "../utils/pwaCache";
import { playOpeningRevealSound, playSoundEffect, primeSound } from "../utils/sound";
import { getSeasonBoosterImage, getSeasonDisplayImage } from "../utils/seasonAssets";

const API_BASE_RAW: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const API_BASE = API_BASE_RAW.replace(/\/api\/?$/, "");

const CARD_BACK = new URL("../assets/wankul_back.webp", import.meta.url).href;
const GOLD_BOOSTER_IMG = new URL("../assets/boosters/booster_gold.png", import.meta.url).href;

type OpeningStatePayload = {
  kind: "booster" | "display";
  season: string;
  seasonNumber?: number;
  result: any;
  replay?: boolean;
  openedAt?: string;
  historyId?: number;
};

type Phase =
  | "idle"
  | "display-intro"
  | "opening"
  | "reveal"
  | "summary"
  | "display-final-summary";

function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeRarity(raw?: string | null) {
  const s0 = (raw ?? "").toString();

  const m = s0.match(/\((u1|u2)\)/i);
  if (m?.[1]) return m[1].toLowerCase();

  const s = s0
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (s.includes("starter")) return "starter";
  if (s.includes("gagnant") && s.includes("ticket")) return "gold-ticket-winner";
  if (s.includes("ticket")) return "gold-ticket";
  if (s.includes("u1") || s.includes("ultra rare u1") || s.includes("ultra rare 1")) return "u1";
  if (s.includes("u2") || s.includes("ultra rare u2") || s.includes("ultra rare 2")) return "u2";
  if (s.includes("commune") && s.includes("peu")) return "uncommon";
  if (s === "commune" || s.includes(" commune")) return "common";
  if (s === "rare" || s.startsWith("rare ")) return "rare";
  if (s.includes("terrain")) return "terrain";

  const isLegendary = s.includes("legendaire") || s.includes("legendary");
  if (isLegendary && s.includes("bronze")) return "leg-bronze";
  if (isLegendary && (s.includes("argent") || s.includes("silver"))) return "leg-silver";
  if (isLegendary && (s.includes("or") || s.includes("gold") || s.includes("doree"))) return "leg-gold";

  return "";
}

function boosterSummaryRank(card: any) {
  const key = normalizeRarity(card?.rarity ?? "");
  switch (key) {
    case "common":
      return 1;
    case "uncommon":
      return 2;
    case "rare":
      return 3;
    case "u1":
      return 4;
    case "u2":
      return 5;
    case "leg-bronze":
      return 6;
    case "leg-silver":
      return 7;
    case "leg-gold":
      return 8;
    case "gold-ticket-winner":
      return 9;
    case "gold-ticket":
      return 10;
    default:
      return 999;
  }
}

function displaySummaryRank(card: any) {
  const key = normalizeRarity(card?.rarity ?? "");
  switch (key) {
    case "leg-gold":
      return 8;
    case "leg-silver":
      return 7;
    case "leg-bronze":
      return 6;
    case "u2":
      return 5;
    case "u1":
      return 4;
    case "gold-ticket-winner":
      return 3;
    case "gold-ticket":
      return 2;
    default:
      return 0;
  }
}

function isRareForFx(rarityKey: string) {
  return [
    "u1",
    "u2",
    "leg-bronze",
    "leg-silver",
    "leg-gold",
    "gold-ticket-winner",
    "gold-ticket",
  ].includes(rarityKey);
}

function isRareOrBetter(card: any) {
  return isRareForFx(normalizeRarity(card?.rarity ?? ""));
}

function getRarityHitLabel(rarityKey: string) {
  switch (rarityKey) {
    case "u1":
      return "U1";
    case "u2":
      return "U2";
    case "leg-bronze":
      return "Legendaire bronze";
    case "leg-silver":
      return "Legendaire argent";
    case "leg-gold":
      return "Legendaire or";
    case "gold-ticket-winner":
      return "Ticket gagnant";
    case "gold-ticket":
      return "Ticket d'or";
    default:
      return "Gros hit";
  }
}

function getCardIdentity(card: any, fallback: number) {
  return card?.id ?? card?.cardId ?? card?.key ?? fallback;
}

function formatOpeningDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const MARKET_RARITY_BASE_VALUES: Record<string, number> = {
  Terrain: 4,
  Commune: 8,
  "Peu commune": 14,
  Rare: 32,
  U1: 70,
  U2: 110,
  "Ultra Rare (U1)": 70,
  "Ultra Rare (U2)": 110,
  "Légendaire bronze": 180,
  "Légendaire argent": 320,
  "Légendaire or": 520,
  "Légendaire dorée": 520,
  "Booster Gold": 700,
  "Ticket d'or": 1800,
  "Gagnant ticket d'or": 4500,
  "Carte spéciale": 220,
};

const DEFAULT_MARKET_BASE_VALUE = 20;

const ECON_RATES = {
  duplicateFromMarket: 0.25,
  newFromMarket: 1.35,
};

function normalizeEconomyRarity(rarity?: string | null) {
  const raw = String(rarity ?? "").trim();

  switch (raw) {
    case "Ultra Rare (U1)":
      return "U1";
    case "Ultra Rare (U2)":
      return "U2";
    case "Légendaire dorée":
      return "Légendaire dorée";
    default:
      return raw;
  }
}

function getMarketBaseValueForRarity(rarity?: string | null) {
  const key = normalizeEconomyRarity(rarity);
  return MARKET_RARITY_BASE_VALUES[key] ?? DEFAULT_MARKET_BASE_VALUE;
}

function fallbackCardCredits(card: any, isNew: boolean) {
  const rarity = normalizeEconomyRarity(card?.rarity ?? "");

  if (rarity === "Terrain") return isNew ? 6 : 0;
  if (rarity === "Ticket d'or") return 0;

  const marketBase = getMarketBaseValueForRarity(rarity);

  if (isNew) {
    return Math.max(0, Math.floor(marketBase * ECON_RATES.newFromMarket));
  }

  return Math.max(0, Math.floor(marketBase * ECON_RATES.duplicateFromMarket));
}

function extractCreditsTotal(result: any): number | null {
  const candidates = [
    result?.creditsEarned,
    result?.creditsEarnedTotal,
    result?.creditsGained,
    result?.totalCredits,
    result?.breakdown?.total,
    result?.credits?.total,
    result?.creditBreakdown?.total,
    result?.economy?.earned,
    result?.economy?.earnedCredits,
    result?.economy?.creditsEarned,
    result?.economy?.totalEarned,
    result?.credits?.display?.total,
  ];

  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function extractPerCardCredits(result: any, cards: any[]): Map<string | number, number> {
  const m = new Map<string | number, number>();

  for (const c of cards) {
    const id = c?.id ?? c?.cardId ?? c?.key ?? null;
    const v = c?.earnedCredits ?? c?.creditsEarned ?? c?.credits ?? null;
    if (id != null && typeof v === "number" && Number.isFinite(v)) m.set(id, v);
  }

  const cardCredits = result?.cardCredits;
  if (Array.isArray(cardCredits) && cardCredits.length && typeof cardCredits[0] === "object") {
    for (const row of cardCredits) {
      const id = row?.cardId ?? row?.id;
      const v = row?.credits ?? row?.earnedCredits ?? row?.value;
      if (id != null && typeof v === "number" && Number.isFinite(v)) m.set(id, v);
    }
  }

  if (Array.isArray(cardCredits) && cardCredits.length && typeof cardCredits[0] === "number") {
    for (let i = 0; i < Math.min(cardCredits.length, cards.length); i++) {
      const c = cards[i];
      const id = c?.id ?? c?.cardId ?? c?.key ?? i;
      const v = cardCredits[i];
      if (typeof v === "number" && Number.isFinite(v)) m.set(id, v);
    }
  }

  return m;
}

function extractNewCardIds(result: any): Set<number | string> {
  const s = new Set<number | string>();

  const candidates = [result?.newCardIds, result?.newCards, result?.unlockedCardIds, result?.unlockedCards];
  for (const v of candidates) {
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "number" || typeof x === "string") s.add(x);
        if (typeof x === "object" && (typeof x?.id === "number" || typeof x?.id === "string")) s.add(x.id);
      }
    }
  }

  const cards = result?.cards;
  if (Array.isArray(cards)) {
    for (const c of cards) {
      if (c?.isNew && (typeof c?.id === "number" || typeof c?.id === "string")) s.add(c.id);
    }
  }

  return s;
}

function dedupeCards(cards: any[]) {
  const seen = new Set<string | number>();
  const out: any[] = [];

  for (const c of cards) {
    const id = c?.id ?? c?.cardId ?? c?.key;
    if (id == null) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(c);
  }

  return out;
}

export default function Opening() {
  const navigate = useNavigate();
  const { refreshWallet } = useAuth();
  const location = useLocation() as any;
  const state = (location?.state ?? null) as OpeningStatePayload | null;

  const [eco, setEco] = useState<EconomySnapshot | null>(null);
  const [loadingEco, setLoadingEco] = useState(true);

  const [phase, setPhase] = useState<Phase>("idle");
  const [openingLock, setOpeningLock] = useState(false);

  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);

  const [displayBoosters, setDisplayBoosters] = useState<any[][]>([]);
  const [displayBoosterIndex, setDisplayBoosterIndex] = useState(0);
  const [displayStarted, setDisplayStarted] = useState(false);

  const [creditsTotal, setCreditsTotal] = useState<number | null>(null);
  const [perCardCredits, setPerCardCredits] = useState<Map<string | number, number>>(new Map());
  const [newCardIds, setNewCardIds] = useState<Set<string | number>>(new Set());

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyOut, setFlyOut] = useState(false);
  const [throwX, setThrowX] = useState(0);
  const [throwRot, setThrowRot] = useState(0);
  const [throwMs, setThrowMs] = useState(280);
  const [animatingNext, setAnimatingNext] = useState(false);
  const [settings, setSettings] = useState(() => readAppSettings());

  const skipAnimations = settings.skipOpeningAnimations;

  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const lastMoveTRef = useRef(0);
  const velocityRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const revealedSoundKeyRef = useRef("");

  const season = state?.season ?? "Saison inconnue";
  const stateSeasonNumber =
    typeof state?.seasonNumber === "number" && Number.isFinite(state.seasonNumber)
      ? state.seasonNumber
      : null;
  const resultSeasonNumber =
    typeof state?.result?.seasonNumber === "number" && Number.isFinite(state.result.seasonNumber)
      ? state.result.seasonNumber
      : null;
  const activeSeasonNumber = resultSeasonNumber ?? stateSeasonNumber ?? 1;

  const isDisplayMode = state?.kind === "display";
  const isReplayMode = Boolean(state?.replay);
  const replayDate = formatOpeningDate(state?.openedAt ?? null);

  const displayMeta = state?.result?.meta ?? null;
  const goldIndex: number | null =
    typeof displayMeta?.goldIndex === "number" ? displayMeta.goldIndex : null;
  const currentDisplayBoosterIsGold =
    isDisplayMode && goldIndex !== null && displayBoosterIndex === goldIndex;

  const defaultBoosterImg = getSeasonBoosterImage(activeSeasonNumber);
  const displayImg = getSeasonDisplayImage(activeSeasonNumber);

  const currentPackImg = currentDisplayBoosterIsGold ? GOLD_BOOSTER_IMG : defaultBoosterImg;
  const remainingPillImg = currentDisplayBoosterIsGold ? GOLD_BOOSTER_IMG : defaultBoosterImg;
  const revealIntroMs = settings.fastReveal ? 450 : 1100;
  const displayIntroMs = settings.fastReveal ? 800 : 1700;
  const autoFlipMs = settings.fastReveal ? 380 : 850;
  const openingCardImageUrls = useMemo(
    () => collectOpeningCardImageUrls(state?.result, resolveImg),
    [state?.result],
  );

  function queueTimeout(cb: () => void, ms: number) {
    const id = window.setTimeout(cb, ms);
    timeoutsRef.current.push(id);
    return id;
  }

  function clearQueuedTimeouts() {
    for (const id of timeoutsRef.current) window.clearTimeout(id);
    timeoutsRef.current = [];
  }

  function clearMotionState() {
    setDragX(0);
    setIsDragging(false);
    setFlyOut(false);
    setThrowX(0);
    setThrowRot(0);
    setThrowMs(280);
    setAnimatingNext(false);
    pointerIdRef.current = null;
    velocityRef.current = 0;
  }

  function isCardMarkedNew(card: any) {
    const id = card?.id ?? card?.cardId ?? null;
    return Boolean(card?.isNew) || (id != null && newCardIds.has(id));
  }

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  useEffect(() => {
    writeLastNewCardIds(Array.from(newCardIds));
  }, [newCardIds]);

  useEffect(() => {
    return () => clearQueuedTimeouts();
  }, []);

  useEffect(() => {
    if (!state?.season || !state?.result) {
      navigate("/booster", { replace: true });
      return;
    }

    clearQueuedTimeouts();

    const rawBoosters = Array.isArray(state.result?.boosters) ? state.result.boosters : [];
    const normalizedBoosters =
      rawBoosters.length > 0 && rawBoosters[0] && !Array.isArray(rawBoosters[0]) && Array.isArray(rawBoosters[0]?.cards)
        ? rawBoosters.map((b: any) => b.cards)
        : rawBoosters;

    const firstBoosterCards = Array.isArray(normalizedBoosters[0]) ? normalizedBoosters[0] : [];
    const boosterCards = Array.isArray(state.result?.cards) ? state.result.cards : [];

    setDisplayBoosters(normalizedBoosters);
    setDisplayBoosterIndex(0);
    setDisplayStarted(false);

    setCards(state.kind === "display" ? [] : boosterCards);
    setIndex(0);

    setCreditsTotal(extractCreditsTotal(state.result));
    setNewCardIds(extractNewCardIds(state.result));

    const flatCards =
      state.kind === "display"
        ? normalizedBoosters.flatMap((b: any) => (Array.isArray(b) ? b : []))
        : boosterCards;
    setPerCardCredits(extractPerCardCredits(state.result, flatCards));

    setOpeningLock(false);
    clearMotionState();

    if (state.kind === "display" && firstBoosterCards.length === 0) {
      navigate("/booster", { replace: true });
      return;
    }

    if (skipAnimations) {
      if (state.kind === "display") {
        setPhase("display-final-summary");
        setDisplayStarted(true);
      } else {
        setPhase("summary");
      }
    } else {
      setPhase("idle");
    }
  }, [state?.kind, state?.season, state?.seasonNumber, state?.result, navigate, skipAnimations]);

  useEffect(() => {
    if (openingCardImageUrls.length === 0) return;

    void preloadImages([currentPackImg, CARD_BACK, ...openingCardImageUrls.slice(0, 5)], {
      concurrency: 4,
      limit: 7,
      priority: "high",
      timeoutMs: 1600,
    });

    return runWhenIdle(() => {
      const cacheBudget = isDisplayMode ? 96 : 16;
      const preloadBudget = isDisplayMode ? 24 : 12;

      void warmCardImageCache(openingCardImageUrls.slice(0, cacheBudget)).catch(() => undefined);
      void preloadImages(openingCardImageUrls.slice(5, preloadBudget), {
        concurrency: 2,
        priority: "low",
        timeoutMs: 2200,
      });
    }, 900);
  }, [openingCardImageUrls, currentPackImg, isDisplayMode]);

  useEffect(() => {
    if (phase !== "reveal" || cards.length === 0) return;

    const nextUrls = collectOpeningCardImageUrls({ cards: cards.slice(index, index + 4) }, resolveImg);
    void preloadImages(nextUrls, {
      concurrency: 3,
      limit: 4,
      priority: "high",
      timeoutMs: 1400,
    });
  }, [cards, index, phase]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingEco(true);
        const snap = await getEconomyMe();
        setEco(snap);
      } finally {
        setLoadingEco(false);
      }
    })();
  }, []);

  useEffect(() => {
    const el = cardWrapRef.current;
    if (!el) return;
    el.style.setProperty("--hx", "50%");
    el.style.setProperty("--hy", "50%");
  }, [index, phase]);

  function updateRevealHoloPosition(clientX: number, clientY: number) {
    const el = cardWrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);

    el.style.setProperty("--hx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--hy", `${(y * 100).toFixed(1)}%`);
  }

  function handleHoloMove(e: React.MouseEvent) {
    if (settings.disableHoloEffects) return;
    updateRevealHoloPosition(e.clientX, e.clientY);
  }

  function handleHoloLeave() {
    if (settings.disableHoloEffects) return;
    const el = cardWrapRef.current;
    if (!el) return;
    el.style.setProperty("--hx", "50%");
    el.style.setProperty("--hy", "50%");
  }

  const total = cards.length;
  const current = cards[index] ?? null;

  const rarityKey = useMemo(() => normalizeRarity(current?.rarity ?? ""), [current?.rarity]);
  const isRare = useMemo(() => isRareForFx(rarityKey), [rarityKey]);
  const isSurprise11 = useMemo(() => index === 10, [index]);

  const currentId = current?.id ?? current?.cardId ?? current?.key ?? index;
  const isCurrentNew = isCardMarkedNew(current);

  useEffect(() => {
    if (phase !== "reveal" || !current) return;

    const revealKey = `${displayBoosterIndex}:${index}:${currentId}:${rarityKey}:${isSurprise11 ? "11" : "std"}`;
    if (revealedSoundKeyRef.current === revealKey) return;

    revealedSoundKeyRef.current = revealKey;
    playOpeningRevealSound({ rarityKey, isSurprise11, isNew: isCurrentNew });
  }, [phase, current, displayBoosterIndex, index, currentId, rarityKey, isSurprise11, isCurrentNew]);

  useEffect(() => {
    if (phase !== "reveal") {
      revealedSoundKeyRef.current = "";
    }
  }, [phase]);

  useEffect(() => {
    if (!settings.autoFlipCards) return;
    if (phase !== "reveal") return;
    if (animatingNext || isDragging) return;

    const id = window.setTimeout(() => {
      if (index >= total - 1) {
        setPhase("summary");
        return;
      }
      animateNext(1);
    }, autoFlipMs);

    return () => window.clearTimeout(id);
  }, [settings.autoFlipCards, phase, index, total, animatingNext, isDragging, autoFlipMs]);

  const currentCredits =
    perCardCredits.get(currentId) ??
    current?.earnedCredits ??
    current?.creditsEarned ??
    (current ? fallbackCardCredits(current, isCurrentNew) : null);

  function getCardCreditsValue(card: any, fallbackIndex: number) {
    const cid = getCardIdentity(card, fallbackIndex);
    const isNew = isCardMarkedNew(card);
    const cc =
      perCardCredits.get(cid) ??
      card?.earnedCredits ??
      card?.creditsEarned ??
      fallbackCardCredits(card, isNew);

    return typeof cc === "number" && Number.isFinite(cc) ? cc : 0;
  }

  const displayBoosterCount = displayBoosters.length;
  const remainingBoosters = Math.max(0, displayBoosterCount - displayBoosterIndex - 1);

  const currentBoosterCreditsTotal = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
      const isNew = isCardMarkedNew(c);
      const cc =
        perCardCredits.get(cid) ??
        c?.earnedCredits ??
        c?.creditsEarned ??
        fallbackCardCredits(c, isNew);

      sum += typeof cc === "number" && Number.isFinite(cc) ? cc : 0;
    }
    return sum;
  }, [cards, perCardCredits, newCardIds]);

  const sortedBoosterSummaryCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const byRarity = boosterSummaryRank(a) - boosterSummaryRank(b);
      if (byRarity !== 0) return byRarity;

      const aName = String(a?.name ?? "");
      const bName = String(b?.name ?? "");
      return aName.localeCompare(bName, "fr", { sensitivity: "base" });
    });
  }, [cards]);

  const computedTotalCredits = useMemo(() => {
    if (typeof creditsTotal === "number" && Number.isFinite(creditsTotal)) return creditsTotal;

    const sourceCards = isDisplayMode
      ? displayBoosters.flatMap((b) => (Array.isArray(b) ? b : []))
      : cards;

    let sum = 0;
    for (let i = 0; i < sourceCards.length; i++) {
      const c = sourceCards[i];
      const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
      const isNew = isCardMarkedNew(c);
      const cc =
        perCardCredits.get(cid) ??
        c?.earnedCredits ??
        c?.creditsEarned ??
        fallbackCardCredits(c, isNew);

      sum += typeof cc === "number" && Number.isFinite(cc) ? cc : 0;
    }
    return sum;
  }, [creditsTotal, isDisplayMode, displayBoosters, cards, perCardCredits, newCardIds]);

  const displaySummaryCards = useMemo(() => {
    if (!isDisplayMode) return [];

    const flat = displayBoosters.flatMap((b) => (Array.isArray(b) ? b : []));
    const selected = dedupeCards(flat.filter((c) => isCardMarkedNew(c) || isRareOrBetter(c)));

    return selected.sort((a, b) => {
      const aNew = isCardMarkedNew(a);
      const bNew = isCardMarkedNew(b);

      const aGroup = aNew ? 1 : 0;
      const bGroup = bNew ? 1 : 0;

      if (aGroup !== bGroup) return aGroup - bGroup;

      const byRarity = displaySummaryRank(b) - displaySummaryRank(a);
      if (byRarity !== 0) return byRarity;

      const aName = String(a?.name ?? "");
      const bName = String(b?.name ?? "");
      return aName.localeCompare(bName, "fr", { sensitivity: "base" });
    });
  }, [isDisplayMode, displayBoosters, newCardIds]);

  const boosterHighlightCards = useMemo(() => {
    const selected = dedupeCards(cards.filter((c) => isCardMarkedNew(c) || isRareOrBetter(c)));

    return selected
      .sort((a, b) => {
        const byNew = Number(isCardMarkedNew(b)) - Number(isCardMarkedNew(a));
        if (byNew !== 0) return byNew;

        const byRarity = boosterSummaryRank(b) - boosterSummaryRank(a);
        if (byRarity !== 0) return byRarity;

        return getCardCreditsValue(b, 0) - getCardCreditsValue(a, 0);
      })
      .slice(0, 5);
  }, [cards, newCardIds, perCardCredits]);

  const displayHighlightCards = useMemo(() => {
    const flat = displayBoosters.flatMap((b) => (Array.isArray(b) ? b : []));
    const selected = dedupeCards(flat.filter((c) => isCardMarkedNew(c) || isRareOrBetter(c)));

    return selected
      .sort((a, b) => {
        const byNew = Number(isCardMarkedNew(b)) - Number(isCardMarkedNew(a));
        if (byNew !== 0) return byNew;

        const byRarity = boosterSummaryRank(b) - boosterSummaryRank(a);
        if (byRarity !== 0) return byRarity;

        return getCardCreditsValue(b, 0) - getCardCreditsValue(a, 0);
      })
      .slice(0, 8);
  }, [displayBoosters, newCardIds, perCardCredits]);

  const currentSummaryStats = useMemo(() => {
    const uniqueNew = dedupeCards(cards.filter((c) => isCardMarkedNew(c))).length;
    const uniqueHits = dedupeCards(cards.filter((c) => isRareOrBetter(c))).length;

    return {
      cardsCount: cards.length,
      newCount: uniqueNew,
      hitCount: uniqueHits,
      totalValue: currentBoosterCreditsTotal,
    };
  }, [cards, currentBoosterCreditsTotal, newCardIds]);

  const displayFinalStats = useMemo(() => {
    const flat = displayBoosters.flatMap((b) => (Array.isArray(b) ? b : []));
    const uniqueNew = dedupeCards(flat.filter((c) => isCardMarkedNew(c))).length;
    const uniqueHits = dedupeCards(flat.filter((c) => isRareOrBetter(c))).length;

    return {
      cardsCount: flat.length,
      newCount: uniqueNew,
      hitCount: uniqueHits,
      totalValue: computedTotalCredits,
    };
  }, [displayBoosters, computedTotalCredits, newCardIds]);

  const openAnotherLabel = useMemo(() => {
    const free = (eco?.freeBoosterCharges ?? 0) > 0;
    if (free) return "Ouvrir un autre";
    const price = eco?.costs?.booster;
    if (typeof price === "number") return `Ouvrir un autre • ${price} crédits`;
    return "Ouvrir un autre";
  }, [eco?.freeBoosterCharges, eco?.costs?.booster]);

  const openAnotherDisplayLabel = useMemo(() => {
    const free = (eco?.freeDisplayCharges ?? 0) > 0;
    if (free) return "Ouvrir une autre display";
    const price = eco?.costs?.display;
    if (typeof price === "number") return `Ouvrir une autre display • ${price} crédits`;
    return "Ouvrir une autre display";
  }, [eco?.freeDisplayCharges, eco?.costs?.display]);

  const dragRot = useMemo(() => clamp(dragX * 0.06, -14, 14), [dragX]);

  function beginRevealSequence(boosterCards: any[]) {
    setCards(Array.isArray(boosterCards) ? boosterCards : []);
    setIndex(0);
    clearMotionState();
    setPhase("opening");

    queueTimeout(() => {
      setPhase("reveal");
      setOpeningLock(false);
    }, revealIntroMs);
  }

  function startOpening() {
    if (openingLock) return;
    void primeSound();

    clearQueuedTimeouts();
    setOpeningLock(true);

    if (skipAnimations) {
      playSoundEffect(isDisplayMode ? "opening.start-display" : "opening.start-booster");
      if (isDisplayMode) {
        setDisplayStarted(true);
        setPhase("display-final-summary");
      } else {
        setPhase("summary");
      }
      setOpeningLock(false);
      return;
    }

    if (isDisplayMode) {
      if (!displayStarted) {
        playSoundEffect("opening.start-display");
        setPhase("display-intro");
        setDisplayStarted(true);

        queueTimeout(() => {
          const boosterCards = Array.isArray(displayBoosters[0]) ? displayBoosters[0] : [];
          beginRevealSequence(boosterCards);
        }, displayIntroMs);
        return;
      }

      const boosterCards = Array.isArray(displayBoosters[displayBoosterIndex])
        ? displayBoosters[displayBoosterIndex]
        : [];
      playSoundEffect("opening.start-booster");
      beginRevealSequence(boosterCards);
      return;
    }

    playSoundEffect("opening.start-booster");
    beginRevealSequence(cards);
  }

  function skipOpeningAnimation() {
    if (phase === "idle" || phase === "summary" || phase === "display-final-summary") return;
    void primeSound();

    clearQueuedTimeouts();
    clearMotionState();
    setOpeningLock(false);

    if (isDisplayMode) {
      setDisplayStarted(true);
      setPhase("display-final-summary");
      return;
    }

    setPhase("summary");
  }

  function replayOpeningAnimation() {
    if (!state?.result) return;
    void primeSound();

    clearQueuedTimeouts();
    clearMotionState();
    setOpeningLock(false);
    setDisplayBoosterIndex(0);
    setDisplayStarted(false);
    setIndex(0);

    if (isDisplayMode) {
      setCards([]);
    } else {
      setCards(Array.isArray(state.result?.cards) ? state.result.cards : []);
    }

    setPhase("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function animateNext(direction: 1 | -1) {
    if (phase !== "reveal" || animatingNext) return;

    if (index >= total - 1) {
      setPhase("summary");
      return;
    }

    playSoundEffect("opening.swipe");
    setAnimatingNext(true);
    setFlyOut(true);
    setThrowMs(280);
    setThrowX(direction > 0 ? 230 : -230);
    setThrowRot(direction > 0 ? 12 : -12);

    queueTimeout(() => {
      setIndex((prev) => prev + 1);
      setDragX(0);
      setIsDragging(false);
      setFlyOut(false);
      setThrowX(0);
      setThrowRot(0);
      setThrowMs(280);
      setAnimatingNext(false);
      pointerIdRef.current = null;
      velocityRef.current = 0;
    }, 280);
  }

  function handleNextClick() {
    if (phase !== "reveal" || animatingNext) return;
    if (index >= total - 1) {
      setPhase("summary");
      return;
    }
    animateNext(1);
  }

  function onCardPointerDown(e: React.PointerEvent) {
    if (phase !== "reveal" || animatingNext) return;

    pointerIdRef.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    updateRevealHoloPosition(e.clientX, e.clientY);

    startXRef.current = e.clientX;
    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = performance.now();
    velocityRef.current = 0;

    setIsDragging(true);
    setFlyOut(false);
  }

  function onCardPointerMove(e: React.PointerEvent) {
    if (phase !== "reveal" || !isDragging) return;
    if (pointerIdRef.current !== e.pointerId) return;

    const now = performance.now();
    const dx = e.clientX - startXRef.current;

    updateRevealHoloPosition(e.clientX, e.clientY);
    setDragX(clamp(dx, -190, 190));

    const dt = Math.max(1, now - lastMoveTRef.current);
    const vx = (e.clientX - lastMoveXRef.current) / dt;
    velocityRef.current = velocityRef.current * 0.65 + vx * 0.35;

    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = now;
  }

  function onCardPointerUp(e: React.PointerEvent) {
    if (phase !== "reveal" || !isDragging) return;
    if (pointerIdRef.current !== e.pointerId) return;

    const dist = dragX;
    const vel = velocityRef.current;
    const dir = dist < 0 || vel < 0 ? -1 : 1;

    pointerIdRef.current = null;
    setIsDragging(false);

    const distOk = Math.abs(dist) >= 70;
    const velOk = Math.abs(vel) >= 0.55;

    if (distOk || velOk) {
      animateNext(dir as 1 | -1);
    } else {
      setDragX(0);
      velocityRef.current = 0;
      handleHoloLeave();
    }
  }

  async function openAnother() {
    if (openingLock || isDisplayMode) return;
    void primeSound();

    setOpeningLock(true);
    clearQueuedTimeouts();

    try {
      const res = await openBooster(activeSeasonNumber);
      playSoundEffect("opening.purchase-booster");

      await refreshWallet();
      try {
        const snap = await getEconomyMe();
        setEco(snap);
      } catch {
        //
      }

      navigate("/opening", {
        replace: true,
        state: {
          kind: "booster",
          season: res?.season ?? season,
          seasonNumber: res?.seasonNumber ?? activeSeasonNumber,
          result: res,
        },
      });
    } finally {
      setOpeningLock(false);
    }
  }

  async function openAnotherDisplay() {
    if (openingLock || !isDisplayMode) return;
    void primeSound();

    setOpeningLock(true);
    clearQueuedTimeouts();

    try {
      const res = await openDisplay(activeSeasonNumber);
      playSoundEffect("opening.purchase-display");

      await refreshWallet();
      try {
        const snap = await getEconomyMe();
        setEco(snap);
      } catch {
        //
      }

      navigate("/opening", {
        replace: true,
        state: {
          kind: "display",
          season: res?.season ?? season,
          seasonNumber: res?.seasonNumber ?? activeSeasonNumber,
          result: res,
        },
      });
    } finally {
      setOpeningLock(false);
    }
  }

  function openNextDisplayBooster() {
    if (!isDisplayMode || openingLock) return;
    void primeSound();

    if (skipAnimations) {
      setPhase("display-final-summary");
      return;
    }

    const nextIndex = displayBoosterIndex + 1;
    if (nextIndex >= displayBoosters.length) {
      setPhase("display-final-summary");
      return;
    }

    setDisplayBoosterIndex(nextIndex);
    setOpeningLock(true);
    clearQueuedTimeouts();

    const boosterCards = Array.isArray(displayBoosters[nextIndex]) ? displayBoosters[nextIndex] : [];
    playSoundEffect("opening.start-booster");
    beginRevealSequence(boosterCards);
  }

  const showDisplayRemaining =
    isDisplayMode &&
    displayStarted &&
    phase !== "display-final-summary";

  const idleVisualImg =
    isDisplayMode && !displayStarted ? displayImg : currentPackImg;

  const canSkipOpening =
    phase === "display-intro" || phase === "opening" || phase === "reveal";

  const rarityCls = normalizeRarity(current?.rarity ?? "")
    ? `rarity-${normalizeRarity(current?.rarity ?? "")}`
    : "";

  return (
    <div className="app-shell">
      <AppNavbar currentPage="opening" visibleItems={["dashboard", "booster", "collection", "market", "settings"]} />

      <div className={`container openingPage ${settings.disableHoloEffects ? "openingPage--noHolo" : ""}`}>
        <div className="openingHeader panel">
          <div className="openingHeader__left">
            <h1 className="openingTitle">
              {isDisplayMode ? "Ouverture Display" : "Ouverture"}
            </h1>

            {isReplayMode ? (
              <div className="openingReplayNotice">
                Replay historique{replayDate ? ` • ${replayDate}` : ""}
              </div>
            ) : null}

            <div className="muted">
              {isDisplayMode ? (
                <>
                  Booster <b>{Math.min(displayBoosterIndex + 1, displayBoosters.length || 0)}</b> / <b>{displayBoosters.length || 0}</b>
                  {(phase === "reveal" || phase === "summary") && total > 0 ? (
                    <>
                      {" "}• Carte <b>{Math.min(index + 1, total)}</b> / <b>{total}</b>
                    </>
                  ) : null}
                  {currentDisplayBoosterIsGold ? (
                    <>
                      {" "}• <b>Booster Gold</b>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  Carte <b>{Math.min(index + 1, total || 0)}</b> / <b>{total || 0}</b>
                </>
              )}

              {current?.rarity && (phase === "reveal" || phase === "summary") ? (
                <>
                  {" "}• <span className="muted">{current.rarity}</span>
                </>
              ) : null}

              {phase === "reveal" && typeof currentCredits === "number" ? (
                <>
                  {" "}• <span className="creditInline">+{currentCredits} crédits</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="openingHeader__right">
            {canSkipOpening ? (
              <button
                type="button"
                className="btn btn--ghost openingSkipAction"
                onClick={skipOpeningAnimation}
              >
                Passer l'animation
              </button>
            ) : null}

            {showDisplayRemaining ? (
              <div className="displayRemainingPill">
                <SmartImage
                  src={remainingPillImg}
                  alt={currentDisplayBoosterIsGold ? "Booster Gold" : `Booster ${season}`}
                  className="displayRemainingPill__img"
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="displayRemainingPill__text">
                  <span className="displayRemainingPill__label">Restants</span>
                  <b>{remainingBoosters}</b>
                </div>
              </div>
            ) : (
              <div className="openingPrice muted">
                {loadingEco ? "…" : `Prix booster : ${eco?.costs?.booster ?? "?"} crédits`}
              </div>
            )}
          </div>
        </div>

        <div className="openingStage panel">
          {(phase === "idle" || phase === "opening") && (
            <div className="packZone">
              <div
                className={[
                  "pack",
                  phase === "idle" ? "is-shaking" : "",
                  phase === "opening" ? "is-opening" : "",
                  isDisplayMode && !displayStarted ? "pack--display" : "",
                  currentDisplayBoosterIsGold ? "pack--gold" : "",
                ].join(" ")}
                style={{ ["--pack-img" as any]: `url(${idleVisualImg})` }}
                onClick={phase === "idle" ? startOpening : undefined}
                role="button"
                aria-label={isDisplayMode && !displayStarted ? "Ouvrir la display" : "Ouvrir le booster"}
              >
                {!isDisplayMode || displayStarted ? (
                  <SmartImage
                    className={["emergingCard", phase === "opening" ? "is-emerging" : ""].join(" ")}
                    src={CARD_BACK}
                    alt="Carte (dos)"
                    draggable={false}
                    loading="eager"
                    fetchPriority="high"
                  />
                ) : null}
              </div>

              <button
                className="btn btn--primary openingBtn"
                onClick={startOpening}
                disabled={phase !== "idle" || openingLock || (!isDisplayMode && !total)}
              >
                {isDisplayMode && !displayStarted ? "Ouvrir la display" : "Ouvrir"}
              </button>
            </div>
          )}

          {phase === "display-intro" && (
            <div className="displayIntro">
              <div className="displayIntro__scene">
                <SmartImage className="displayIntro__display" src={displayImg} alt={`Display ${season}`} loading="eager" fetchPriority="high" />
                <SmartImage className="displayIntro__booster displayIntro__booster--1" src={defaultBoosterImg} alt="" loading="eager" fetchPriority="high" />
                <SmartImage className="displayIntro__booster displayIntro__booster--2" src={defaultBoosterImg} alt="" loading="eager" fetchPriority="high" />
                <SmartImage className="displayIntro__booster displayIntro__booster--3" src={defaultBoosterImg} alt="" loading="lazy" />
                <SmartImage className="displayIntro__booster displayIntro__booster--4" src={defaultBoosterImg} alt="" loading="lazy" />
                <SmartImage className="displayIntro__booster displayIntro__booster--5" src={defaultBoosterImg} alt="" loading="lazy" />
              </div>

              <div className="displayIntro__text">Les boosters sortent de la display…</div>
            </div>
          )}

          {phase === "reveal" && (
            <div className="revealZone">
              <div className="revealTop">
                <div className="muted">
                  Saison : <b>{season}</b>
                  {typeof activeSeasonNumber === "number" ? (
                    <>
                      {" "}• <b>S{activeSeasonNumber}</b>
                    </>
                  ) : null}
                  {isDisplayMode ? (
                    <>
                      {" "}• Booster <b>{displayBoosterIndex + 1}</b> / <b>{displayBoosters.length}</b>
                      {currentDisplayBoosterIsGold ? (
                        <>
                          {" "}• <b>Booster Gold</b>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <div className="revealControls">
                  <button className="btn btn--primary" onClick={handleNextClick} disabled={animatingNext}>
                    {index === total - 1 ? "Terminer" : "Suivant"}
                  </button>
                </div>
              </div>

              <div className="stackArea">
                <SmartImage className="stackBack stackBack--1" src={CARD_BACK} alt="" draggable={false} loading="eager" fetchPriority="high" />
                <SmartImage className="stackBack stackBack--2" src={CARD_BACK} alt="" draggable={false} loading="eager" fetchPriority="high" />
                <SmartImage className="stackBack stackBack--3" src={CARD_BACK} alt="" draggable={false} loading="lazy" />

                <div
                  key={`${displayBoosterIndex}-${index}-${current?.id ?? "card"}`}
                  ref={(node) => {
                    cardWrapRef.current = node;
                  }}
                  className={[
                    "openingCardWrap",
                    settings.disableHoloEffects ? "" : rarityCls,
                    isRare && !settings.disableHoloEffects ? "is-rare" : "",
                    isCurrentNew ? "is-new" : "",
                    phase === "reveal" && isRare && !settings.disableHoloEffects ? "rare-appear" : "",
                    phase === "reveal" && isSurprise11 && !settings.disableHoloEffects ? "surprise-appear" : "",
                    flyOut ? "fly-out" : "",
                    isDragging ? "is-dragging" : "",
                  ].join(" ")}
                  onMouseMove={handleHoloMove}
                  onMouseLeave={handleHoloLeave}
                  onPointerDown={onCardPointerDown}
                  onPointerMove={onCardPointerMove}
                  onPointerUp={onCardPointerUp}
                  onPointerCancel={onCardPointerUp}
                  style={{
                    ["--drag-x" as any]: `${dragX}px`,
                    ["--drag-rot" as any]: `${dragRot}deg`,
                    ["--throw-x" as any]: `${throwX}px`,
                    ["--throw-rot" as any]: `${throwRot}deg`,
                    ["--throw-ms" as any]: `${throwMs}ms`,
                  }}
                >
                  {isRare && !settings.disableHoloEffects ? <span className="edgeGlow" aria-hidden="true" /> : null}
                  {isSurprise11 && !settings.disableHoloEffects ? <span className="surpriseRing" aria-hidden="true" /> : null}
                  {isSurprise11 && !settings.disableHoloEffects ? <span className="surpriseSparkles" aria-hidden="true" /> : null}
                  {isSurprise11 && !settings.disableHoloEffects ? <span className="surpriseShine" aria-hidden="true" /> : null}
                  {isCurrentNew ? <span className="newRibbon" aria-hidden="true">NEW</span> : null}
                  {isRare ? <span className="hitRibbon">{getRarityHitLabel(rarityKey)}</span> : null}
                  {isSurprise11 ? <span className="eleventhRibbon">11e carte</span> : null}

                  {current ? (
                    <SmartImage
                      className="faceCard"
                      src={resolveImg(current.imageUrl ?? current.image ?? current.img ?? "")}
                      alt={current.name ?? "Carte"}
                      draggable={false}
                      loading="eager"
                      fetchPriority="high"
                    />
                  ) : (
                    <SmartImage className="faceCard" src={CARD_BACK} alt="Carte" draggable={false} loading="eager" fetchPriority="high" />
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === "summary" && (
            <div className="summaryZone">
              <div className="summaryTitle">
                <span>Résumé {isDisplayMode ? `du booster ${displayBoosterIndex + 1}` : ""}</span>
                <span className="summaryCreditsPill">Gain total : +{currentBoosterCreditsTotal} crédits</span>
              </div>

              <div className="openingStatsStrip">
                <div>
                  <span>Valeur totale</span>
                  <b>+{currentSummaryStats.totalValue} credits</b>
                </div>
                <div>
                  <span>Nouvelles</span>
                  <b>{currentSummaryStats.newCount}</b>
                </div>
                <div>
                  <span>Gros hits</span>
                  <b>{currentSummaryStats.hitCount}</b>
                </div>
                <div>
                  <span>Cartes</span>
                  <b>{currentSummaryStats.cardsCount}</b>
                </div>
              </div>

              {boosterHighlightCards.length > 0 ? (
                <div className="openingHighlights">
                  <div className="openingHighlights__title">A retenir dans ce booster</div>
                  <div className="openingHighlights__rail">
                    {boosterHighlightCards.map((c, i) => {
                      const rk = normalizeRarity(c?.rarity ?? "");
                      const isNew = isCardMarkedNew(c);

                      return (
                        <div
                          key={`booster-highlight-${c?.id ?? i}`}
                          className={[
                            "openingHighlightCard",
                            isNew ? "is-new" : "",
                            isRareOrBetter(c) ? "is-hit" : "",
                          ].join(" ")}
                        >
                          <SmartImage src={resolveImg(c.imageUrl ?? c.image ?? c.img ?? "")} alt={c?.name ?? "Carte"} draggable={false} />
                          <div>
                            <span>{isNew ? "Nouvelle carte" : getRarityHitLabel(rk)}</span>
                            <b>{c?.name ?? "Carte"}</b>
                            <small>{c?.rarity ?? "Rarete inconnue"}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="summaryGrid">
                {sortedBoosterSummaryCards.map((c, i) => {
                  const rk = normalizeRarity(c?.rarity ?? "");
                  const rare = isRareForFx(rk);
                  const cls = rk ? `rarity-${rk}` : "";
                  const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
                  const isNew = isCardMarkedNew(c);

                  const cc =
                    perCardCredits.get(cid) ??
                    c?.earnedCredits ??
                    c?.creditsEarned ??
                    fallbackCardCredits(c, isNew);

                  return (
                    <div
                      key={`${displayBoosterIndex}-${c?.id ?? i}`}
                      className={[
                        "summaryCardWrap",
                        cls,
                        rare ? "is-rare" : "",
                        isNew ? "is-new" : "",
                      ].join(" ")}
                    >
                      {rare && !settings.disableHoloEffects ? <span className="edgeGlow edgeGlow--summary" aria-hidden="true" /> : null}
                      {isNew ? <span className="summaryNewTag">NOUVELLE</span> : null}
                      <span className="summaryCreditTag">+{cc}</span>

                      <SmartImage
                        className="summaryCard"
                        src={resolveImg(c.imageUrl ?? c.image ?? c.img ?? "")}
                        alt={c?.name ?? `Carte ${i + 1}`}
                        draggable={false}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="summaryActions">
                {isDisplayMode ? (
                  <button className="btn btn--primary" onClick={openNextDisplayBooster} disabled={openingLock}>
                    {remainingBoosters > 0 ? "Booster suivant" : "Résumé de la display"}
                  </button>
                ) : (
                  <button className="btn btn--primary" onClick={openAnother} disabled={openingLock}>
                    {openAnotherLabel}
                  </button>
                )}

                <button className="btn btn--ghost" type="button" onClick={replayOpeningAnimation}>
                  Rejouer l'animation
                </button>

                <Link className="btn btn--ghost" to="/booster">
                  Retour boosters
                </Link>
                <Link className="btn btn--ghost" to="/collection">
                  Aller collection
                </Link>
              </div>
            </div>
          )}

          {phase === "display-final-summary" && (
            <div className="summaryZone">
              <div className="summaryTitle">
                <span>Résumé de la display</span>
                <span className="summaryCreditsPill">Gain total : +{computedTotalCredits} crédits</span>
              </div>

              <div className="muted">
                Affichage d’abord des cartes rares ou mieux déjà possédées, puis des nouvelles cartes, avec tri par rareté.
              </div>

              <div className="openingStatsStrip openingStatsStrip--display">
                <div>
                  <span>Valeur totale</span>
                  <b>+{displayFinalStats.totalValue} credits</b>
                </div>
                <div>
                  <span>Nouvelles</span>
                  <b>{displayFinalStats.newCount}</b>
                </div>
                <div>
                  <span>Gros hits</span>
                  <b>{displayFinalStats.hitCount}</b>
                </div>
                <div>
                  <span>Cartes</span>
                  <b>{displayFinalStats.cardsCount}</b>
                </div>
              </div>

              {displayHighlightCards.length > 0 ? (
                <div className="openingHighlights openingHighlights--display">
                  <div className="openingHighlights__title">Les cartes qui font briller la display</div>
                  <div className="openingHighlights__rail">
                    {displayHighlightCards.map((c, i) => {
                      const rk = normalizeRarity(c?.rarity ?? "");
                      const isNew = isCardMarkedNew(c);

                      return (
                        <div
                          key={`display-highlight-${c?.id ?? i}`}
                          className={[
                            "openingHighlightCard",
                            isNew ? "is-new" : "",
                            isRareOrBetter(c) ? "is-hit" : "",
                          ].join(" ")}
                        >
                          <SmartImage src={resolveImg(c.imageUrl ?? c.image ?? c.img ?? "")} alt={c?.name ?? "Carte"} draggable={false} />
                          <div>
                            <span>{isNew ? "Nouvelle carte" : getRarityHitLabel(rk)}</span>
                            <b>{c?.name ?? "Carte"}</b>
                            <small>{c?.rarity ?? "Rarete inconnue"}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="summaryGrid summaryGrid--displayFinal">
                {displaySummaryCards.map((c, i) => {
                  const rk = normalizeRarity(c?.rarity ?? "");
                  const rare = isRareForFx(rk);
                  const cls = rk ? `rarity-${rk}` : "";
                  const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
                  const isNew = isCardMarkedNew(c);

                  const cc =
                    perCardCredits.get(cid) ??
                    c?.earnedCredits ??
                    c?.creditsEarned ??
                    fallbackCardCredits(c, isNew);

                  return (
                    <div
                      key={`display-summary-${c?.id ?? i}`}
                      className={[
                        "summaryCardWrap",
                        cls,
                        rare ? "is-rare" : "",
                        isNew ? "is-new" : "",
                      ].join(" ")}
                    >
                      {rare && !settings.disableHoloEffects ? <span className="edgeGlow edgeGlow--summary" aria-hidden="true" /> : null}
                      {isNew ? <span className="summaryNewTag">NOUVELLE</span> : null}
                      <span className="summaryCreditTag">+{cc}</span>

                      <SmartImage
                        className="summaryCard"
                        src={resolveImg(c.imageUrl ?? c.image ?? c.img ?? "")}
                        alt={c?.name ?? `Carte ${i + 1}`}
                        draggable={false}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="summaryActions">
                <button className="btn btn--primary" onClick={openAnotherDisplay} disabled={openingLock}>
                  {openAnotherDisplayLabel}
                </button>
                <button className="btn btn--ghost" type="button" onClick={replayOpeningAnimation}>
                  Rejouer l'animation
                </button>
                <Link className="btn btn--ghost" to="/booster">
                  Retour boosters
                </Link>
                <Link className="btn btn--ghost" to="/collection">
                  Aller collection
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
