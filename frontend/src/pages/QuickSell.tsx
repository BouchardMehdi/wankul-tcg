import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "../styles.css";
import "../styles/QuickSell.css";

import AppNavbar from "../components/AppNavbar";
import { fetchAllCards, type CardDto } from "../api/cards";
import {
  getMySellableCards,
  quickSellCard,
  type SellableCardRow,
} from "../api/market";

type QuickSellFilters = {
  search: string;
  rarity: string;
  season: string;
};

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function uniq(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v.trim().length > 0)),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

function buildCardImageMap(cards: CardDto[]) {
  const map: Record<string, string> = {};

  for (const card of cards) {
    const maybeImage =
      (card as any).imageUrl || (card as any).image || (card as any).imagePath;
    const maybeKey = (card as any).key;
    if (card?.id && maybeImage) {
      map[`id:${card.id}`] = resolveImg(maybeImage);
    }
    if (maybeKey && maybeImage) {
      map[`key:${maybeKey}`] = resolveImg(maybeImage);
    }
  }

  return map;
}

function getCardImageFromMap(
  map: Record<string, string>,
  params: { cardId?: number | null; cardKey?: string | null },
) {
  if (params.cardId && map[`id:${params.cardId}`]) return map[`id:${params.cardId}`];
  if (params.cardKey && map[`key:${params.cardKey}`]) return map[`key:${params.cardKey}`];
  return "";
}

export default function QuickSell() {
  const [loading, setLoading] = useState(true);
  const [sellingCardId, setSellingCardId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [cards, setCards] = useState<SellableCardRow[]>([]);
  const [cardImageMap, setCardImageMap] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const [filters, setFilters] = useState<QuickSellFilters>({
    search: "",
    rarity: "",
    season: "",
  });

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [rows, allCards] = await Promise.all([
        getMySellableCards(),
        fetchAllCards(),
      ]);

      setCards(rows ?? []);
      setCardImageMap(buildCardImageMap(allCards ?? []));

      const defaults: Record<number, string> = {};
      for (const row of rows ?? []) {
        defaults[row.cardId] = "1";
      }
      setQuantities(defaults);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les cartes revendables.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rarities = useMemo(() => uniq(cards.map((c) => c.rarity)), [cards]);
  const seasons = useMemo(() => uniq(cards.map((c) => c.season ?? "")), [cards]);

  const filteredCards = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return cards.filter((card) => {
      if (filters.rarity && card.rarity !== filters.rarity) return false;
      if (filters.season && (card.season ?? "") !== filters.season) return false;

      if (q) {
        const haystack =
          `${card.cardName} ${card.cardKey} ${card.cardId} ${card.rarity} ${card.season ?? ""} ${card.type ?? ""} ${card.artist ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [cards, filters]);

  async function handleQuickSell(card: SellableCardRow) {
    const quantity = Number(quantities[card.cardId] ?? "1");

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > card.sellableQuantity
    ) {
      setFeedback(
        `Quantité invalide pour ${card.cardName}. Max : ${card.sellableQuantity}.`,
      );
      return;
    }

    try {
      setSellingCardId(card.cardId);
      setFeedback("");
      await quickSellCard(card.cardId, quantity);
      setFeedback(
        `${quantity} exemplaire(s) de ${card.cardName} vendu(s) avec succès.`,
      );
      await load();
    } catch (e: any) {
      setFeedback(e?.message || "Impossible d’effectuer la vente rapide.");
    } finally {
      setSellingCardId(null);
    }
  }

  return (
    <div className="pageShell">
      <AppNavbar currentPage="market" />

      <main className="quickSellPage container">
        <header className="quickSellHero">
          <div>
            <h1>Vente rapide</h1>
            <p>
              Revends tes doublons directement en crédits, en gardant toujours 1
              exemplaire en réserve.
            </p>
          </div>

          <div className="quickSellHero__actions">
            <Link className="quickSellBtn quickSellBtn--secondary" to="/market">
              Retour market
            </Link>
            <Link className="quickSellBtn" to="/market/create">
              Créer une annonce
            </Link>
          </div>
        </header>

        <section className="quickSellFilters">
          <label className="quickSellField">
            <span>Recherche</span>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Nom, ID, rareté..."
            />
          </label>

          <label className="quickSellField">
            <span>Rareté</span>
            <select
              value={filters.rarity}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, rarity: e.target.value }))
              }
            >
              <option value="">Toutes</option>
              {rarities.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity}
                </option>
              ))}
            </select>
          </label>

          <label className="quickSellField">
            <span>Saison</span>
            <select
              value={filters.season}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, season: e.target.value }))
              }
            >
              <option value="">Toutes</option>
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </label>
        </section>

        {loading && <div className="quickSellInfo">Chargement...</div>}
        {error && !loading && <div className="quickSellError">{error}</div>}
        {feedback && <div className="quickSellFeedback">{feedback}</div>}

        {!loading && !error && (
          <section className="quickSellGrid">
            {filteredCards.length === 0 ? (
              <div className="quickSellEmpty">
                Aucune carte revendable ne correspond aux filtres.
              </div>
            ) : (
              filteredCards.map((card) => {
                const image = getCardImageFromMap(cardImageMap, {
                  cardId: card.cardId,
                  cardKey: card.cardKey,
                });
                const qty = Math.max(1, Number(quantities[card.cardId] ?? "1"));

                return (
                  <article className="quickSellCard" key={card.cardId}>
                    <div className="quickSellCard__imageWrap">
                      {image ? (
                        <img
                          className="quickSellCard__image"
                          src={image}
                          alt={card.cardName}
                        />
                      ) : (
                        <div className="quickSellCard__placeholder">
                          Aucune image
                        </div>
                      )}
                    </div>

                    <div className="quickSellCard__body">
                      <div className="quickSellCard__head">
                        <div>
                          <h3>{card.cardName}</h3>
                          <p>
                            #{card.cardId} • {card.rarity} • {card.season ?? "—"}
                          </p>
                        </div>

                        <span className="quickSellBadge">
                          x{card.sellableQuantity} vendable(s)
                        </span>
                      </div>

                      <div className="quickSellCard__stats">
                        <div>
                          <span>Total</span>
                          <strong>{card.totalQuantity}</strong>
                        </div>
                        <div>
                          <span>Locké</span>
                          <strong>{card.quantityLocked}</strong>
                        </div>
                        <div>
                          <span>Prix du marché</span>
                          <strong>{card.marketPrice}</strong>
                        </div>
                        <div>
                          <span>Vente rapide / unité</span>
                          <strong>{card.quickSellUnitPrice}</strong>
                        </div>
                      </div>

                      <div className="quickSellCard__actions">
                        <label className="quickSellField quickSellField--small">
                          <span>Quantité à vendre</span>
                          <input
                            type="number"
                            min={1}
                            max={card.sellableQuantity}
                            value={quantities[card.cardId] ?? "1"}
                            onChange={(e) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [card.cardId]: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <div className="quickSellCard__preview">
                          <span>Gain estimé</span>
                          <strong>{card.quickSellUnitPrice * qty} crédits</strong>
                        </div>

                        <button
                          type="button"
                          className="quickSellBtn"
                          disabled={sellingCardId === card.cardId}
                          onClick={() => handleQuickSell(card)}
                        >
                          {sellingCardId === card.cardId
                            ? "Vente..."
                            : "Vendre maintenant"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </main>
    </div>
  );
}