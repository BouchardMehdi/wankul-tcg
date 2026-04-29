import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Collection.css";

import AppNavbar from "../components/AppNavbar";
import MarketPriceChart from "../components/MarketPriceChart";
import SmartImage from "../components/SmartImage";

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
const COLLECTION_META_KEY = "wankul_collection_meta_v1";

type Filters = {
  q: string;
  season: string;
  rarity: string;
  type: string;
  artist: string;
  tag: string;
  ownedOnly: boolean;
};

type CollectionView = "all" | "objective" | "missing" | "duplicates" | "favorites";
type CollectionPanel = "cards" | "stats";

type CollectionMeta = {
  favoriteIds: number[];
  objectiveIds: number[];
  tagsById: Record<string, string[]>;
};

type QuickSellModalState = {
  open: boolean;
  card: any | null;
  sellable: SellableCardRow | null;
  quantity: string;
  submitting: boolean;
  error: string;
};

type TagModalState = {
  open: boolean;
  card: any | null;
  value: string;
};

function uniqSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v.trim().length > 0)),
  ).sort((a, b) => a.localeCompare(b));
}

function uniqueNumbers(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
}

function uniqueTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const tag = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag.slice(0, 24));
  }

  return out.slice(0, 8);
}

function readCollectionMeta(): CollectionMeta {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLECTION_META_KEY) || "{}");
    const tagsById: Record<string, string[]> = {};

    for (const [id, tags] of Object.entries(raw?.tagsById ?? {})) {
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) continue;
      tagsById[String(numericId)] = uniqueTags(tags);
    }

    return {
      favoriteIds: uniqueNumbers(raw?.favoriteIds),
      objectiveIds: uniqueNumbers(raw?.objectiveIds),
      tagsById,
    };
  } catch {
    return {
      favoriteIds: [],
      objectiveIds: [],
      tagsById: {},
    };
  }
}

function writeCollectionMeta(meta: CollectionMeta) {
  localStorage.setItem(COLLECTION_META_KEY, JSON.stringify(meta));
}

function rarityRankLabel(rarity?: string | null) {
  const raw = String(rarity ?? "");
  const key = normalizeRarity(raw);

  switch (key) {
    case "starter":
      return 0;
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
    case "booster-gold":
      return 9;
    default:
      break;
  }

  const s = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("terrain")) return 1;
  if (s.includes("commune") && s.includes("peu")) return 3;
  if (s.includes("commune")) return 2;
  if (s.includes("rare")) return 4;
  if (s.includes("ticket")) return 10;
  return 99;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
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
  if (isLegendary && (s.includes("or") || s.includes("gold") || s.includes("doree"))) return "leg-gold";

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
  const [activePanel, setActivePanel] = useState<CollectionPanel>("cards");
  const [activeView, setActiveView] = useState<CollectionView>("all");

  const [allCards, setAllCards] = useState<CardDto[]>([]);
  const [ownedRows, setOwnedRows] = useState<OwnedCardRow[]>([]);
  const [sellableRows, setSellableRows] = useState<SellableCardRow[]>([]);
  const [collectionMeta, setCollectionMeta] = useState<CollectionMeta>(() =>
    readCollectionMeta(),
  );

  const [filters, setFilters] = useState<Filters>({
    q: "",
    season: "",
    rarity: "",
    type: "",
    artist: "",
    tag: "",
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

  const [tagModal, setTagModal] = useState<TagModalState>({
    open: false,
    card: null,
    value: "",
  });

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  useEffect(() => {
    writeCollectionMeta(collectionMeta);
  }, [collectionMeta]);

  useEffect(() => {
    if (selectForMarket || quickSellMode) {
      setFilters((prev) => ({ ...prev, ownedOnly: true }));
      setActivePanel("cards");
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
        getMySellableCards().catch(() => []),
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

  const favoriteIds = useMemo(
    () => new Set(collectionMeta.favoriteIds),
    [collectionMeta.favoriteIds],
  );

  const objectiveIds = useMemo(
    () => new Set(collectionMeta.objectiveIds),
    [collectionMeta.objectiveIds],
  );

  function getCardTags(cardId: number) {
    return collectionMeta.tagsById[String(cardId)] ?? [];
  }

  const merged: any[] = useMemo(() => {
    const list = (allCards as any[]).map((c) => ({
      ...c,
      quantity: ownedMap.get(c.id) ?? 0,
      isSellable: sellableMap.has(Number(c.id)),
      sellableRow: sellableMap.get(Number(c.id)) ?? null,
      isFavorite: favoriteIds.has(Number(c.id)),
      isObjective: objectiveIds.has(Number(c.id)),
      personalTags: collectionMeta.tagsById[String(c.id)] ?? [],
    }));
    list.sort(compareCards);
    return list;
  }, [allCards, ownedMap, sellableMap, favoriteIds, objectiveIds, collectionMeta.tagsById]);

  const options = useMemo(() => {
    const seasons = uniqSeasonOptions(merged);
    const rarities = uniqSorted(merged.map((c) => c.rarity));
    const types = uniqSorted(merged.map((c) => c.type ?? ""));
    const artists = uniqSorted(merged.map((c) => c.artist ?? ""));
    const tags = uniqSorted(
      merged.flatMap((c) => (Array.isArray(c.personalTags) ? c.personalTags : [])),
    );
    return { seasons, rarities, types, artists, tags };
  }, [merged]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return merged.filter((c) => {
      const owned = (c.quantity ?? 0) > 0;
      const isDuplicate = (c.quantity ?? 0) > 1;
      const usefulDuplicate =
        Number(c.sellableRow?.sellableQuantity ?? 0) > 0 || isDuplicate;

      if (
        activeView !== "missing" &&
        activeView !== "objective" &&
        (filters.ownedOnly || settings.hideMissingCards) &&
        !owned
      ) {
        return false;
      }
      if (activeView === "missing" && owned) return false;
      if (activeView === "duplicates" && !usefulDuplicate) return false;
      if (activeView === "favorites" && !c.isFavorite) return false;
      if (activeView === "objective" && !c.isObjective) return false;

      if (filters.season && (c.season ?? c.extension ?? "") !== filters.season) return false;
      if (filters.rarity && (c.rarity ?? "") !== filters.rarity) return false;
      if (filters.type && (c.type ?? "") !== filters.type) return false;
      if (filters.artist && (c.artist ?? "") !== filters.artist) return false;
      if (filters.tag && !(c.personalTags ?? []).some((tag: string) => tag === filters.tag)) {
        return false;
      }

      if (q) {
        const hay =
          `${c.name} ${c.key ?? ""} ${c.number ?? ""} ${c.rarity ?? ""} ${c.type ?? ""} ${c.artist ?? ""} ${(c.personalTags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [merged, filters, activeView, settings.hideMissingCards]);

  const collectionStats = useMemo(() => {
    const totalCards = merged.length;
    const ownedCards = merged.filter((card) => (card.quantity ?? 0) > 0);
    const missingCards = merged.filter((card) => (card.quantity ?? 0) <= 0);
    const duplicateCards = merged.filter((card) => (card.quantity ?? 0) > 1);
    const sellableDuplicateCards = merged.filter(
      (card) => Number(card.sellableRow?.sellableQuantity ?? 0) > 0,
    );
    const objectiveCards = merged.filter((card) => card.isObjective);
    const objectiveOwned = objectiveCards.filter((card) => (card.quantity ?? 0) > 0);

    return {
      totalCards,
      ownedUnique: ownedCards.length,
      missing: missingCards.length,
      completion: percent(ownedCards.length, totalCards),
      totalCopies: ownedCards.reduce((sum, card) => sum + Number(card.quantity ?? 0), 0),
      duplicateUnique: duplicateCards.length,
      duplicateCopies: duplicateCards.reduce(
        (sum, card) => sum + Math.max(0, Number(card.quantity ?? 0) - 1),
        0,
      ),
      usefulDuplicates: sellableDuplicateCards.length || duplicateCards.length,
      favorites: collectionMeta.favoriteIds.length,
      objectives: objectiveCards.length,
      objectiveOwned: objectiveOwned.length,
      objectiveCompletion: percent(objectiveOwned.length, objectiveCards.length),
    };
  }, [merged, collectionMeta.favoriteIds.length]);

  const seasonProgress = useMemo(() => {
    const map = new Map<
      string,
      { label: string; season?: string | null; extension?: string | null; seasonNumber?: number | null; total: number; owned: number }
    >();

    for (const card of merged) {
      const label = card.season ?? card.extension ?? "Hors serie";
      const entry =
        map.get(label) ??
        {
          label,
          season: card.season ?? null,
          extension: card.extension ?? null,
          seasonNumber: card.seasonNumber ?? null,
          total: 0,
          owned: 0,
        };
      entry.total += 1;
      if ((card.quantity ?? 0) > 0) entry.owned += 1;
      map.set(label, entry);
    }

    return Array.from(map.values()).sort((a, b) => {
      const rank = seasonRank(a.season, a.extension, a.seasonNumber) - seasonRank(b.season, b.extension, b.seasonNumber);
      if (rank !== 0) return rank;
      return a.label.localeCompare(b.label);
    });
  }, [merged]);

  const rarityProgress = useMemo(() => {
    const source = filters.season
      ? merged.filter((card) => (card.season ?? card.extension ?? "") === filters.season)
      : merged;
    const map = new Map<string, { rarity: string; total: number; owned: number }>();

    for (const card of source) {
      const rarity = card.rarity ?? "Inconnue";
      const entry = map.get(rarity) ?? { rarity, total: 0, owned: 0 };
      entry.total += 1;
      if ((card.quantity ?? 0) > 0) entry.owned += 1;
      map.set(rarity, entry);
    }

    return Array.from(map.values()).sort((a, b) => {
      const rank = rarityRankLabel(a.rarity) - rarityRankLabel(b.rarity);
      if (rank !== 0) return rank;
      return a.rarity.localeCompare(b.rarity);
    });
  }, [merged, filters.season]);

  const missingHighlights = useMemo(() => {
    return merged
      .filter((card) => (card.quantity ?? 0) <= 0)
      .sort((a, b) => {
        const rarity = rarityRankLabel(b.rarity) - rarityRankLabel(a.rarity);
        if (rarity !== 0) return rarity;
        return compareCards(a, b);
      })
      .slice(0, 6);
  }, [merged]);

  const usefulDuplicateHighlights = useMemo(() => {
    return merged
      .filter((card) => (card.quantity ?? 0) > 1)
      .sort((a, b) => {
        const value =
          Number(b.sellableRow?.quickSellTotalPrice ?? 0) -
          Number(a.sellableRow?.quickSellTotalPrice ?? 0);
        if (value !== 0) return value;
        return Number(b.quantity ?? 0) - Number(a.quantity ?? 0);
      })
      .slice(0, 6);
  }, [merged]);

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

  function resetPaging() {
    setPage(1);
    setPageInput("1");
  }

  function switchCollectionPanel(panel: CollectionPanel) {
    void primeSound();
    setActivePanel(panel);
    resetPaging();
  }

  function setCollectionView(view: CollectionView, openCards = true) {
    void primeSound();
    setActiveView(view);
    if (openCards) setActivePanel("cards");
    resetPaging();
  }

  function toggleFavorite(cardId: number) {
    void primeSound();
    setCollectionMeta((prev) => {
      const ids = new Set(prev.favoriteIds);
      if (ids.has(cardId)) ids.delete(cardId);
      else ids.add(cardId);

      return {
        ...prev,
        favoriteIds: Array.from(ids).sort((a, b) => a - b),
      };
    });
  }

  function toggleObjective(cardId: number) {
    void primeSound();
    setCollectionMeta((prev) => {
      const ids = new Set(prev.objectiveIds);
      if (ids.has(cardId)) ids.delete(cardId);
      else ids.add(cardId);

      return {
        ...prev,
        objectiveIds: Array.from(ids).sort((a, b) => a - b),
      };
    });
  }

  function openTagModal(card: any) {
    void primeSound();
    setTagModal({
      open: true,
      card,
      value: getCardTags(Number(card.id)).join(", "),
    });
  }

  function closeTagModal() {
    setTagModal({ open: false, card: null, value: "" });
  }

  function saveTagModal() {
    if (!tagModal.card) return;
    void primeSound();

    const cardId = Number(tagModal.card.id);
    const tags = uniqueTags(
      tagModal.value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    );

    setCollectionMeta((prev) => {
      const tagsById = { ...prev.tagsById };
      if (tags.length) tagsById[String(cardId)] = tags;
      else delete tagsById[String(cardId)];

      return {
        ...prev,
        tagsById,
      };
    });

    closeTagModal();
  }

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
  const showCollectionPanels = !selectForMarket && !quickSellMode;
  const showCardsPanel = !showCollectionPanels || activePanel === "cards";

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

            {!loading && !error && showCollectionPanels && (
              <div className="collectionPanelSwitch" role="tablist" aria-label="Panneaux collection">
                <button
                  type="button"
                  className={["collectionPanelSwitch__btn", activePanel === "cards" ? "is-active" : ""].join(" ")}
                  onClick={() => switchCollectionPanel("cards")}
                  role="tab"
                  aria-selected={activePanel === "cards"}
                >
                  Collection
                  <span>{total}</span>
                </button>
                <button
                  type="button"
                  className={["collectionPanelSwitch__btn", activePanel === "stats" ? "is-active" : ""].join(" ")}
                  onClick={() => switchCollectionPanel("stats")}
                  role="tab"
                  aria-selected={activePanel === "stats"}
                >
                  Stats & objectifs
                  <span>{collectionStats.completion}%</span>
                </button>
              </div>
            )}

            {!loading && !error && showCollectionPanels && activePanel === "stats" && (
              <div className="collectionQualityPanel">
                <div className="collectionQualityHero">
                  <div>
                    <span className="collectionQualityHero__eyebrow">Objectif collection</span>
                    <h3>{collectionStats.completion}% completee</h3>
                    <p>
                      {collectionStats.ownedUnique}/{collectionStats.totalCards} cartes uniques • {collectionStats.missing} manquantes • {collectionStats.duplicateCopies} doublons.
                    </p>
                  </div>
                  <div className="collectionQualityHero__ring" style={{ ["--progress" as any]: `${collectionStats.completion}%` }}>
                    <strong>{collectionStats.completion}%</strong>
                    <span>global</span>
                  </div>
                </div>

                <div className="collectionViewSwitch collectionViewSwitch--filters" role="tablist" aria-label="Vues de collection">
                  {[
                    { view: "all" as const, label: "Tout", count: collectionStats.totalCards },
                    { view: "objective" as const, label: "Objectifs", count: collectionStats.objectives },
                    { view: "missing" as const, label: "Manquantes", count: collectionStats.missing },
                    { view: "duplicates" as const, label: "Doublons utiles", count: collectionStats.usefulDuplicates },
                    { view: "favorites" as const, label: "Favoris", count: collectionStats.favorites },
                  ].map(({ view, label, count }) => (
                    <button
                      key={view}
                      type="button"
                      className={["collectionViewSwitch__btn", activeView === view ? "is-active" : ""].join(" ")}
                      onClick={() => setCollectionView(view, true)}
                      role="tab"
                      aria-selected={activeView === view}
                    >
                      {label}
                      <span>{count}</span>
                    </button>
                  ))}
                </div>

                <div className="collectionStatsGrid">
                  <div>
                    <span>Copies totales</span>
                    <b>{collectionStats.totalCopies}</b>
                  </div>
                  <div>
                    <span>Objectifs valides</span>
                    <b>{collectionStats.objectiveOwned}/{collectionStats.objectives}</b>
                  </div>
                  <div>
                    <span>Favoris</span>
                    <b>{collectionStats.favorites}</b>
                  </div>
                  <div>
                    <span>Doublons vendables</span>
                    <b>{collectionStats.usefulDuplicates}</b>
                  </div>
                </div>

                <div className="collectionProgressGrid">
                  <div className="collectionProgressCard">
                    <div className="collectionProgressCard__head">
                      <strong>Progression par saison</strong>
                      <span>{seasonProgress.length} sets</span>
                    </div>
                    <div className="collectionProgressList">
                      {seasonProgress.slice(0, 6).map((row) => (
                        <button
                          key={row.label}
                          type="button"
                          className="collectionProgressRow"
                          onClick={() => {
                            setActivePanel("cards");
                            updateFilter("season", row.label);
                          }}
                        >
                          <span>{row.label}</span>
                          <b>{row.owned}/{row.total}</b>
                          <i style={{ ["--progress" as any]: `${percent(row.owned, row.total)}%` }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="collectionProgressCard">
                    <div className="collectionProgressCard__head">
                      <strong>Progression par rarete</strong>
                      <span>{filters.season || "Global"}</span>
                    </div>
                    <div className="collectionProgressList">
                      {rarityProgress.map((row) => (
                        <button
                          key={row.rarity}
                          type="button"
                          className="collectionProgressRow"
                          onClick={() => {
                            setActivePanel("cards");
                            updateFilter("rarity", row.rarity);
                          }}
                        >
                          <span>{row.rarity}</span>
                          <b>{row.owned}/{row.total}</b>
                          <i style={{ ["--progress" as any]: `${percent(row.owned, row.total)}%` }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="collectionFocusCard">
                    <div className="collectionProgressCard__head">
                      <strong>Cartes a chasser</strong>
                      <span>{missingHighlights.length}</span>
                    </div>
                    <div className="collectionMiniRail">
                      {missingHighlights.map((card) => (
                        <button
                          key={`missing-${card.id}`}
                          type="button"
                          className="collectionMiniCard"
                          onClick={() => {
                            setActiveView("missing");
                            setActivePanel("cards");
                            updateFilter("q", card.name ?? "");
                          }}
                        >
                          <SmartImage src={resolveImg(card.imageUrl ?? card.image ?? card.img ?? "")} alt={card.name} />
                          <span>{card.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="collectionFocusCard">
                    <div className="collectionProgressCard__head">
                      <strong>Doublons utiles</strong>
                      <span>{usefulDuplicateHighlights.length}</span>
                    </div>
                    <div className="collectionMiniRail">
                      {usefulDuplicateHighlights.map((card) => (
                        <button
                          key={`duplicate-${card.id}`}
                          type="button"
                          className="collectionMiniCard"
                          onClick={() => {
                            setActiveView("duplicates");
                            setActivePanel("cards");
                            updateFilter("q", card.name ?? "");
                          }}
                        >
                          <SmartImage src={resolveImg(card.imageUrl ?? card.image ?? card.img ?? "")} alt={card.name} />
                          <span>x{card.quantity} • {card.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showCardsPanel && (
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

                <div className="filterGroup">
                  <label className="filterLabel">Tag perso</label>
                  <select
                    className="filterSelect"
                    value={filters.tag}
                    onChange={(e) => updateFilter("tag", e.target.value)}
                  >
                    <option value="">Tous</option>
                    {options.tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
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
                        tag: "",
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
            )}

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

          {!loading && !error && showCardsPanel && (
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

          {!loading && !error && showCardsPanel && (
            <div
              className={`collectionBody ${settings.disableHoloEffects ? "collectionBody--noHolo" : ""}`}
            >
              <div
                className={`cardsGrid ${layoutClass} ${settings.disableHoloEffects ? "cardsGrid--noHolo" : ""}`}
              >
                {pageItems.map((c: any, index) => {
                  const owned = (c.quantity ?? 0) > 0;
                  const src = resolveImg(c.imageUrl ?? c.image ?? c.img ?? "");
                  const priorityImage = index < 8;
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
                  const isFavorite = Boolean(c.isFavorite);
                  const isObjective = Boolean(c.isObjective);
                  const personalTags = Array.isArray(c.personalTags) ? c.personalTags : [];
                  const sellableQuantity = Number(c.sellableRow?.sellableQuantity ?? 0);

                  return (
                    <div
                      key={c.id}
                      className={`cardTile ${owned ? "" : "is-locked"} ${settings.disableHoloEffects ? "" : rarityCls} ${
                        isTerrain ? "cardTile--terrain" : ""
                      } ${isLatestNew ? "is-latest-new" : ""} ${
                        selectForMarket || quickSellMode ? "cardTile--selectMode" : ""
                      } ${isSellable ? "cardTile--sellable" : ""} ${
                        isSelectableDisabled ? "cardTile--notSellable" : ""
                      } ${isFavorite ? "cardTile--favorite" : ""} ${
                        isObjective ? "cardTile--objective" : ""
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
                            <SmartImage
                              className="cardTile__img"
                              src={src}
                              alt={c.name}
                              loading={priorityImage ? "eager" : "lazy"}
                              fetchPriority={priorityImage ? "high" : "low"}
                            />
                          </button>
                        ) : quickSellMode ? (
                          <button
                            type="button"
                            className="cardTile__selectBtn"
                            disabled={!isSellable}
                            onClick={() => openQuickSellModal(c)}
                          >
                            <SmartImage
                              className="cardTile__img"
                              src={src}
                              alt={c.name}
                              loading={priorityImage ? "eager" : "lazy"}
                              fetchPriority={priorityImage ? "high" : "low"}
                            />
                          </button>
                        ) : owned ? (
                          <a
                            className="cardTile__zoom"
                            href={src}
                            data-fancybox="wankul-cards"
                            data-caption={`${c.name}${c.rarity ? ` • ${c.rarity}` : ""}`}
                            data-terrain={isTerrain ? "1" : "0"}
                          >
                            <SmartImage
                              className="cardTile__img"
                              src={src}
                              alt={c.name}
                              loading={priorityImage ? "eager" : "lazy"}
                              fetchPriority={priorityImage ? "high" : "low"}
                            />
                          </a>
                        ) : (
                          <SmartImage
                            className="cardTile__img"
                            src={src}
                            alt={c.name}
                            loading={priorityImage ? "eager" : "lazy"}
                            fetchPriority={priorityImage ? "high" : "low"}
                          />
                        )}

                        {!owned && <div className="cardTile__dim" />}
                        {!owned && <div className="cardTile__lock">NON DÉBLOQUÉE</div>}
                        {isLatestNew && <div className="cardTile__new">NEW</div>}

                        {!selectForMarket && !quickSellMode && (
                          <div className="cardTile__collectorTools">
                            <button
                              type="button"
                              className={["cardTile__collectorBtn", isFavorite ? "is-active" : ""].join(" ")}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(Number(c.id));
                              }}
                              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                              title={isFavorite ? "Favori" : "Ajouter aux favoris"}
                            >
                              ★
                            </button>
                            <button
                              type="button"
                              className={["cardTile__collectorBtn", isObjective ? "is-active" : ""].join(" ")}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleObjective(Number(c.id));
                              }}
                              aria-label={isObjective ? "Retirer des objectifs" : "Ajouter aux objectifs"}
                              title={isObjective ? "Objectif suivi" : "Ajouter aux objectifs"}
                            >
                              ◎
                            </button>
                          </div>
                        )}

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
                          {isFavorite && <span className="pill pill--favorite">Favori</span>}
                          {isObjective && <span className="pill pill--objective">Objectif</span>}
                          {sellableQuantity > 0 && (
                            <span className="pill pill--duplicate">Vendable x{sellableQuantity}</span>
                          )}
                          {(selectForMarket || quickSellMode) && isSellable && (
                            <span className="pill pill--market">
                              {quickSellMode ? "Rapide" : "Vendable"}
                            </span>
                          )}
                        </div>

                        {personalTags.length > 0 && (
                          <div className="cardTile__tags">
                            {personalTags.map((tag: string) => (
                              <button
                                key={tag}
                                type="button"
                                className="cardTile__tag"
                                onClick={() => updateFilter("tag", tag)}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}

                        {!selectForMarket && !quickSellMode && (
                          <div className="cardTile__actions">
                            <button
                              className="btn btn-secondary cardTile__detailsBtn"
                              type="button"
                              onClick={() => openTagModal(c)}
                            >
                              Tags
                            </button>
                            <Link className="btn btn-secondary cardTile__detailsBtn" to={`/collection/card/${c.id}`}>
                              Voir plus
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {pageItems.length === 0 && (
                  <div className="collectionEmptyState">
                    <strong>Aucune carte ici pour le moment.</strong>
                    <span>Essaie de changer de vue, de retirer un filtre ou d'ajouter des objectifs/favoris.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && showCardsPanel && (
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

      {tagModal.open && tagModal.card && (
        <div className="collectionModalBackdrop" onClick={closeTagModal}>
          <div className="collectionTagModal" onClick={(e) => e.stopPropagation()}>
            <div className="collectionModal__head">
              <h3>Tags perso</h3>
              <button type="button" className="collectionModal__close" onClick={closeTagModal}>
                âœ•
              </button>
            </div>

            <div className="collectionTagModal__body">
              <strong>{tagModal.card.name}</strong>
              <p>
                Ajoute des tags separes par des virgules : hunt, echange, deck, coup de coeur...
              </p>
              <input
                value={tagModal.value}
                onChange={(e) => setTagModal((prev) => ({ ...prev, value: e.target.value }))}
                placeholder="ex: hunt, trade, rare preferee"
                autoFocus
              />
            </div>

            <div className="collectionModal__actions">
              <button type="button" className="btn" onClick={closeTagModal}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={saveTagModal}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <SmartImage
                    src={quickSellImg}
                    alt={quickSellModal.card.name}
                    loading="eager"
                    fetchPriority="high"
                  />
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
