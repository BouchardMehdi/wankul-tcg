import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Menu.css";
import "../styles/Opening.css";

import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import { useAuth } from "../auth/AuthContext";
import { getEconomyMe, type EconomySnapshot } from "../api/economy";
import { openBooster, openDisplay, type SeasonName } from "../api/booster";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const SKIP_STORAGE_KEY = "wankul_skip_opening_animations";

const CARD_BACK = new URL("../assets/wankul_back.webp", import.meta.url).href;

const BOOSTER_IMG: Record<SeasonName, string> = {
  Origins: new URL("../assets/boosters/booster_origin.png", import.meta.url).href,
  Campus: new URL("../assets/boosters/booster_campus.png", import.meta.url).href,
  Battle: new URL("../assets/boosters/booster_battle.png", import.meta.url).href,
  Stellar: new URL("../assets/boosters/booster_stellar.png", import.meta.url).href,
};

const DISPLAY_IMG: Record<SeasonName, string> = {
  Origins: new URL("../assets/boosters/display_origin.webp", import.meta.url).href,
  Campus: new URL("../assets/boosters/display_campus.webp", import.meta.url).href,
  Battle: new URL("../assets/boosters/display_battle.webp", import.meta.url).href,
  Stellar: new URL("../assets/boosters/display_stellar.webp", import.meta.url).href,
};

type OpeningStatePayload = {
  kind: "booster" | "display";
  season: SeasonName;
  result: any;
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

const ECON_BASE: Record<string, number> = {
  Terrain: 0,
  Commune: 2,
  "Peu commune": 4,
  Rare: 10,
  "Ultra Rare (U1)": 36,
  "Ultra Rare (U2)": 56,
  "Légendaire bronze": 120,
  "Légendaire argent": 280,
  "Légendaire dorée": 560,
  "Booster Gold": 56,
  "Gagnant ticket d'or": 10,
  "Ticket d'or": 0,
};

const ECON_NEW: Record<string, number> = {
  Terrain: 10,
  Commune: 12,
  "Peu commune": 20,
  Rare: 40,
  "Ultra Rare (U1)": 140,
  "Ultra Rare (U2)": 220,
  "Légendaire bronze": 440,
  "Légendaire argent": 1000,
  "Légendaire dorée": 2800,
  "Booster Gold": 220,
  "Gagnant ticket d'or": 25,
  "Ticket d'or": 0,
};

function fallbackCardCredits(card: any, isNew: boolean) {
  const rarity = String(card?.rarity ?? "");
  const base = ECON_BASE[rarity] ?? 0;
  const nw = ECON_NEW[rarity] ?? base;
  return isNew ? nw : base;
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

  const boosters = result?.boosters;
  if (Array.isArray(boosters)) {
    for (const booster of boosters) {
      if (!Array.isArray(booster)) continue;
      for (const c of booster) {
        if (c?.isNew && (typeof c?.id === "number" || typeof c?.id === "string")) s.add(c.id);
      }
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
  const { logout, refreshWallet } = useAuth();
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

  const [skipAnimations, setSkipAnimations] = useState(false);

  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const lastMoveTRef = useRef(0);
  const velocityRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  const season: SeasonName = state?.season ?? "Origins";
  const isDisplayMode = state?.kind === "display";
  const boosterImg = BOOSTER_IMG[season];
  const displayImg = DISPLAY_IMG[season];

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

  function prepareBoosterCards(boosterCards: any[]) {
    setCards(Array.isArray(boosterCards) ? boosterCards : []);
    setIndex(0);
    clearMotionState();
  }

  useEffect(() => {
    const saved = localStorage.getItem(SKIP_STORAGE_KEY);
    setSkipAnimations(saved === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem(SKIP_STORAGE_KEY, skipAnimations ? "1" : "0");
  }, [skipAnimations]);

  useEffect(() => {
    return () => clearQueuedTimeouts();
  }, []);

  useEffect(() => {
    if (!state?.season || !state?.result) {
      navigate("/booster", { replace: true });
      return;
    }

    clearQueuedTimeouts();

    const boosters = Array.isArray(state.result?.boosters) ? state.result.boosters : [];
    const firstBoosterCards = Array.isArray(boosters[0]) ? boosters[0] : [];
    const boosterCards = Array.isArray(state.result?.cards) ? state.result.cards : [];

    setDisplayBoosters(boosters);
    setDisplayBoosterIndex(0);
    setDisplayStarted(false);

    setCards(state.kind === "display" ? [] : boosterCards);
    setIndex(0);

    setCreditsTotal(extractCreditsTotal(state.result));
    setNewCardIds(extractNewCardIds(state.result));

    const flatCards = state.kind === "display"
      ? boosters.flatMap((b: any) => (Array.isArray(b) ? b : []))
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
  }, [state?.kind, state?.season, state?.result, navigate, skipAnimations]);

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

  function handleHoloMove(e: React.MouseEvent) {
    const el = cardWrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    el.style.setProperty("--hx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--hy", `${(y * 100).toFixed(1)}%`);
  }

  function handleHoloLeave() {
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
  const isCurrentNew = newCardIds.has(currentId);

  const currentCredits =
    perCardCredits.get(currentId) ??
    current?.earnedCredits ??
    current?.creditsEarned ??
    (current ? fallbackCardCredits(current, isCurrentNew) : null);

  const displayBoosterCount = displayBoosters.length;
  const remainingBoosters = Math.max(0, displayBoosterCount - displayBoosterIndex - 1);

  const currentBoosterCreditsTotal = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
      const isNew = newCardIds.has(cid);
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
      const isNew = newCardIds.has(cid);
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
    const selected = dedupeCards(
      flat.filter((c, i) => {
        const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
        return newCardIds.has(cid) || isRareOrBetter(c);
      })
    );

    return selected.sort((a, b) => {
      const aId = a?.id ?? a?.cardId ?? a?.key;
      const bId = b?.id ?? b?.cardId ?? b?.key;

      const aNew = newCardIds.has(aId);
      const bNew = newCardIds.has(bId);

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
  const rarityCls = rarityKey ? `rarity-${rarityKey}` : "";
  const rareAppearCls = phase === "reveal" && isRare ? "rare-appear" : "";
  const surpriseCls = phase === "reveal" && isSurprise11 ? "surprise-appear" : "";

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  function beginRevealSequence(boosterCards: any[]) {
    prepareBoosterCards(boosterCards);
    setPhase("opening");

    queueTimeout(() => {
      setPhase("reveal");
      setOpeningLock(false);
    }, 1100);
  }

  function startOpening() {
    if (openingLock) return;

    clearQueuedTimeouts();
    setOpeningLock(true);

    if (skipAnimations) {
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
        setPhase("display-intro");
        setDisplayStarted(true);

        queueTimeout(() => {
          const boosterCards = Array.isArray(displayBoosters[0]) ? displayBoosters[0] : [];
          beginRevealSequence(boosterCards);
        }, 1700);
        return;
      }

      const boosterCards = Array.isArray(displayBoosters[displayBoosterIndex])
        ? displayBoosters[displayBoosterIndex]
        : [];
      beginRevealSequence(boosterCards);
      return;
    }

    beginRevealSequence(cards);
  }

  function animateNext(direction: 1 | -1) {
    if (phase !== "reveal" || animatingNext) return;

    if (index >= total - 1) {
      setPhase("summary");
      return;
    }

    setAnimatingNext(true);
    setFlyOut(true);
    setThrowMs(280);
    setThrowX(direction > 0 ? 230 : -230);
    setThrowRot(direction > 0 ? 12 : -12);

    queueTimeout(() => {
      setIndex((prev) => prev + 1);
      clearMotionState();
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
    }
  }

  async function openAnother() {
    if (openingLock || isDisplayMode) return;

    setOpeningLock(true);
    clearQueuedTimeouts();

    try {
      const res = await openBooster(season);

      await refreshWallet();
      try {
        const snap = await getEconomyMe();
        setEco(snap);
      } catch {
        //
      }

      navigate("/opening", {
        replace: true,
        state: { kind: "booster", season, result: res },
      });
    } finally {
      setOpeningLock(false);
    }
  }

  async function openAnotherDisplay() {
    if (openingLock || !isDisplayMode) return;

    setOpeningLock(true);
    clearQueuedTimeouts();

    try {
      const res = await openDisplay(season);

      await refreshWallet();
      try {
        const snap = await getEconomyMe();
        setEco(snap);
      } catch {
        //
      }

      navigate("/opening", {
        replace: true,
        state: { kind: "display", season, result: res },
      });
    } finally {
      setOpeningLock(false);
    }
  }

  function openNextDisplayBooster() {
    if (!isDisplayMode || openingLock) return;

    if (skipAnimations) {
      setPhase("display-final-summary");
      return;
    }

    const nextIndex = displayBoosterIndex + 1;
    if (nextIndex >= displayBoosterCount) {
      setPhase("display-final-summary");
      return;
    }

    setDisplayBoosterIndex(nextIndex);
    setOpeningLock(true);
    clearQueuedTimeouts();

    const boosterCards = Array.isArray(displayBoosters[nextIndex]) ? displayBoosters[nextIndex] : [];
    beginRevealSequence(boosterCards);
  }

  const showDisplayRemaining =
    isDisplayMode &&
    displayStarted &&
    phase !== "display-final-summary";

  const idleVisualImg =
    isDisplayMode && !displayStarted ? displayImg : boosterImg;

  return (
    <>
      <header className="topbar">
        <div className="container topbar__inner">
          <div className="topbar__brand">
            <img src={wankulLogo} className="topbar__logo" alt="Wankul" />
          </div>

          <nav className="topbar__nav">
            <Link className="topbar__link" to="/menu">
              Menu
            </Link>
            <Link className="topbar__link" to="/collection">
              Collection
            </Link>
            <button className="topbar__logout" onClick={handleLogout}>
              Se déconnecter
            </button>
          </nav>
        </div>
      </header>

      <div className="container openingPage">
        <div className="openingHeader panel">
          <div className="openingHeader__left">
            <h1 className="openingTitle">
              {isDisplayMode ? "Ouverture Display" : "Ouverture"}
            </h1>

            <div className="muted">
              {isDisplayMode ? (
                <>
                  Booster <b>{Math.min(displayBoosterIndex + 1, displayBoosterCount || 0)}</b> / <b>{displayBoosterCount || 0}</b>
                  {(phase === "reveal" || phase === "summary") && total > 0 ? (
                    <>
                      {" "}• Carte <b>{Math.min(index + 1, total)}</b> / <b>{total}</b>
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
            {showDisplayRemaining ? (
              <div className="displayRemainingPill">
                <img
                  src={boosterImg}
                  alt={`Booster ${season}`}
                  className="displayRemainingPill__img"
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

            <button
              type="button"
              className={`skipToggleBtn ${skipAnimations ? "is-on" : "is-off"}`}
              onClick={() => setSkipAnimations((v) => !v)}
              aria-pressed={skipAnimations}
            >
              <span className="skipToggleBtn__track">
                <span className="skipToggleBtn__thumb" />
              </span>
              <span className="skipToggleBtn__label">Skip animations</span>
            </button>
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
                ].join(" ")}
                style={{ ["--pack-img" as any]: `url(${idleVisualImg})` }}
                onClick={phase === "idle" ? startOpening : undefined}
                role="button"
                aria-label={isDisplayMode && !displayStarted ? "Ouvrir la display" : "Ouvrir le booster"}
              >
          

                {!isDisplayMode || displayStarted ? (
                  <img
                    className={["emergingCard", phase === "opening" ? "is-emerging" : ""].join(" ")}
                    src={CARD_BACK}
                    alt="Carte (dos)"
                    draggable={false}
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
                <img className="displayIntro__display" src={displayImg} alt={`Display ${season}`} />
                <img className="displayIntro__booster displayIntro__booster--1" src={boosterImg} alt="" />
                <img className="displayIntro__booster displayIntro__booster--2" src={boosterImg} alt="" />
                <img className="displayIntro__booster displayIntro__booster--3" src={boosterImg} alt="" />
                <img className="displayIntro__booster displayIntro__booster--4" src={boosterImg} alt="" />
                <img className="displayIntro__booster displayIntro__booster--5" src={boosterImg} alt="" />
              </div>

              <div className="displayIntro__text">
                Les boosters sortent de la display…
              </div>
            </div>
          )}

          {phase === "reveal" && (
            <div className="revealZone">
              <div className="revealTop">
                <div className="muted">
                  Saison : <b>{season}</b>
                  {isDisplayMode ? (
                    <>
                      {" "}• Booster <b>{displayBoosterIndex + 1}</b> / <b>{displayBoosterCount}</b>
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
                <img className="stackBack stackBack--1" src={CARD_BACK} alt="" draggable={false} />
                <img className="stackBack stackBack--2" src={CARD_BACK} alt="" draggable={false} />
                <img className="stackBack stackBack--3" src={CARD_BACK} alt="" draggable={false} />

                <div
                  key={`${displayBoosterIndex}-${index}-${current?.id ?? "card"}`}
                  ref={(node) => {
                    cardWrapRef.current = node;
                  }}
                  className={[
                    "openingCardWrap",
                    rarityCls,
                    isRare ? "is-rare" : "",
                    isCurrentNew ? "is-new" : "",
                    rareAppearCls,
                    surpriseCls,
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
                  {isRare ? <span className="edgeGlow" aria-hidden="true" /> : null}
                  {isSurprise11 ? <span className="surpriseRing" aria-hidden="true" /> : null}
                  {isSurprise11 ? <span className="surpriseSparkles" aria-hidden="true" /> : null}
                  {isSurprise11 ? <span className="surpriseShine" aria-hidden="true" /> : null}
                  {isCurrentNew ? <span className="newRibbon" aria-hidden="true">NEW</span> : null}

                  {current ? (
                    <img
                      className="faceCard"
                      src={resolveImg(current.imageUrl ?? current.image ?? current.img ?? "")}
                      alt={current.name ?? "Carte"}
                      draggable={false}
                    />
                  ) : (
                    <img className="faceCard" src={CARD_BACK} alt="Carte" draggable={false} />
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === "summary" && (
            <div className="summaryZone">
              <div className="summaryTitle">
                <span>
                  Résumé {isDisplayMode ? `du booster ${displayBoosterIndex + 1}` : ""}
                </span>
                <span className="summaryCreditsPill">
                  Gain total : +{currentBoosterCreditsTotal} crédits
                </span>
              </div>

              <div className="summaryGrid">
                {sortedBoosterSummaryCards.map((c, i) => {
                  const rk = normalizeRarity(c?.rarity ?? "");
                  const rare = isRareForFx(rk);
                  const cls = rk ? `rarity-${rk}` : "";
                  const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
                  const isNew = newCardIds.has(cid);

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
                      {rare ? <span className="edgeGlow edgeGlow--summary" aria-hidden="true" /> : null}
                      {isNew ? <span className="summaryNewTag">NOUVELLE</span> : null}
                      <span className="summaryCreditTag">+{cc}</span>

                      <img
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

              <div className="summaryGrid summaryGrid--displayFinal">
                {displaySummaryCards.map((c, i) => {
                  const rk = normalizeRarity(c?.rarity ?? "");
                  const rare = isRareForFx(rk);
                  const cls = rk ? `rarity-${rk}` : "";
                  const cid = c?.id ?? c?.cardId ?? c?.key ?? i;
                  const isNew = newCardIds.has(cid);

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
                      {rare ? <span className="edgeGlow edgeGlow--summary" aria-hidden="true" /> : null}
                      {isNew ? <span className="summaryNewTag">NOUVELLE</span> : null}
                      <span className="summaryCreditTag">+{cc}</span>

                      <img
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
    </>
  );
}