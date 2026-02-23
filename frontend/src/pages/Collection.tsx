import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles.css";

import { fetchAllCards, type CardDto } from "../api/cards";
import { fetchOwnedCollection, type OwnedCardRow } from "../api/collection";

import { useAuth } from "../auth/AuthContext";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";

const PAGE_SIZE = 25;

// même base que apiFetch
const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type CollectionCard = CardDto & { quantity: number };

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

function resolveImg(imageUrl: string) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";

  // URL absolue déjà OK
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // backend renvoie typiquement "/cards/xxx.webp"
  if (url.startsWith("/")) return `${API_BASE}${url}`;

  // "cards/xxx.webp"
  return `${API_BASE}/${url}`;
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

function compareCards(a: CollectionCard, b: CollectionCard) {
  const sa = seasonRank(a.season, a.extension, a.seasonNumber ?? null);
  const sb = seasonRank(b.season, b.extension, b.seasonNumber ?? null);
  if (sa !== sb) return sa - sb;

  const na = typeof a.number === "number" ? a.number : 999999;
  const nb = typeof b.number === "number" ? b.number : 999999;
  if (na !== nb) return na - nb;

  return (a.key ?? "").localeCompare(b.key ?? "");
}

export default function Collection() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

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

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
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
    for (const row of ownedRows) {
      const id = row?.card?.id;
      if (typeof id === "number") m.set(id, Number(row.quantity ?? 0));
    }
    return m;
  }, [ownedRows]);

  const merged: CollectionCard[] = useMemo(() => {
    const list = allCards.map((c) => ({ ...c, quantity: ownedMap.get(c.id) ?? 0 }));
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
      const owned = c.quantity > 0;

      if (filters.ownedOnly && !owned) return false;
      if (filters.season && (c.season ?? c.extension ?? "") !== filters.season) return false;
      if (filters.rarity && c.rarity !== filters.rarity) return false;
      if (filters.type && (c.type ?? "") !== filters.type) return false;
      if (filters.artist && (c.artist ?? "") !== filters.artist) return false;

      if (q) {
        const hay = `${c.name} ${c.key} ${c.number ?? ""} ${c.rarity} ${c.type ?? ""} ${c.artist ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [merged, filters]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link to="/menu" className="topbar__brand" aria-label="Wankul">
            <div className="topbar__logo">
              <img src={wankulLogo} alt="logo" />
            </div>
          </Link>

          <nav className="topbar__nav">
            <Link className="topbar__link" to="/booster">Booster</Link>
            <Link className="topbar__link is-active" to="/collection">Collection</Link>
            <button className="topbar__logout" onClick={handleLogout}>Se déconnecter</button>
          </nav>
        </div>
      </header>

      <section className="container mt-3">
        <div className="panel">
          <div className="panel-inner">
            <div className="section-title">
              <h2>Collection</h2>
              <p className="small">
                Tri: Saison 1→4 puis Numéro • 5 cartes/ligne • 25/page • Chargées: <b>{allCards.length}</b>
              </p>
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
                    {options.seasons.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="filterGroup">
                  <label className="filterLabel">Rareté</label>
                  <select className="filterSelect" value={filters.rarity} onChange={(e) => updateFilter("rarity", e.target.value)}>
                    <option value="">Toutes</option>
                    {options.rarities.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="filterGroup">
                  <label className="filterLabel">Type</label>
                  <select className="filterSelect" value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
                    <option value="">Tous</option>
                    {options.types.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="filterGroup">
                  <label className="filterLabel">Artiste</label>
                  <select className="filterSelect" value={filters.artist} onChange={(e) => updateFilter("artist", e.target.value)}>
                    <option value="">Tous</option>
                    {options.artists.map((a) => <option key={a} value={a}>{a}</option>)}
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
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setFilters({ q: "", season: "", rarity: "", type: "", artist: "", ownedOnly: false });
                      setPage(1);
                    }}
                  >
                    Réinitialiser
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={load}>
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
            ) : (
              <>
                <div className="collectionTopBar mt-3">
                  <div className="small">
                    Page <b>{pageSafe}</b> / <b>{totalPages}</b> • Total: <b>{total}</b>
                  </div>
                  <div className="pager">
                    <button className="btn btn-secondary" onClick={goPrev} disabled={pageSafe <= 1}>◀</button>
                    <button className="btn btn-secondary" onClick={goNext} disabled={pageSafe >= totalPages}>▶</button>
                  </div>
                </div>

                <div className="cardsGrid">
                  {pageItems.map((c) => {
                    const owned = c.quantity > 0;
                    const src = resolveImg(c.imageUrl);

                    return (
                      <div key={c.id} className={`cardTile ${owned ? "" : "is-locked"}`}>
                        <div className="cardTile__imgWrap">
                          <img className="cardTile__img" src={src} alt={c.name} />
                          {!owned && <div className="cardTile__lock">NON DÉBLOQUÉE</div>}
                          {owned && c.quantity > 1 && <div className="cardTile__qty">x{c.quantity}</div>}
                        </div>

                        <div className="cardTile__meta">
                          <div className="cardTile__name">{c.name}</div>
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
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}