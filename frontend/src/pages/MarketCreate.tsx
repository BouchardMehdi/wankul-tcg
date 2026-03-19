import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import "../styles.css";
import "../styles/MarketCreate.css";

import AppNavbar from "../components/AppNavbar";
import { fetchAllCards, type CardDto } from "../api/cards";
import {
  createMarketListing,
  getMySellableCards,
  type MarketListingMode,
  type MarketOfferType,
  type SellableCardRow,
} from "../api/market";
import {
  clearMarketCreateSelectedCardId,
  readMarketCreateSelectedCardId,
} from "../utils/marketCreateSelection";

type FormState = {
  cardId: string;
  quantity: string;
  listingMode: MarketListingMode;
  offerType: MarketOfferType;
  priceCredits: string;
  wantedCardId: string;
  wantedCardQuantity: string;
};

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function sortCards(cards: CardDto[]) {
  return [...cards].sort((a, b) => {
    const seasonCmp = (a.season ?? "").localeCompare(b.season ?? "", "fr");
    if (seasonCmp !== 0) return seasonCmp;
    const rarityCmp = (a.rarity ?? "").localeCompare(b.rarity ?? "", "fr");
    if (rarityCmp !== 0) return rarityCmp;
    return a.name.localeCompare(b.name, "fr");
  });
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

function formatListingMode(mode: MarketListingMode) {
  switch (mode) {
    case "UNIT":
      return "À l’unité";
    case "LOT":
      return "En lot";
    default:
      return mode;
  }
}

function formatOfferType(offerType: MarketOfferType) {
  switch (offerType) {
    case "CREDITS_ONLY":
      return "Crédits uniquement";
    case "CARD_ONLY":
      return "Échange de carte";
    case "CARD_AND_CREDITS":
      return "Carte + crédits";
    default:
      return offerType;
  }
}

export default function MarketCreate() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sellableCards, setSellableCards] = useState<SellableCardRow[]>([]);
  const [allCards, setAllCards] = useState<CardDto[]>([]);
  const [cardImageMap, setCardImageMap] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>({
    cardId: "",
    quantity: "1",
    listingMode: "UNIT",
    offerType: "CREDITS_ONLY",
    priceCredits: "",
    wantedCardId: "",
    wantedCardQuantity: "1",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const [sellable, cards] = await Promise.all([
          getMySellableCards(),
          fetchAllCards(),
        ]);

        const sellableRows = sellable ?? [];
        const sortedCards = sortCards(cards ?? []);

        setSellableCards(sellableRows);
        setAllCards(sortedCards);
        setCardImageMap(buildCardImageMap(sortedCards));

        const stateCardId = Number((location.state as any)?.marketSelectedCardId ?? 0);
        const storageCardId = readMarketCreateSelectedCardId() ?? 0;

        const preferredCardId =
          Number.isInteger(stateCardId) && stateCardId > 0
            ? stateCardId
            : Number.isInteger(storageCardId) && storageCardId > 0
            ? storageCardId
            : Number(sellableRows?.[0]?.cardId ?? 0);

        const selectedSellable =
          sellableRows.find((row) => row.cardId === preferredCardId) ?? sellableRows?.[0] ?? null;

        if (selectedSellable) {
          setForm((prev) => ({
            ...prev,
            cardId: String(selectedSellable.cardId),
            quantity: "1",
            priceCredits:
              prev.cardId && Number(prev.cardId) === selectedSellable.cardId
                ? prev.priceCredits || String(selectedSellable.marketPrice)
                : String(selectedSellable.marketPrice),
          }));
        }

        clearMarketCreateSelectedCardId();
      } catch (e: any) {
        setError(e?.message || "Impossible de charger le formulaire de vente.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [location.state]);

  const selectedSellable = useMemo(() => {
    const cardId = Number(form.cardId);
    return sellableCards.find((c) => c.cardId === cardId) ?? null;
  }, [form.cardId, sellableCards]);

  const selectedWantedCard = useMemo(() => {
    const wantedCardId = Number(form.wantedCardId);
    if (!wantedCardId) return null;
    return allCards.find((c) => c.id === wantedCardId) ?? null;
  }, [form.wantedCardId, allCards]);

  const maxQuantity = selectedSellable?.sellableQuantity ?? 0;

  const selectedCardImage = selectedSellable
    ? getCardImageFromMap(cardImageMap, {
        cardId: selectedSellable.cardId,
        cardKey: selectedSellable.cardKey,
      })
    : "";

  const wantedCardImage = selectedWantedCard
    ? getCardImageFromMap(cardImageMap, {
        cardId: selectedWantedCard.id,
        cardKey: (selectedWantedCard as any).key ?? null,
      })
    : "";

  const referenceRequestedValue = useMemo(() => {
    const priceCredits = Number(form.priceCredits || 0);
    const wantedQty = Number(form.wantedCardQuantity || 0);
    const wantedMarket =
      selectedWantedCard && form.wantedCardId
        ? sellableCards.find((c) => c.cardId === Number(form.wantedCardId))
            ?.marketPrice ?? 0
        : 0;

    return priceCredits + wantedMarket * wantedQty;
  }, [
    form.priceCredits,
    form.wantedCardId,
    form.wantedCardQuantity,
    selectedWantedCard,
    sellableCards,
  ]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccess("");
  }

  useEffect(() => {
    if (!selectedSellable) return;

    if (form.offerType === "CREDITS_ONLY") {
      updateField("priceCredits", String(selectedSellable.marketPrice));
    }

    if (Number(form.quantity) > selectedSellable.sellableQuantity) {
      updateField("quantity", String(selectedSellable.sellableQuantity));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cardId]);

  useEffect(() => {
    if (form.offerType === "CREDITS_ONLY") {
      updateField("wantedCardId", "");
      updateField("wantedCardQuantity", "1");
    } else if (!form.wantedCardQuantity || Number(form.wantedCardQuantity) < 1) {
      updateField("wantedCardQuantity", "1");
    }

    if (form.offerType === "CARD_ONLY") {
      updateField("priceCredits", "0");
    } else if (
      form.offerType === "CARD_AND_CREDITS" &&
      Number(form.priceCredits) < 1
    ) {
      updateField("priceCredits", String(selectedSellable?.marketPrice ?? 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.offerType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cardId = Number(form.cardId);
    const quantity = Number(form.quantity);
    const priceCredits = Number(form.priceCredits);
    const wantedCardId = form.wantedCardId ? Number(form.wantedCardId) : undefined;
    const wantedCardQuantity = Number(form.wantedCardQuantity || 0);

    if (!cardId || !selectedSellable) {
      setError("Choisis une carte vendable.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
      setError(`La quantité doit être comprise entre 1 et ${maxQuantity}.`);
      return;
    }

    if (form.offerType !== "CREDITS_ONLY" && !wantedCardId) {
      setError("Choisis une carte demandée.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await createMarketListing({
        cardId,
        quantity,
        listingMode: form.listingMode,
        offerType: form.offerType,
        priceCredits,
        wantedCardId,
        wantedCardQuantity:
          form.offerType === "CREDITS_ONLY" ? undefined : wantedCardQuantity,
      });

      setSuccess("Annonce créée avec succès.");
      const refreshed = await getMySellableCards();
      setSellableCards(refreshed ?? []);

      const updatedSelected = refreshed.find((c) => c.cardId === cardId);
      setForm((prev) => ({
        ...prev,
        quantity: "1",
        priceCredits: String(updatedSelected?.marketPrice ?? prev.priceCredits),
      }));
    } catch (e: any) {
      setError(e?.message || "Impossible de créer l’annonce.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pageShell">
      <AppNavbar currentPage="market" />

      <main className="marketCreatePage container">
        <header className="marketCreateHero">
          <div>
            <h1>Créer une annonce</h1>
            <p>
              Mets en vente une carte en crédits, en échange carte, ou en carte
              + crédits.
            </p>
          </div>

          <div className="marketCreateHero__actions">
            <Link className="marketCreateBtn marketCreateBtn--secondary" to="/market">
              Retour market
            </Link>
            <Link className="marketCreateBtn" to="/market/quick-sell">
              Vente rapide
            </Link>
          </div>
        </header>

        {loading && <div className="marketCreateInfo">Chargement...</div>}
        {error && !loading && <div className="marketCreateError">{error}</div>}
        {success && <div className="marketCreateSuccess">{success}</div>}

        {!loading && !error && (
          <div className="marketCreateLayout">
            <form className="marketCreateForm" onSubmit={handleSubmit}>
              <div className="marketCreatePickCard">
                <div className="marketCreatePickCard__head">
                  <span>Carte à vendre</span>
                  <Link
                    className="marketCreateBtn marketCreateBtn--secondary"
                    to="/collection?selectForMarket=1"
                    state={{ returnTo: "/market/create" }}
                  >
                    Choisir dans ma collection
                  </Link>
                </div>

                {selectedSellable ? (
                  <div className="marketCreateSelectedCard">
                    <div className="marketCreateSelectedCard__image">
                      {selectedCardImage ? (
                        <img src={selectedCardImage} alt={selectedSellable.cardName} />
                      ) : (
                        <div className="marketCreateSummary__placeholder">
                          Aucune image
                        </div>
                      )}
                    </div>

                    <div className="marketCreateSelectedCard__content">
                      <strong>{selectedSellable.cardName}</strong>
                      <span>
                        {selectedSellable.rarity} • {selectedSellable.season ?? "—"}
                      </span>
                      <span>ID BDD : #{selectedSellable.cardId}</span>

                      <div className="marketCreateSelectedCard__meta">
                        <div>
                          <small>Possédées</small>
                          <b>{selectedSellable.totalQuantity}</b>
                        </div>
                        <div>
                          <small>Vendables</small>
                          <b>{selectedSellable.sellableQuantity}</b>
                        </div>
                        <div>
                          <small>Prix du marché</small>
                          <b>{selectedSellable.marketPrice}</b>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="marketCreateNoCard">
                    Aucune carte vendable sélectionnée.
                  </div>
                )}
              </div>

              <div className="marketCreateGrid">
                <label className="marketCreateField">
                  <span>Quantité</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, maxQuantity)}
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                    disabled={!selectedSellable}
                  />
                </label>

                <label className="marketCreateField">
                  <span>Mode de vente</span>
                  <select
                    value={form.listingMode}
                    onChange={(e) =>
                      updateField("listingMode", e.target.value as MarketListingMode)
                    }
                    disabled={!selectedSellable}
                  >
                    <option value="UNIT">À l’unité</option>
                    <option value="LOT">En lot</option>
                  </select>
                </label>

                <label className="marketCreateField">
                  <span>Type d’offre</span>
                  <select
                    value={form.offerType}
                    onChange={(e) =>
                      updateField("offerType", e.target.value as MarketOfferType)
                    }
                    disabled={!selectedSellable}
                  >
                    <option value="CREDITS_ONLY">Crédits uniquement</option>
                    <option value="CARD_ONLY">Échange de carte</option>
                    <option value="CARD_AND_CREDITS">Carte + crédits</option>
                  </select>
                </label>

                <label className="marketCreateField">
                  <span>
                    {form.listingMode === "LOT"
                      ? "Prix du lot en crédits"
                      : "Prix par carte en crédits"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.priceCredits}
                    onChange={(e) => updateField("priceCredits", e.target.value)}
                    disabled={!selectedSellable || form.offerType === "CARD_ONLY"}
                  />
                </label>
              </div>

              {form.offerType !== "CREDITS_ONLY" && (
                <div className="marketCreateTradeBox">
                  <h3>Carte demandée</h3>

                  <div className="marketCreateGrid">
                    <label className="marketCreateField">
                      <span>Carte voulue</span>
                      <select
                        value={form.wantedCardId}
                        onChange={(e) => updateField("wantedCardId", e.target.value)}
                        disabled={!selectedSellable}
                      >
                        <option value="">Choisir une carte</option>
                        {allCards
                          .filter((card) => card.id !== Number(form.cardId))
                          .map((card) => (
                            <option key={card.id} value={card.id}>
                              #{card.id} • {card.name} • {card.rarity} • {card.season ?? "—"}
                            </option>
                          ))}
                      </select>
                    </label>

                    <label className="marketCreateField">
                      <span>
                        {form.listingMode === "LOT"
                          ? "Quantité demandée pour le lot"
                          : "Quantité demandée par carte"}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={form.wantedCardQuantity}
                        onChange={(e) =>
                          updateField("wantedCardQuantity", e.target.value)
                        }
                        disabled={!selectedSellable}
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="marketCreateActions">
                <button
                  type="submit"
                  className="marketCreateBtn"
                  disabled={saving || !selectedSellable}
                >
                  {saving ? "Création..." : "Créer l’annonce"}
                </button>
              </div>
            </form>

            <aside className="marketCreateSummary">
              <h2>Résumé</h2>

              {selectedSellable ? (
                <>
                  <div className="marketCreateSummary__visuals">
                    <div className="marketCreateSummary__cardImage">
                      {selectedCardImage ? (
                        <img src={selectedCardImage} alt={selectedSellable.cardName} />
                      ) : (
                        <div className="marketCreateSummary__placeholder">
                          Aucune image
                        </div>
                      )}
                    </div>

                    {selectedWantedCard && (
                      <div className="marketCreateSummary__cardImage marketCreateSummary__cardImage--wanted">
                        {wantedCardImage ? (
                          <img src={wantedCardImage} alt={selectedWantedCard.name} />
                        ) : (
                          <div className="marketCreateSummary__placeholder">?</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="marketCreateSummary__card">
                    <strong>{selectedSellable.cardName}</strong>
                    <span>
                      {selectedSellable.rarity} • {selectedSellable.season ?? "—"}
                    </span>
                  </div>

                  <div className="marketCreateSummary__grid">
                    <div>
                      <span>Possédées</span>
                      <strong>{selectedSellable.totalQuantity}</strong>
                    </div>
                    <div>
                      <span>Lockées</span>
                      <strong>{selectedSellable.quantityLocked}</strong>
                    </div>
                    <div>
                      <span>Vendables</span>
                      <strong>{selectedSellable.sellableQuantity}</strong>
                    </div>
                    <div>
                      <span>Prix du marché</span>
                      <strong>{selectedSellable.marketPrice}</strong>
                    </div>
                  </div>

                  <div className="marketCreateSummary__grid">
                    <div>
                      <span>Mode</span>
                      <strong>{formatListingMode(form.listingMode)}</strong>
                    </div>
                    <div>
                      <span>Type d’offre</span>
                      <strong>{formatOfferType(form.offerType)}</strong>
                    </div>
                    <div>
                      <span>Quantité listée</span>
                      <strong>{form.quantity || "—"}</strong>
                    </div>
                    <div>
                      <span>Référence marché</span>
                      <strong>
                        {form.listingMode === "LOT"
                          ? selectedSellable.marketPrice *
                            Math.max(1, Number(form.quantity || 1))
                          : selectedSellable.marketPrice}
                      </strong>
                    </div>
                  </div>

                  <div className="marketCreateSummary__box">
                    <span>Valeur demandée estimée</span>
                    <strong>{referenceRequestedValue}</strong>
                  </div>

                  {selectedWantedCard && (
                    <div className="marketCreateSummary__box">
                      <span>Carte demandée</span>
                      <strong>
                        {selectedWantedCard.name} • {selectedWantedCard.rarity}
                      </strong>
                    </div>
                  )}
                </>
              ) : (
                <p>Aucune carte vendable disponible.</p>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}