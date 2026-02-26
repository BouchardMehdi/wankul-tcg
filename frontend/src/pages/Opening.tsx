import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Menu.css";
import "../styles/Opening.css";

import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import { useAuth } from "../auth/AuthContext";
import { getEconomyMe, type EconomySnapshot } from "../api/economy";
import { openBooster, type SeasonName } from "../api/booster";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const IS_DEV = import.meta.env.DEV;

function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

const CARD_BACK = new URL("../assets/wankul_back.webp", import.meta.url).href;
const CARD_TEST = new URL("../assets/wankul_PGW_1.webp", import.meta.url).href;

// Boosters
const BOOSTER_IMG: Record<SeasonName, string> = {
  Origins: new URL("../assets/boosters/booster_origin.png", import.meta.url).href,
  Campus: new URL("../assets/boosters/booster_campus.png", import.meta.url).href,
  Battle: new URL("../assets/boosters/booster_battle.png", import.meta.url).href,
  Stellar: new URL("../assets/boosters/booster_stellar.png", import.meta.url).href,
};

type OpeningStatePayload = {
  kind: "booster" | "display";
  season: SeasonName;
  result: any;
};

type Phase = "idle" | "opening" | "reveal" | "summary";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Normalise la rareté DB -> clé CSS */
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

  if (s.includes("u1") || s.includes("ultra rare u1") || s.includes("ultra rare 1") || s.includes("ultra 1"))
    return "u1";
  if (s.includes("u2") || s.includes("ultra rare u2") || s.includes("ultra rare 2") || s.includes("ultra 2"))
    return "u2";

  const isLegendary = s.includes("legendaire") || s.includes("legendary") || s.startsWith("leg ");
  if (isLegendary && s.includes("bronze")) return "leg-bronze";
  if (isLegendary && (s.includes("argent") || s.includes("silver"))) return "leg-silver";
  if (isLegendary && (s.includes("or") || s.includes("gold"))) return "leg-gold";

  return "";
}

function isRareForFx(rarityKey: string) {
  return ["u1", "u2", "leg-bronze", "leg-silver", "leg-gold"].includes(rarityKey);
}

/** ✅ Pack test FX (toutes raretés) — images = dos (suffisant pour voir les FX) */
function buildFxTestPack() {
  const img = CARD_TEST;

  return [
    { id: "t1", name: "Commune (test)", rarity: "Commune", imageUrl: img },
    { id: "t2", name: "Peu commune (test)", rarity: "Peu commune", imageUrl: img },
    { id: "t3", name: "Rare (test)", rarity: "Rare", imageUrl: img },

    { id: "t4", name: "U1 (test)", rarity: "Ultra Rare (U1)", imageUrl: img },
    { id: "t5", name: "U2 (test)", rarity: "Ultra Rare (U2)", imageUrl: img },

    { id: "t6", name: "Légendaire bronze (test)", rarity: "Légendaire bronze", imageUrl: img },
    { id: "t7", name: "Légendaire argent (test)", rarity: "Légendaire argent", imageUrl: img },
    { id: "t8", name: "Légendaire or (test)", rarity: "Légendaire dorée", imageUrl: img },

    { id: "t9", name: "U1 bis (test)", rarity: "Ultra Rare (U1)", imageUrl: img },
    { id: "t10", name: "Rare bis (test)", rarity: "Rare", imageUrl: img },

    // 11ème carte => surprise (index 10)
    { id: "t11", name: "11ème Surprise (test)", rarity: "Ticket d’or", imageUrl: img },
  ];
}

/**
 * ✅ ECON TABLE (fallback affichage)
 * IMPORTANT: newValue REMPLACE baseValue si carte est nouvelle.
 * Ce fallback n’est utilisé que si le backend ne renvoie aucun crédit.
 */
const ECON_BASE: Record<string, number> = {
  Terrain: 0,
  Commune: 2,
  'Peu commune': 4,
  Rare: 10,
  'Ultra Rare (U1)': 36,
  'Ultra Rare (U2)': 56,
  'Légendaire bronze': 120,
  'Légendaire argent': 280,
  'Légendaire dorée': 560,
  'Booster Gold': 56,
  "Gagnant ticket d'or": 10,
  "Ticket d'or": 0,
};

const ECON_NEW: Record<string, number> = {
  Terrain: 10,
  Commune: 12,
  'Peu commune': 20,
  Rare: 40,
  'Ultra Rare (U1)': 140,
  'Ultra Rare (U2)': 220,
  'Légendaire bronze': 440,
  'Légendaire argent': 1000,
  'Légendaire dorée': 2800,
  'Booster Gold': 220,
  "Gagnant ticket d'or": 25,
  "Ticket d'or": 0,
};

/** Helper: extrait un total crédit depuis différents shapes possibles */
function extractCreditsTotal(result: any): number | null {
  const candidates = [
    result?.creditsEarned,
    result?.creditsGained,
    result?.totalCredits,
    result?.breakdown?.total,
    result?.credits?.total,
    result?.creditBreakdown?.total,
    result?.economy?.earned,
    result?.economy?.earnedCredits,
    result?.economy?.creditsEarned,
    result?.economy?.totalEarned,
  ];

  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * Helper: extrait un map "cardId -> crédits" si backend le fournit :
 * - soit chaque carte a earnedCredits / creditsEarned
 * - soit result.cardCredits = [{ cardId, credits }]
 * - soit result.cardCredits = number[] (par index)
 */
function extractPerCardCredits(result: any, cards: any[]): Map<string | number, number> {
  const m = new Map<string | number, number>();

  // 1) Credits directement dans les cartes
  for (const c of cards) {
    const id = c?.id ?? c?.cardId ?? c?.key ?? null;
    const v = c?.earnedCredits ?? c?.creditsEarned ?? c?.credits ?? null;
    if (id != null && typeof v === "number" && Number.isFinite(v)) m.set(id, v);
  }

  // 2) cardCredits: [{cardId, credits}]
  const arrObj = result?.cardCredits;
  if (Array.isArray(arrObj) && arrObj.length && typeof arrObj[0] === "object") {
    for (const row of arrObj) {
      const id = row?.cardId ?? row?.id;
      const v = row?.credits ?? row?.earnedCredits ?? row?.value;
      if (id != null && typeof v === "number" && Number.isFinite(v)) m.set(id, v);
    }
  }

  // 3) cardCredits: number[] aligné sur cards[]
  const arrNum = result?.cardCredits;
  if (Array.isArray(arrNum) && arrNum.length && typeof arrNum[0] === "number") {
    for (let i = 0; i < Math.min(arrNum.length, cards.length); i++) {
      const c = cards[i];
      const id = c?.id ?? c?.cardId ?? c?.key ?? i;
      const v = arrNum[i];
      if (typeof v === "number" && Number.isFinite(v)) m.set(id, v);
    }
  }

  return m;
}

/** Helper: récupère les IDs des cartes "nouvelles" si backend le fournit */
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

  // fallback: cartes qui ont isNew
  const cards = result?.cards;
  if (Array.isArray(cards)) {
    for (const c of cards) {
      if (c?.isNew && (typeof c?.id === "number" || typeof c?.id === "string")) s.add(c.id);
    }
  }

  return s;
}

/** Fallback: calcule les crédits d’une carte si backend ne renvoie rien */
function fallbackCardCredits(card: any, isNew: boolean) {
  const rarity = String(card?.rarity ?? "");
  const base = ECON_BASE[rarity] ?? 0;
  const nw = ECON_NEW[rarity] ?? base;
  return isNew ? nw : base; // ✅ remplace, n’additionne pas
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

  // ✅ crédits affichés (issus du backend si dispo)
  const [creditsTotal, setCreditsTotal] = useState<number | null>(null);
  const [perCardCredits, setPerCardCredits] = useState<Map<string | number, number>>(new Map());
  const [newCardIds, setNewCardIds] = useState<Set<string | number>>(new Set());

  // Drag
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // fly-out parameters
  const [flyOut, setFlyOut] = useState(false);
  const [throwX, setThrowX] = useState(0);
  const [throwRot, setThrowRot] = useState(0);
  const [throwMs, setThrowMs] = useState(360);
  const [animatingNext, setAnimatingNext] = useState(false);

  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const lastMoveXRef = useRef<number>(0);
  const lastMoveTRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  // holo target
  const cardWrapRef = useRef<HTMLDivElement | null>(null);

  // ✅ Test FX toggle
  const [fxTestEnabled, setFxTestEnabled] = useState(false);

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
    el.style.setProperty("--hx", `50%`);
    el.style.setProperty("--hy", `50%`);
  }

  useEffect(() => {
    const el = cardWrapRef.current;
    if (!el) return;
    el.style.setProperty("--hx", `50%`);
    el.style.setProperty("--hy", `50%`);
  }, [index, phase]);

  useEffect(() => {
    if (!state?.season || !state?.result) {
      navigate("/booster", { replace: true });
      return;
    }

    // cards
    let arr: any[] = [];
    if (state.kind === "booster") {
      arr = Array.isArray(state.result?.cards) ? state.result.cards : [];
    } else {
      const flat = Array.isArray(state.result?.boosters) ? state.result.boosters.flat?.() ?? [] : [];
      arr = Array.isArray(flat) ? flat : [];
    }
    setCards(arr);

    // ✅ crédits / new cards (depuis backend si dispo)
    setCreditsTotal(extractCreditsTotal(state.result));
    setNewCardIds(extractNewCardIds(state.result));
    setPerCardCredits(extractPerCardCredits(state.result, arr));

    setIndex(0);
    setPhase("idle");
    setOpeningLock(false);

    setDragX(0);
    setIsDragging(false);
    setFlyOut(false);
    setThrowX(0);
    setThrowRot(0);
    setThrowMs(360);
    setAnimatingNext(false);

    pointerIdRef.current = null;
    velocityRef.current = 0;

    setFxTestEnabled(false);
  }, [state?.kind, state?.season, state?.result, navigate]);

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

  const season: SeasonName = state?.season ?? "Origins";
  const boosterImg = BOOSTER_IMG[season];

  const total = cards.length;
  const current = cards[index] ?? null;

  const rarityKey = useMemo(() => normalizeRarity(current?.rarity ?? ""), [current?.rarity]);
  const isRare = useMemo(() => isRareForFx(rarityKey), [rarityKey]);
  const isSurprise11 = useMemo(() => index === 10, [index]);

  const openAnotherLabel = useMemo(() => {
    const free = (eco?.freeBoosterCharges ?? 0) > 0;
    if (free) return "Ouvrir un autre";
    const price = eco?.costs?.booster;
    if (typeof price === "number") return `Ouvrir un autre • ${price} crédits`;
    return "Ouvrir un autre";
  }, [eco?.freeBoosterCharges, eco?.costs?.booster]);

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  function startOpening() {
    if (openingLock) return;
    if (!total && !fxTestEnabled) return;

    setOpeningLock(true);
    setPhase("opening");

    window.setTimeout(() => {
      if (fxTestEnabled) {
        const pack = buildFxTestPack();
        setCards(pack);
        setIndex(0);

        // reset affichage crédits en test
        setCreditsTotal(null);
        setNewCardIds(new Set());
        setPerCardCredits(new Map());
      } else {
        setIndex(0);
      }

      setPhase("reveal");
      setOpeningLock(false);

      setDragX(0);
      setIsDragging(false);
      setFlyOut(false);
      setThrowX(0);
      setThrowRot(0);
      setThrowMs(360);
      setAnimatingNext(false);

      pointerIdRef.current = null;
      velocityRef.current = 0;
    }, 1200);
  }

  function goNextWithInertia() {
    if (phase !== "reveal") return;
    if (animatingNext) return;

    if (index >= total - 1) {
      setPhase("summary");
      return;
    }

    const v = velocityRef.current;
    const dirSign = dragX !== 0 ? Math.sign(dragX) : v !== 0 ? Math.sign(v) : 1;

    const extra = clamp(v * 520, -220, 220);
    const finalX = clamp(dragX + extra + dirSign * 140, -520, 520);
    const finalRot = clamp(finalX * 0.06, -18, 18);

    const speed = Math.abs(v);
    const ms = clamp(420 - speed * 240, 240, 420);

    setAnimatingNext(true);
    setThrowX(finalX);
    setThrowRot(finalRot);
    setThrowMs(ms);
    setFlyOut(true);

    window.setTimeout(() => {
      setIndex((i) => Math.min(total - 1, i + 1));

      setDragX(0);
      setIsDragging(false);
      setFlyOut(false);
      setThrowX(0);
      setThrowRot(0);
      setThrowMs(360);
      setAnimatingNext(false);

      pointerIdRef.current = null;
      velocityRef.current = 0;
    }, ms);
  }

  function onCardPointerDown(e: React.PointerEvent) {
    if (phase !== "reveal") return;
    if (animatingNext) return;

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
    if (phase !== "reveal") return;
    if (!isDragging) return;
    if (pointerIdRef.current !== e.pointerId) return;

    const now = performance.now();
    const dx = e.clientX - startXRef.current;

    const clamped = clamp(dx, -190, 190);
    setDragX(clamped);

    const dt = Math.max(1, now - lastMoveTRef.current);
    const vx = (e.clientX - lastMoveXRef.current) / dt;
    velocityRef.current = velocityRef.current * 0.65 + vx * 0.35;

    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = now;
  }

  function onCardPointerUp(e: React.PointerEvent) {
    if (phase !== "reveal") return;
    if (!isDragging) return;
    if (pointerIdRef.current !== e.pointerId) return;

    pointerIdRef.current = null;
    setIsDragging(false);

    const v = velocityRef.current;
    const distOk = Math.abs(dragX) >= 70;
    const velOk = Math.abs(v) >= 0.55;

    if (distOk || velOk) {
      goNextWithInertia();
    } else {
      setDragX(0);
      velocityRef.current = 0;
    }
  }

  async function openAnother() {
    if (openingLock) return;
    setOpeningLock(true);

    try {
      if (fxTestEnabled) {
        setPhase("idle");
        setIndex(0);
        setDragX(0);
        setIsDragging(false);
        setFlyOut(false);
        setThrowX(0);
        setThrowRot(0);
        setThrowMs(360);
        setAnimatingNext(false);
        startOpening();
        return;
      }

      const res = await openBooster(season);

      await refreshWallet();
      try {
        const snap = await getEconomyMe();
        setEco(snap);
      } catch {
        // noop
      }

      const arr = Array.isArray(res?.cards) ? res.cards : [];
      setCards(arr);

      setCreditsTotal(extractCreditsTotal(res));
      setNewCardIds(extractNewCardIds(res));
      setPerCardCredits(extractPerCardCredits(res, arr));

      setIndex(0);
      setPhase("idle");

      setDragX(0);
      setIsDragging(false);
      setFlyOut(false);
      setThrowX(0);
      setThrowRot(0);
      setThrowMs(360);
      setAnimatingNext(false);

      pointerIdRef.current = null;
      velocityRef.current = 0;

      navigate("/opening", { replace: true, state: { kind: "booster", season, result: res } });
    } finally {
      setOpeningLock(false);
    }
  }

  const dragRot = useMemo(() => clamp(dragX * 0.06, -14, 14), [dragX]);

  const rarityCls = rarityKey ? `rarity-${rarityKey}` : "";
  const rareAppearCls = phase === "reveal" && isRare ? "rare-appear" : "";
  const surpriseCls = phase === "reveal" && isSurprise11 ? "surprise-appear" : "";

  // ✅ crédits + new pour la carte courante
  const currentId = current?.id ?? current?.cardId ?? current?.key ?? index;
  const isCurrentNew = newCardIds.has(currentId);

  const currentCredits =
    perCardCredits.get(currentId) ??
    current?.earnedCredits ??
    current?.creditsEarned ??
    (current ? fallbackCardCredits(current, isCurrentNew) : null);

  // ✅ total (si backend renvoie 0 / null / etc, on calcule un fallback PROPRE)
  const computedTotalCredits = useMemo(() => {
    if (typeof creditsTotal === "number" && Number.isFinite(creditsTotal)) return creditsTotal;

    // somme de toutes les cartes via perCardCredits sinon fallback
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
  }, [creditsTotal, cards, perCardCredits, newCardIds]);

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
            <h1 className="openingTitle">Ouverture</h1>

            <div className="muted">
              Carte <b>{Math.min(index + 1, total || 0)}</b> / <b>{total || 0}</b>
              {current?.rarity ? (
                <>
                  {" "}
                  • <span className="muted">{current.rarity}</span>
                </>
              ) : null}

              {/* ✅ crédits carte (OK pendant reveal) */}
              {phase === "reveal" && typeof currentCredits === "number" ? (
                <>
                  {" "}
                  • <span className="creditInline">+{currentCredits} crédits</span>
                </>
              ) : null}

              {fxTestEnabled ? (
                <>
                  {" "}
                  • <b>TEST FX</b>
                </>
              ) : null}
            </div>
          </div>

          <div className="openingHeader__right">
            <div className="openingPrice muted">
              {loadingEco ? "…" : `Prix booster : ${eco?.costs?.booster ?? "?"} crédits`}
            </div>

            {/* ✅ bouton test (dev only) */}
            {IS_DEV && (
              <button
                className="btn btn--ghost"
                style={{ marginTop: 8 }}
                onClick={() => setFxTestEnabled((v) => !v)}
                title="Active un booster fake avec toutes les raretés (après ouverture)"
              >
                {fxTestEnabled ? "✅ Test FX: ON" : "🎛️ Test FX: OFF"}
              </button>
            )}
          </div>
        </div>

        <div className="openingStage panel">
          {(phase === "idle" || phase === "opening") && (
            <div className="packZone">
              <div
                className={["pack", phase === "idle" ? "is-shaking" : "", phase === "opening" ? "is-opening" : ""].join(
                  " ",
                )}
                style={{ ["--pack-img" as any]: `url(${boosterImg})` }}
                onClick={startOpening}
                role="button"
                aria-label="Ouvrir le booster"
              >
                <div className="pack__hint">{phase === "idle" ? "Clique pour ouvrir" : "Ouverture..."}</div>

                <img
                  className={["emergingCard", phase === "opening" ? "is-emerging" : ""].join(" ")}
                  src={CARD_BACK}
                  alt="Carte (dos)"
                  draggable={false}
                />
              </div><br/>

              <button
                className="btn btn--primary openingBtn"
                onClick={startOpening}
                disabled={phase !== "idle" || openingLock || (!total && !fxTestEnabled)}
              >
                Ouvrir
              </button>
            </div>
          )}

          {phase === "reveal" && (
            <div className="revealZone">
              <div className="revealTop">
                <div className="muted">
                  Saison : <b>{season}</b>
                </div>

                <div className="revealControls">
                  <button className="btn btn--primary" onClick={goNextWithInertia} disabled={animatingNext}>
                    {index === total - 1 ? "Terminer" : "Suivant"}
                  </button>
                </div>
              </div>

              <div className="stackArea">
                <img className="stackBack stackBack--1" src={CARD_BACK} alt="" draggable={false} />
                <img className="stackBack stackBack--2" src={CARD_BACK} alt="" draggable={false} />
                <img className="stackBack stackBack--3" src={CARD_BACK} alt="" draggable={false} />

                <div
                  key={current?.id ?? `${index}`}
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
                  role="button"
                  aria-label="Carte (swipe pour suivant)"
                >
                  {isRare ? <span className="edgeGlow" aria-hidden="true" /> : null}

                  {/* ✅ 11ème FX */}
                  {isSurprise11 ? <span className="surpriseRing" aria-hidden="true" /> : null}
                  {isSurprise11 ? <span className="surpriseSparkles" aria-hidden="true" /> : null}
                  {isSurprise11 ? <span className="surpriseShine" aria-hidden="true" /> : null}

                  {/* ✅ NEW overlay (ne casse plus la taille) */}
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
                <span>Résumé</span>

                {/* ✅ gain total UNIQUEMENT ici */}
                <span className="summaryCreditsPill">Gain total : +{computedTotalCredits} crédits</span>
              </div>

              <div className="summaryGrid">
                {cards.map((c, i) => {
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
                      key={c?.id ?? `${c?.key ?? "c"}-${i}`}
                      className={["summaryCardWrap", cls, rare ? "is-rare" : "", isNew ? "is-new" : ""].join(" ")}
                    >
                      {rare ? <span className="edgeGlow edgeGlow--summary" aria-hidden="true" /> : null}
                      {isNew ? <span className="summaryNewTag">NOUVELLE</span> : null}

                      {/* ✅ crédits carte en overlay (sinon ça “réduit” l’image) */}
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
                <button className="btn btn--primary" onClick={openAnother} disabled={openingLock}>
                  {fxTestEnabled ? "Rejouer (TEST FX)" : openAnotherLabel}
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