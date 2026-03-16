import { useEffect, useMemo, useState, type MouseEvent } from "react";
import "../styles.css";
import "../styles/Collection.css";

import AppNavbar from "../components/AppNavbar";

import { fetchAllCards, type CardDto } from "../api/cards";
import { fetchOwnedCollection, type OwnedCardRow } from "../api/collection";

import { readAppSettings, readLastNewCardIds, subscribeAppSettings } from "../utils/appSettings";

import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

const PAGE_SIZE = 25;

type Filters = {
  q: string;
  season: string;
  rarity: string;
  type: string;
  artist: string;
  ownedOnly: boolean;
};

function uniqSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim().length > 0))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function seasonRank(season?: string | null, extension?: string | null, seasonNumber?: number | null) {
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

  if (s.includes("booster gold") || (s.includes("booster") && s.includes("gold")) || s === "gold") {
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

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
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

function Pager({ pageSafe, totalPages, pageInput, setPageInput, goPrev, goNext, jumpToPage }: PagerProps) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const [allCards, setAllCards] = useState<CardDto[]>([]);
  const [ownedRows, setOwnedRows] = useState<OwnedCardRow[]>([]);

  const [filters, setFilters] = useState<Filters>({
    q: "",
    season: "",
    rarity: "",
    type: "",
    artist: "",
    ownedOnly: false,
  });
  const [settings, setSettings] = useState(() => readAppSettings());
  const [lastNewCardIds, setLastNewCardIds] = useState<number[]>(() => readLastNewCardIds());

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  useEffect(() => {
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
  }, []);

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
    try {
      const [cardsRes, ownedRes] = await Promise.all([fetchAllCards(), fetchOwnedCollection()]);
      setAllCards(Array.isArray(cardsRes) ? cardsRes : []);
      setOwnedRows(Array.isArray(ownedRes) ? ownedRes : []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger la collection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ownedMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const row of ownedRows as any[]) {
      const id = row?.card?.id;
      if (typeof id === "number") m.set(id, Number(row.quantity ?? 0));
    }
    return m;
  }, [ownedRows]);

  const merged: any[] = useMemo(() => {
    const list = (allCards as any[]).map((c) => ({ ...c, quantity: ownedMap.get(c.id) ?? 0 }));
    list.sort(compareCards);
    return list;
  }, [allCards, ownedMap]);

  const options = useMemo(() => {
    const seasons = uniqSorted(merged.map((c) => c.season ?? c.extension ?? ""));
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
        const hay = `${c.name} ${c.key ?? ""} ${c.number ?? ""} ${c.rarity ?? ""} ${c.type ?? ""} ${c.artist ?? ""}`.toLowerCase();
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

  return (
    <div className="app-shell">
      <AppNavbar currentPage="collection" />

      <section className="collectionPage">
        <div className="collectionShell">
          <div className="collectionHeader">
            <div className="section-title">
              <h2>Collection</h2>
            </div>

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
                  <select className="filterSelect" value={filters.season} onChange={(e) => updateFilter("season", e.target.value)}>
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
                  <select className="filterSelect" value={filters.rarity} onChange={(e) => updateFilter("rarity", e.target.value)}>
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
                  <select className="filterSelect" value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
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
                  <select className="filterSelect" value={filters.artist} onChange={(e) => updateFilter("artist", e.target.value)}>
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
                  <input type="checkbox" checked={filters.ownedOnly} onChange={(e) => updateFilter("ownedOnly", e.target.checked)} />
                  <span>Afficher uniquement les cartes débloquées</span>
                </label>

                <div className="filterActions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setFilters({ q: "", season: "", rarity: "", type: "", artist: "", ownedOnly: false });
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
            <div className={`collectionBody ${settings.compactCollectionGrid ? "collectionBody--compact" : ""} ${settings.disableHoloEffects ? "collectionBody--noHolo" : ""}`}>
              <div className={`cardsGrid ${settings.compactCollectionGrid ? "cardsGrid--compact" : ""} ${settings.disableHoloEffects ? "cardsGrid--noHolo" : ""}`}>
                {pageItems.map((c: any) => {
                  const owned = (c.quantity ?? 0) > 0;
                  const src = resolveImg(c.imageUrl ?? c.image ?? c.img ?? "");
                  const rk = normalizeRarity(c.rarity);
                  const rarityCls = rk ? `rarity-${rk}` : "";

                  const isTerrain = String(c.type ?? "").toLowerCase().includes("terrain");
                  const isLatestNew = settings.autoHighlightNewCards && owned && lastNewCardIds.includes(Number(c.id));

                  return (
                    <div
                      key={c.id}
                      className={`cardTile ${owned ? "" : "is-locked"} ${settings.disableHoloEffects ? "" : rarityCls} ${isTerrain ? "cardTile--terrain" : ""} ${isLatestNew ? "is-latest-new" : ""}`}
                      data-rarity={rk}
                    >
                      <div
                        className="cardTile__imgWrap"
                        onMouseMove={settings.disableHoloEffects ? undefined : handleImgParallaxMove}
                        onMouseLeave={settings.disableHoloEffects ? undefined : handleImgParallaxLeave}
                        style={
                          {
                            ["--rx" as any]: "0deg",
                            ["--ry" as any]: "0deg",
                            ["--hx" as any]: "50%",
                            ["--hy" as any]: "50%",
                          } as any
                        }
                      >
                        {owned ? (
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
                      </div>

                      <div className="cardTile__meta">
                        <div className="cardTile__name">{c.name}</div>
                        {settings.showDuplicatesCounter && owned && (c.quantity ?? 0) > 1 && <div className="cardTile__qty">x{c.quantity}</div>}

                        <div className="cardTile__sub">
                          <span className="pill">{c.rarity}</span>
                          <span className="pill">
                            {c.season ?? c.extension ?? "—"} {typeof c.number === "number" ? `#${c.number}` : ""}
                          </span>
                        </div>
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
    </div>
  );
}