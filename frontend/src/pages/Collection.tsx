import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Collection.css";

import AppNavbar from "../components/AppNavbar";
import MarketPriceChart from "../components/MarketPriceChart";

import { fetchAllCards, type CardDto } from "../api/cards";
import { fetchOwnedCollection, type OwnedCardRow } from "../api/collection";
import { getMySellableCards, quickSellCard, type SellableCardRow } from "../api/market";

import {
  readAppSettings,
  readLastNewCardIds,
  subscribeAppSettings,
} from "../utils/appSettings";
import { saveMarketCreateSelectedCardId } from "../utils/marketCreateSelection";
import {
  playActionDeniedSound,
  playSoundEffect,
  playUiErrorSound,
  primeSound,
} from "../utils/sound";

import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

const PAGE_SIZE = 25;
const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type Filters = {
  q: string;
  season: string;
  rarity: string;
  type: string;
  artist: string;
  ownedOnly: boolean;
};

type QuickSellModalState = {
  open: boolean;
  card: any | null;
  sellable: SellableCardRow | null;
  quantity: string;
  submitting: boolean;
  error: string;
};

function uniqSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v.trim().length > 0)),
  ).sort((a, b) => a.localeCompare(b));
}

function uniqSeasonOptions(cards: any[]) {
  return Array.from(
    new Map(
      cards
        .map((card) => ({
          label: (card.season ?? card.extension ?? "").trim(),
          season: card.season ?? null,
          extension: card.extension ?? null,
          seasonNumber: card.seasonNumber ?? null,
        }))
        .filter((entry) => entry.label.length > 0)
        .map((entry) => [entry.label, entry]),
    ).values(),
  )
    .sort((a, b) => {
      const rank =
        seasonRank(a.season, a.extension, a.seasonNumber) -
        seasonRank(b.season, b.extension, b.seasonNumber);
      if (rank !== 0) return rank;
      return a.label.localeCompare(b.label);
    })
    .map((entry) => entry.label);
}

function seasonRank(
  season?: string | null,
  extension?: string | null,
  seasonNumber?: number | null,
) {
  if (typeof seasonNumber === "number" && seasonNumber > 0) return seasonNumber;
  const s = (season ?? extension ?? "").toLowerCase();
  if (s.includes("origins")) return 1;
  if (s.includes("campus")) return 2;
  if (s.includes("battle")) return 3;
  if (s.includes("stellar")) return 4;
  return 99;
}

function compareCards(a: any, b: any) {
  const sa = seasonRank(a.season, a.extension, a.seasonNumber ?? null);
  const sb = seasonRank(b.season, b.extension, b.seasonNumber ?? null);
  if (sa !== sb) return sa - sb;

  const na = typeof a.number === "number" ? a.number : 999999;
  const nb = typeof b.number === "number" ? b.number : 999999;
  if (na !== nb) return na - nb;

  return (a.key ?? "").localeCompare(b.key ?? "");
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

  if (
    s.includes("booster gold") ||
    (s.includes("booster") && s.includes("gold")) ||
    s === "gold"
  ) {
    return "booster-gold";
  }

  if (s.includes("u1") || s.includes("ultra rare u1") || s.includes("ultra rare 1") || s.includes("ultra 1")) {
    return "u1";
  }
  if (s.includes("u2") || s.includes("ultra rare u2") || s.includes("ultra rare 2") || s.includes("ultra 2")) {
    return "u2";
  }

  const isLegendary = s.includes("legendaire") || s.includes("legendary") || s.startsWith("leg ");
  if (isLegendary && s.includes("bronze")) return "leg-bronze";
  if (isLegendary && (s.includes("argent") || s.includes("silver"))) return "leg-silver";
  if (isLegendary && (s.includes("or") || s.includes("gold"))) return "leg-gold";

  return "";
}

function handleImgParallaxMove(e: MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();

  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  const dx = x - 0.5;
  const dy = y - 0.5;

  const max = 10;
  const ry = dx * max * 2;
  const rx = -dy * max * 2;

  el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
  el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
  el.style.setProperty("--hx", `${(x * 100).toFixed(1)}%`);
  el.style.setProperty("--hy", `${(y * 100).toFixed(1)}%`);
}

function handleImgParallaxLeave(e: MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  el.style.setProperty("--rx", `0deg`);
  el.style.setProperty("--ry", `0deg`);
  el.style.setProperty("--hx", `50%`);
  el.style.setProperty("--hy", `50%`);
}

function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function getCardDisplayNumber(card: any) {
  if (card?.key) return String(card.key);
  if (typeof card?.number === "number") return `#${card.number}`;
  if (typeof card?.number === "string" && card.number.trim()) return card.number.trim();
  return `#${card?.id ?? "—"}`;
}

function getCardDisplaySeason(card: any) {
  return card?.season ?? card?.extension ?? "—";
}

function getCardDisplayType(card: any) {
  return card?.type ?? "—";
}

type PagerProps = {
  pageSafe: number;
  totalPages: number;
  pageInput: string;
  setPageInput: (v: string) => void;
  goPrev: () => void;
  goNext: () => void;
  jumpToPage: () => void;
};

function Pager({
  pageSafe,
  totalPages,
  pageInput,
  setPageInput,
  goPrev,
  goNext,
  jumpToPage,
}: PagerProps) {
  return (
    <div className="pager">
      <button className="btn" onClick={goPrev} disabled={pageSafe <= 1}>
        ⟨
      </button>
      <button className="btn" onClick={goNext} disabled={pageSafe >= totalPages}>
        ⟩
      </button>

      <div className="pagerJump">
        <span className="pageHint">Page</span>
        <input
          className="pageInput"
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") jumpToPage();
          }}
        />
        <span className="pageHint">/ {totalPages}</span>
        <button className="btn btn-primary" onClick={jumpToPage}>
          Go
        </button>
      </div>
    </div>
  );
}

export default function Collection() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const selectForMarket = searchParams.get("selectForMarket") === "1";
  const quickSellMode = searchParams.get("quickSellMode") === "1";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [globalFeedback, setGlobalFeedback] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const [allCards, setAllCards] = useState<CardDto[]>([]);
  const [ownedRows, setOwnedRows] = useState<OwnedCardRow[]>([]);
  const [sellableRows, setSellableRows] = useState<SellableCardRow[]>([]);

  const [filters, setFilters] = useState<Filters>({
    q: "",
    season: "",
    rarity: "",
    type: "",
    artist: "",
    ownedOnly: selectForMarket || quickSellMode,
  });
  const [settings, setSettings] = useState(() => readAppSettings());
  const [lastNewCardIds, setLastNewCardIds] = useState<number[]>(() =>
    readLastNewCardIds(),
  );

  const [quickSellModal, setQuickSellModal] = useState<QuickSellModalState>({
    open: false,
    card: null,
    sellable: null,
    quantity: "1",
    submitting: false,
    error: "",
  });

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  useEffect(() => {
    if (selectForMarket || quickSellMode) {
      setFilters((prev) => ({ ...prev, ownedOnly: true }));
    }
  }, [selectForMarket, quickSellMode]);

  useEffect(() => {
    if (selectForMarket || quickSellMode) return;

    const fb: any = Fancybox;

    fb.bind('[data-fancybox="wankul-cards"]', {
      groupAll: true,
      hideScrollbar: true,
      dragToClose: false,
      Images: { zoom: true },
      Thumbs: { autoStart: true },
    });

    let rafId = 0;
    const tick = () => {
      try {
        const instance = fb.getInstance?.();
        if (instance) {
          const slide = instance.getSlide?.();
          if (slide?.el) {
            if (Array.isArray(instance.slides)) {
              for (const s of instance.slides) {
                s?.el?.classList?.remove("fb-terrain-rotate");
              }
            }

            const triggerEl = slide?.triggerEl as HTMLElement | null;
            const isTerrain = triggerEl?.dataset?.terrain === "1";
            slide.el.classList.toggle("fb-terrain-rotate", !!isTerrain);
          }
        }
      } catch {
        //
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      try {
        fb.destroy();
      } catch {
        //
      }
    };
  }, [selectForMarket, quickSellMode]);

  useEffect(() => {
    const syncLatest = () => setLastNewCardIds(readLastNewCardIds());
    window.addEventListener("storage", syncLatest);
    window.addEventListener("focus", syncLatest);
    return () => {
      window.removeEventListener("storage", syncLatest);
      window.removeEventListener("focus", syncLatest);
    };
  }, []);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setPageInput("1");
  };

  const load = async () => {
    setLoading(true);
    setError("");
    setGlobalFeedback("");
    try {
      const [cardsRes, ownedRes, sellableRes] = await Promise.all([
        fetchAllCards(),
        fetchOwnedCollection(),
        selectForMarket || quickSellMode ? getMySellableCards() : Promise.resolve([]),
      ]);

      setAllCards(Array.isArray(cardsRes) ? cardsRes : []);
      setOwnedRows(Array.isArray(ownedRes) ? ownedRes : []);
      setSellableRows(Array.isArray(sellableRes) ? sellableRes : []);
    } catch (e: any) {
      playUiErrorSound();
      setError(e?.message || "Impossible de charger la collection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectForMarket, quickSellMode]);

  const sellableMap = useMemo(() => {
    const map = new Map<number, SellableCardRow>();
    for (const row of sellableRows) {
      map.set(row.cardId, row);
    }
    return map;
  }, [sellableRows]);

  const ownedMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const row of ownedRows as any[]) {
      const id = row?.card?.id;
      if (typeof id === "number") m.set(id, Number(row.quantity ?? 0));
    }
    return m;
  }, [ownedRows]);

  const merged: any[] = useMemo(() => {
    const list = (allCards as any[]).map((c) => ({
      ...c,
      quantity: ownedMap.get(c.id) ?? 0,
      isSellable: sellableMap.has(Number(c.id)),
      sellableRow: sellableMap.get(Number(c.id)) ?? null,
    }));
    list.sort(compareCards);
    return list;
  }, [allCards, ownedMap, sellableMap]);

  const options = useMemo(() => {
    const seasons = uniqSeasonOptions(merged);
    const rarities = uniqSorted(merged.map((c) => c.rarity));
    const types = uniqSorted(merged.map((c) => c.type ?? ""));
    const artists = uniqSorted(merged.map((c) => c.artist ?? ""));
    return { seasons, rarities, types, artists };
  }, [merged]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return merged.filter((c) => {
      const owned = (c.quantity ?? 0) > 0;

      if ((filters.ownedOnly || settings.hideMissingCards) && !owned) return false;
      if (filters.season && (c.season ?? c.extension ?? "") !== filters.season) return false;
      if (filters.rarity && (c.rarity ?? "") !== filters.rarity) return false;
      if (filters.type && (c.type ?? "") !== filters.type) return false;
      if (filters.artist && (c.artist ?? "") !== filters.artist) return false;

      if (q) {
        const hay =
          `${c.name} ${c.key ?? ""} ${c.number ?? ""} ${c.rarity ?? ""} ${c.type ?? ""} ${c.artist ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [merged, filters, settings.hideMissingCards]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      setPageInput(String(totalPages));
    }
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  const goPrev = () => {
    setPage((p) => {
      const next = Math.max(1, p - 1);
      setPageInput(String(next));
      return next;
    });
  };

  const goNext = () => {
    setPage((p) => {
      const next = Math.min(totalPages, p + 1);
      setPageInput(String(next));
      return next;
    });
  };

  const jumpToPage = () => {
    const n = Number(pageInput);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(1, Math.floor(n)), totalPages);
    setPage(clamped);
    setPageInput(String(clamped));
  };

  const layoutClass =
    settings.collectionLayout === "compact"
      ? "cardsGrid--compact"
      : settings.collectionLayout === "large"
        ? "cardsGrid--large"
        : "cardsGrid--standard";

  function handleSelectForMarket(cardId: number, isSellable: boolean) {
    if (!selectForMarket || !isSellable) return;

    saveMarketCreateSelectedCardId(cardId);
    navigate("/market/create", {
      state: { marketSelectedCardId: cardId },
    });
  }

  function openQuickSellModal(card: any) {
    const sellable = sellableMap.get(Number(card.id)) ?? null;
    if (!quickSellMode || !sellable) return;

    setQuickSellModal({
      open: true,
      card,
      sellable,
      quantity: "1",
      submitting: false,
      error: "",
    });
  }

  function closeQuickSellModal() {
    if (quickSellModal.submitting) return;
    setQuickSellModal({
      open: false,
      card: null,
      sellable: null,
      quantity: "1",
      submitting: false,
      error: "",
    });
  }

  async function confirmQuickSell() {
    if (!quickSellModal.card || !quickSellModal.sellable) return;
    void primeSound();

    const qty = Number(quickSellModal.quantity);
    const max = quickSellModal.sellable.sellableQuantity;

    if (!Number.isInteger(qty) || qty < 1 || qty > max) {
      playActionDeniedSound();
      setQuickSellModal((prev) => ({
        ...prev,
        error: `La quantité doit être comprise entre 1 et ${max}.`,
      }));
      return;
    }

    try {
      setQuickSellModal((prev) => ({
        ...prev,
        submitting: true,
        error: "",
      }));

      await quickSellCard(quickSellModal.sellable.cardId, qty);
      playSoundEffect("market.sell");

      const totalCredits = quickSellModal.sellable.quickSellUnitPrice * qty;
      closeQuickSellModal();
      setGlobalFeedback(
        `${qty} exemplaire(s) de ${quickSellModal.card.name} vendu(s) pour ${totalCredits} crédits.`,
      );
      await load();
    } catch (e: any) {
      playUiErrorSound();
      setQuickSellModal((prev) => ({
        ...prev,
        submitting: false,
        error: e?.message || "Impossible d’effectuer la vente rapide.",
      }));
    }
  }

  const quickSellMax = quickSellModal.sellable?.sellableQuantity ?? 0;
  const quickSellUnitPrice = quickSellModal.sellable?.quickSellUnitPrice ?? 0;
  const quickSellMarketPrice = quickSellModal.sellable?.marketPrice ?? 0;
  const quickSellQty = Math.max(1, Number(quickSellModal.quantity || "1"));
  const quickSellTotal = quickSellUnitPrice * quickSellQty;
  const quickSellImg = resolveImg(
    quickSellModal.card?.imageUrl ??
      quickSellModal.card?.image ??
      quickSellModal.card?.img ??
      "",
  );

  return (
    <div className="app-shell">
      <AppNavbar currentPage="collection" />

      <section className="collectionPage">
        <div className="collectionShell">
          <div className="collectionHeader">
            <div className="section-title">
              <h2>
                {selectForMarket
                  ? "Choisir une carte à vendre"
                  : quickSellMode
                    ? "Choisir une carte pour vente rapide"
                    : "Collection"}
              </h2>
            </div>

            {selectForMarket && (
              <div className="collectionSelectBanner">
                <div>
                  Clique sur une carte <strong>vendable</strong> pour revenir à la
                  création d’annonce.
                </div>
                <Link className="btn" to="/market/create">
                  Retour à la création
                </Link>
              </div>
            )}

            {quickSellMode && (
              <div className="collectionSelectBanner collectionSelectBanner--quickSell">
                <div>
                  Clique sur une carte <strong>vendable</strong> pour ouvrir la
                  confirmation de vente rapide.
                </div>
                <Link className="btn" to="/market">
                  Retour au market
                </Link>
              </div>
            )}

            <div className="filterCard">
              <div className="filterRow">
                <div className="filterGroup">
                  <label className="filterLabel">Recherche</label>
                  <input
                    className="filterInput"
                    value={filters.q}
                    onChange={(e) => updateFilter("q", e.target.value)}
                    placeholder="Nom / numéro / mot clé…"
                  />
                </div>

                <div className="filterGroup">
                  <label className="filterLabel">Saison</label>
                  <select
                    className="filterSelect"
                    value={filters.season}
                    onChange={(e) => updateFilter("season", e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {options.seasons.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filterGroup">
                  <label className="filterLabel">Rareté</label>
                  <select
                    className="filterSelect"
                    value={filters.rarity}
                    onChange={(e) => updateFilter("rarity", e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {options.rarities.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filterGroup">
                  <label className="filterLabel">Type</label>
                  <select
                    className="filterSelect"
                    value={filters.type}
                    onChange={(e) => updateFilter("type", e.target.value)}
                  >
                    <option value="">Tous</option>
                    {options.types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filterGroup">
                  <label className="filterLabel">Artiste</label>
                  <select
                    className="filterSelect"
                    value={filters.artist}
                    onChange={(e) => updateFilter("artist", e.target.value)}
                  >
                    <option value="">Tous</option>
                    {options.artists.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filterRow filterRow--bottom">
                <label className="checkLine">
                  <input
                    type="checkbox"
                    checked={filters.ownedOnly}
                    onChange={(e) => updateFilter("ownedOnly", e.target.checked)}
                    disabled={selectForMarket || quickSellMode}
                  />
                  <span>Afficher uniquement les cartes débloquées</span>
                </label>

                <div className="filterActions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setFilters({
                        q: "",
                        season: "",
                        rarity: "",
                        type: "",
                        artist: "",
                        ownedOnly: selectForMarket || quickSellMode ? true : false,
                      });
                      setPage(1);
                      setPageInput("1");
                    }}
                  >
                    Réinitialiser
                  </button>
                  <button className="btn btn-primary" type="button" onClick={load}>
                    Rafraîchir
                  </button>
                </div>
              </div>
            </div>

            {globalFeedback && (
              <div className="mt-3">
                <div className="alert alert-success">{globalFeedback}</div>
              </div>
            )}

            {loading ? (
              <p className="mt-3">Chargement…</p>
            ) : error ? (
              <div className="mt-3">
                <div className="alert alert-error">{error}</div>
              </div>
            ) : null}
          </div>

          {!loading && !error && (
            <div className="collectionTopBar">
              <div className="small">
                Page <b>{pageSafe}</b> / <b>{totalPages}</b> • Total: <b>{total}</b>
              </div>

              <Pager
                pageSafe={pageSafe}
                totalPages={totalPages}
                pageInput={pageInput}
                setPageInput={setPageInput}
                goPrev={goPrev}
                goNext={goNext}
                jumpToPage={jumpToPage}
              />
            </div>
          )}

          {!loading && !error && (
            <div
              className={`collectionBody ${settings.disableHoloEffects ? "collectionBody--noHolo" : ""}`}
            >
              <div
                className={`cardsGrid ${layoutClass} ${settings.disableHoloEffects ? "cardsGrid--noHolo" : ""}`}
              >
                {pageItems.map((c: any) => {
                  const owned = (c.quantity ?? 0) > 0;
                  const src = resolveImg(c.imageUrl ?? c.image ?? c.img ?? "");
                  const rk = normalizeRarity(c.rarity);
                  const rarityCls = rk ? `rarity-${rk}` : "";

                  const isTerrain = String(c.type ?? "").toLowerCase().includes("terrain");
                  const isLatestNew =
                    settings.autoHighlightNewCards &&
                    owned &&
                    lastNewCardIds.includes(Number(c.id));

                  const isSellable = !!c.isSellable;
                  const isSelectableDisabled =
                    (selectForMarket || quickSellMode) && !isSellable;

                  return (
                    <div
                      key={c.id}
                      className={`cardTile ${owned ? "" : "is-locked"} ${settings.disableHoloEffects ? "" : rarityCls} ${
                        isTerrain ? "cardTile--terrain" : ""
                      } ${isLatestNew ? "is-latest-new" : ""} ${
                        selectForMarket || quickSellMode ? "cardTile--selectMode" : ""
                      } ${isSellable ? "cardTile--sellable" : ""} ${
                        isSelectableDisabled ? "cardTile--notSellable" : ""
                      }`}
                      data-rarity={rk}
                    >
                      <div
                        className="cardTile__imgWrap"
                        onMouseMove={
                          settings.disableHoloEffects ? undefined : handleImgParallaxMove
                        }
                        onMouseLeave={
                          settings.disableHoloEffects ? undefined : handleImgParallaxLeave
                        }
                        style={
                          {
                            ["--rx" as any]: "0deg",
                            ["--ry" as any]: "0deg",
                            ["--hx" as any]: "50%",
                            ["--hy" as any]: "50%",
                          } as any
                        }
                      >
                        {selectForMarket ? (
                          <button
                            type="button"
                            className="cardTile__selectBtn"
                            disabled={!isSellable}
                            onClick={() => handleSelectForMarket(Number(c.id), isSellable)}
                          >
                            <img className="cardTile__img" src={src} alt={c.name} />
                          </button>
                        ) : quickSellMode ? (
                          <button
                            type="button"
                            className="cardTile__selectBtn"
                            disabled={!isSellable}
                            onClick={() => openQuickSellModal(c)}
                          >
                            <img className="cardTile__img" src={src} alt={c.name} />
                          </button>
                        ) : owned ? (
                          <a
                            className="cardTile__zoom"
                            href={src}
                            data-fancybox="wankul-cards"
                            data-caption={`${c.name}${c.rarity ? ` • ${c.rarity}` : ""}`}
                            data-terrain={isTerrain ? "1" : "0"}
                          >
                            <img className="cardTile__img" src={src} alt={c.name} />
                          </a>
                        ) : (
                          <img className="cardTile__img" src={src} alt={c.name} />
                        )}

                        {!owned && <div className="cardTile__dim" />}
                        {!owned && <div className="cardTile__lock">NON DÉBLOQUÉE</div>}
                        {isLatestNew && <div className="cardTile__new">NEW</div>}

                        {(selectForMarket || quickSellMode) && (
                          <div
                            className={`cardTile__marketPick ${
                              isSellable ? "cardTile__marketPick--ok" : "cardTile__marketPick--off"
                            }`}
                          >
                            {isSellable
                              ? selectForMarket
                                ? "Sélectionner"
                                : "Vente rapide"
                              : "Non vendable"}
                          </div>
                        )}
                      </div>

                      <div className="cardTile__meta">
                        <div className="cardTile__name">{c.name}</div>
                        {settings.showDuplicatesCounter && owned && (c.quantity ?? 0) > 1 && (
                          <div className="cardTile__qty">x{c.quantity}</div>
                        )}

                        <div className="cardTile__sub">
                          <span className="pill">{c.rarity}</span>
                          <span className="pill">
                            {c.season ?? c.extension ?? "—"}{" "}
                            {typeof c.number === "number" ? `#${c.number}` : ""}
                          </span>
                          {(selectForMarket || quickSellMode) && isSellable && (
                            <span className="pill pill--market">
                              {quickSellMode ? "Rapide" : "Vendable"}
                            </span>
                          )}
                        </div>

                        {!selectForMarket && !quickSellMode && (
                          <div className="cardTile__actions">
                            <Link className="btn btn-secondary cardTile__detailsBtn" to={`/collection/card/${c.id}`}>
                              Voir plus
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="collectionBottomBar">
              <Pager
                pageSafe={pageSafe}
                totalPages={totalPages}
                pageInput={pageInput}
                setPageInput={setPageInput}
                goPrev={goPrev}
                goNext={goNext}
                jumpToPage={jumpToPage}
              />
            </div>
          )}
        </div>
      </section>

      {quickSellModal.open && quickSellModal.card && quickSellModal.sellable && (
        <div className="collectionModalBackdrop" onClick={closeQuickSellModal}>
          <div
            className="collectionModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="collectionModal__head">
              <h3>Confirmer la vente rapide</h3>
              <button
                type="button"
                className="collectionModal__close"
                onClick={closeQuickSellModal}
                disabled={quickSellModal.submitting}
              >
                ✕
              </button>
            </div>

            <div className="collectionModal__body">
              <div className="collectionModal__media">
                {quickSellImg ? (
                  <img src={quickSellImg} alt={quickSellModal.card.name} />
                ) : (
                  <div className="collectionModal__placeholder">Aucune image</div>
                )}
              </div>

              <div className="collectionModal__content">
                <strong className="collectionModal__title">
                  {quickSellModal.card.name}
                </strong>
                <p className="collectionModal__subtitle">
                  {getCardDisplayNumber(quickSellModal.card)} • {quickSellModal.card.rarity ?? "—"} •{" "}
                  {getCardDisplaySeason(quickSellModal.card)} • {getCardDisplayType(quickSellModal.card)}
                </p>

                <div className="collectionModal__grid">
                  <div>
                    <span>Numéro</span>
                    <strong>{getCardDisplayNumber(quickSellModal.card)}</strong>
                  </div>
                  <div>
                    <span>Rareté</span>
                    <strong>{quickSellModal.card.rarity ?? "—"}</strong>
                  </div>
                  <div>
                    <span>Saison</span>
                    <strong>{getCardDisplaySeason(quickSellModal.card)}</strong>
                  </div>
                  <div>
                    <span>Type</span>
                    <strong>{getCardDisplayType(quickSellModal.card)}</strong>
                  </div>
                  <div>
                    <span>Possédées</span>
                    <strong>{quickSellModal.sellable.totalQuantity}</strong>
                  </div>
                  <div>
                    <span>Max vendable</span>
                    <strong>{quickSellMax}</strong>
                  </div>
                  <div>
                    <span>Prix du marché</span>
                    <strong>{quickSellMarketPrice}</strong>
                  </div>
                  <div>
                    <span>Vente rapide / unité</span>
                    <strong>{quickSellUnitPrice}</strong>
                  </div>
                </div>

                <MarketPriceChart
                  cardId={quickSellModal.sellable.cardId}
                  title="Historique du prix du marché"
                  compact
                />

                <label className="collectionModal__field">
                  <span>Quantité à vendre</span>
                  <input
                    type="number"
                    min={1}
                    max={quickSellMax}
                    value={quickSellModal.quantity}
                    onChange={(e) =>
                      setQuickSellModal((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                        error: "",
                      }))
                    }
                  />
                </label>

                <div className="collectionModal__total">
                  <span>Gain estimé</span>
                  <strong>{quickSellTotal} crédits</strong>
                </div>

                {quickSellModal.error && (
                  <div className="collectionModal__error">{quickSellModal.error}</div>
                )}
              </div>
            </div>

            <div className="collectionModal__actions">
              <button
                type="button"
                className="btn"
                onClick={closeQuickSellModal}
                disabled={quickSellModal.submitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmQuickSell}
                disabled={quickSellModal.submitting}
              >
                {quickSellModal.submitting ? "Vente..." : "Confirmer la vente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
