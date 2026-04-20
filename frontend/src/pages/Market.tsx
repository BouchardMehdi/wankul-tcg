import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "../styles.css";
import "../styles/Market.css";

import AppNavbar from "../components/AppNavbar";
import { fetchOwnedCollection } from "../api/collection";
import { fetchAllCards, type CardDto } from "../api/cards";
import {
  buyMarketListing,
  cancelMarketListing,
  claimMarketTransactionReward,
  getMarketListings,
  getMyMarketListings,
  getMyMarketPurchases,
  getMyMarketSales,
  type MarketListingMode,
  type MarketListingRow,
  type MarketOfferType,
  type MarketTransactionRow,
} from "../api/market";
import {
  playActionDeniedSound,
  playSoundEffect,
  playUiErrorSound,
  primeSound,
} from "../utils/sound";

type MarketTab = "my-listings" | "suggestions" | "search" | "history";

type SearchFilters = {
  search: string;
  rarity: string;
  season: string;
  listingMode: "" | MarketListingMode;
  offerType: "" | MarketOfferType;
  minPrice: string;
  maxPrice: string;
  sortBy:
    | "createdAt"
    | "priceCredits"
    | "marketPriceSnapshot"
    | "rarity"
    | "cardName";
  sortOrder: "ASC" | "DESC";
};

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const PREVIEW_COUNT = 3;
const HISTORY_PAGE_SIZE = 10;

function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function uniqSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v.trim().length > 0)),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR");
}

function formatPricePosition(position: MarketListingRow["pricePosition"]) {
  switch (position) {
    case "BELOW_MARKET":
      return "Sous le marché";
    case "AT_MARKET":
      return "Prix du marché";
    case "ABOVE_MARKET":
      return "Au-dessus du marché";
    default:
      return "Non comparable";
  }
}

function formatOfferType(offerType: MarketOfferType) {
  switch (offerType) {
    case "CREDITS_ONLY":
      return "Crédits";
    case "CARD_ONLY":
      return "Échange";
    case "CARD_AND_CREDITS":
      return "Carte + crédits";
    default:
      return offerType;
  }
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

function formatStatus(status: MarketListingRow["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "SOLD":
      return "Vendue";
    case "CANCELLED":
      return "Annulée";
    default:
      return status;
  }
}

function formatOffer(listing: MarketListingRow) {
  if (listing.offerType === "CREDITS_ONLY") {
    return listing.listingMode === "LOT"
      ? `${listing.priceCredits} crédits le lot`
      : `${listing.priceCredits} crédits / carte`;
  }

  if (listing.offerType === "CARD_ONLY") {
    const wantedCard = listing.wantedCardName ?? `Carte #${listing.wantedCardId}`;
    return listing.listingMode === "LOT"
      ? `${listing.wantedCardQuantity}x ${wantedCard} pour le lot`
      : `${listing.wantedCardQuantity}x ${wantedCard} / carte`;
  }

  const wantedCard = listing.wantedCardName ?? `Carte #${listing.wantedCardId}`;
  return listing.listingMode === "LOT"
    ? `${listing.wantedCardQuantity}x ${wantedCard} + ${listing.priceCredits} crédits`
    : `${listing.wantedCardQuantity}x ${wantedCard} + ${listing.priceCredits} crédits / carte`;
}

function listingNeedsCard(listing: MarketListingRow) {
  return (
    listing.offerType === "CARD_ONLY" ||
    listing.offerType === "CARD_AND_CREDITS"
  );
}

function listingCanBuyPartially(listing: MarketListingRow) {
  return listing.listingMode === "UNIT";
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
  params: {
    cardId?: number | null;
    cardKey?: string | null;
  },
) {
  if (params.cardId && map[`id:${params.cardId}`]) return map[`id:${params.cardId}`];
  if (params.cardKey && map[`key:${params.cardKey}`]) return map[`key:${params.cardKey}`];
  return "";
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}

function SectionPreviewHeader({
  total,
  shown,
  previewLabel = "Voir tout",
}: {
  total: number;
  shown: number;
  previewLabel?: string;
}) {
  if (total <= shown) return null;

  return (
    <div className="marketSection__subnote">
      <span>
        Affichage de {shown} sur {total}
      </span>
      <span>{previewLabel}</span>
    </div>
  );
}

function HistorySection({
  title,
  items,
  expanded,
  page,
  onToggleExpanded,
  onPageChange,
}: {
  title: string;
  items: MarketTransactionRow[];
  expanded: boolean;
  page: number;
  onToggleExpanded: () => void;
  onPageChange: (page: number) => void;
}) {
  const previewItems = items.slice(0, PREVIEW_COUNT);
  const paginated = paginateItems(items, page, HISTORY_PAGE_SIZE);
  const displayed = expanded ? paginated.items : previewItems;

  return (
    <section className="marketSection">
      <div className="marketSection__head">
        <h3>{title}</h3>
        <span>{items.length} transaction(s)</span>
      </div>

      {items.length === 0 ? (
        <div className="marketEmpty">Aucune transaction pour le moment.</div>
      ) : (
        <>
          {expanded ? (
            <div className="marketSection__subnote">
              <span>
                Page {paginated.page} / {paginated.totalPages}
              </span>
              <button
                type="button"
                className="marketLinkBtn"
                onClick={onToggleExpanded}
              >
                Réduire
              </button>
            </div>
          ) : (
            <SectionPreviewHeader
              total={items.length}
              shown={displayed.length}
              previewLabel="Voir plus"
            />
          )}

          <div className="marketTransactions">
            {displayed.map((tx) => (
              <article className="marketTransactionCard" key={tx.id}>
                <div className="marketTransactionCard__top">
                  <strong>{tx.cardName}</strong>
                  <span>{formatDate(tx.createdAt)}</span>
                </div>

                <div className="marketTransactionCard__meta">
                  <span>
                    Rôle :{" "}
                    {tx.role === "BUYER"
                      ? "Acheteur"
                      : tx.role === "SELLER"
                        ? "Vendeur"
                        : "Acheteur/Vendeur"}
                  </span>
                  <span>Quantité : {tx.quantity}</span>
                  <span>
                    Type :{" "}
                    {tx.transactionType === "CREDITS_SALE"
                      ? "Achat en crédits"
                      : tx.transactionType === "CARD_TRADE"
                        ? "Échange de cartes"
                        : "Carte + crédits"}
                  </span>
                </div>

                <div className="marketTransactionCard__meta">
                  <span>Vendeur : {tx.sellerUsername}</span>
                  <span>Acheteur : {tx.buyerUsername}</span>
                </div>

                <div className="marketTransactionCard__meta">
                  <span>Crédits : {tx.totalPriceCredits}</span>
                  <span>
                    Carte offerte :{" "}
                    {tx.buyerOfferedCardName
                      ? `${tx.buyerOfferedCardQuantity}x ${tx.buyerOfferedCardName}`
                      : "Aucune"}
                  </span>
                </div>

                <div className="marketTransactionCard__meta">
                  <span>
                    Récompense vendeur :{" "}
                    {tx.sellerRewardClaimed
                      ? `Récupérée le ${formatDate(tx.sellerRewardClaimedAt)}`
                      : "En attente"}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {items.length > PREVIEW_COUNT && !expanded && (
            <div className="marketPager marketPager--single">
              <button
                type="button"
                className="marketBtn marketBtn--secondary"
                onClick={onToggleExpanded}
              >
                Voir plus
              </button>
            </div>
          )}

          {expanded && paginated.totalPages > 1 && (
            <div className="marketPager">
              <button
                type="button"
                className="marketBtn marketBtn--secondary"
                disabled={paginated.page <= 1}
                onClick={() => onPageChange(paginated.page - 1)}
              >
                Précédent
              </button>

              <span className="marketPager__text">
                Page {paginated.page} / {paginated.totalPages}
              </span>

              <button
                type="button"
                className="marketBtn marketBtn--secondary"
                disabled={paginated.page >= paginated.totalPages}
                onClick={() => onPageChange(paginated.page + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function Market() {
  const [activeTab, setActiveTab] = useState<MarketTab>("my-listings");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [myListings, setMyListings] = useState<MarketListingRow[]>([]);
  const [allListingsRaw, setAllListingsRaw] = useState<MarketListingRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());
  const [allCards, setAllCards] = useState<CardDto[]>([]);
  const [cardImageMap, setCardImageMap] = useState<Record<string, string>>({});

  const [purchases, setPurchases] = useState<MarketTransactionRow[]>([]);
  const [sales, setSales] = useState<MarketTransactionRow[]>([]);

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    search: "",
    rarity: "",
    season: "",
    listingMode: "",
    offerType: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "createdAt",
    sortOrder: "DESC",
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [buyQuantityByListing, setBuyQuantityByListing] = useState<Record<number, string>>({});
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [claimingTransactionId, setClaimingTransactionId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  const [showAllPurchases, setShowAllPurchases] = useState(false);
  const [showAllSales, setShowAllSales] = useState(false);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  const rarities = useMemo(
    () => uniqSorted(allCards.map((c) => c.rarity)),
    [allCards],
  );
  const seasons = useMemo(
    () => uniqSorted(allCards.map((c) => c.season ?? (c as any).extension ?? "")),
    [allCards],
  );

  const filteredListings = useMemo(() => {
    const search = searchFilters.search.trim().toLowerCase();

    let result = [...allListingsRaw];

    if (searchFilters.rarity) {
      result = result.filter((listing) => listing.rarity === searchFilters.rarity);
    }

    if (searchFilters.season) {
      result = result.filter((listing) => (listing.season ?? "") === searchFilters.season);
    }

    if (searchFilters.listingMode) {
      result = result.filter(
        (listing) => listing.listingMode === searchFilters.listingMode,
      );
    }

    if (searchFilters.offerType) {
      result = result.filter(
        (listing) => listing.offerType === searchFilters.offerType,
      );
    }

    if (searchFilters.minPrice.trim() !== "") {
      const minPrice = Number(searchFilters.minPrice);
      if (!Number.isNaN(minPrice)) {
        result = result.filter((listing) => listing.priceCredits >= minPrice);
      }
    }

    if (searchFilters.maxPrice.trim() !== "") {
      const maxPrice = Number(searchFilters.maxPrice);
      if (!Number.isNaN(maxPrice)) {
        result = result.filter((listing) => listing.priceCredits <= maxPrice);
      }
    }

    if (search) {
      result = result.filter((listing) => {
        const haystack = [
          listing.cardName,
          listing.rarity,
          listing.season ?? "",
          listing.cardId,
          listing.cardKey ?? "",
          listing.sellerUsername,
          listing.wantedCardName ?? "",
          listing.wantedCardId ?? "",
          listing.wantedCardKey ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });
    }

    result.sort((a, b) => {
      const orderFactor = searchFilters.sortOrder === "ASC" ? 1 : -1;

      switch (searchFilters.sortBy) {
        case "priceCredits":
          return (a.priceCredits - b.priceCredits) * orderFactor;
        case "marketPriceSnapshot":
          return (a.marketPriceSnapshot - b.marketPriceSnapshot) * orderFactor;
        case "rarity":
          return a.rarity.localeCompare(b.rarity, "fr") * orderFactor;
        case "cardName":
          return a.cardName.localeCompare(b.cardName, "fr") * orderFactor;
        case "createdAt":
        default:
          return (
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
            orderFactor
          );
      }
    });

    return result;
  }, [allListingsRaw, searchFilters]);

  const suggestedListings = useMemo(() => {
    return filteredListings
      .filter((listing) => !ownedIds.has(listing.cardId))
      .sort((a, b) => {
        const aScore = Math.abs(a.priceDifferencePercent ?? 99999);
        const bScore = Math.abs(b.priceDifferencePercent ?? 99999);
        if (aScore !== bScore) return aScore - bScore;
        return a.priceCredits - b.priceCredits;
      })
      .slice(0, 12);
  }, [filteredListings, ownedIds]);

  const rewardPendingSales = useMemo(
    () =>
      [...sales]
        .filter((sale) => !sale.sellerRewardClaimed)
        .sort((a, b) => {
          const aHasValue =
            a.pendingRewardCredits > 0 || a.pendingRewardCardQuantity > 0;
          const bHasValue =
            b.pendingRewardCredits > 0 || b.pendingRewardCardQuantity > 0;
          if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [sales],
  );

  const activeMyListings = useMemo(
    () => myListings.filter((listing) => listing.status === "ACTIVE"),
    [myListings],
  );

  const cancelledMyListings = useMemo(
    () =>
      myListings
        .filter((listing) => listing.status === "CANCELLED")
        .slice(0, PREVIEW_COUNT),
    [myListings],
  );

  const soldMyListings = useMemo(
    () =>
      [...myListings]
        .filter((listing) => listing.status === "SOLD")
        .sort(
          (a, b) =>
            new Date(b.closedAt ?? b.updatedAt).getTime() -
            new Date(a.closedAt ?? a.updatedAt).getTime(),
        )
        .slice(0, PREVIEW_COUNT),
    [myListings],
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [ownedRows, activeListings, mine, myPurchases, mySales, cards] =
        await Promise.all([
          fetchOwnedCollection(),
          getMarketListings({ limit: 100 }),
          getMyMarketListings(),
          getMyMarketPurchases(),
          getMyMarketSales(),
          fetchAllCards(),
        ]);

      const owned = new Set<number>();
      for (const row of ownedRows ?? []) {
        if (row?.card?.id) owned.add(row.card.id);
      }

      setOwnedIds(owned);
      setAllListingsRaw(activeListings ?? []);
      setMyListings(mine ?? []);
      setPurchases(myPurchases ?? []);
      setSales(mySales ?? []);
      setAllCards(cards ?? []);
      setCardImageMap(buildCardImageMap(cards ?? []));
    } catch (e: any) {
      playUiErrorSound();
      setError(e?.message || "Impossible de charger le market.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPurchasesPage(1);
  }, [showAllPurchases]);

  useEffect(() => {
    setSalesPage(1);
  }, [showAllSales]);

  useEffect(() => {
    setActiveTab((prev) => (prev === "search" ? "search" : prev));
  }, [searchFilters]);

  useEffect(() => {
    if (!feedback) return;

    if (feedback.toLowerCase().includes("impossible")) {
      playUiErrorSound();
    }
  }, [feedback]);

  async function refreshCurrentData() {
    await loadData();
  }

  function updateFilter<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) {
    setSearchFilters((prev) => ({ ...prev, [key]: value }));
    if (activeTab !== "search") {
      setActiveTab("search");
    }
  }

  async function handleCancel(listingId: number) {
    void primeSound();
    try {
      setCancellingId(listingId);
      setFeedback("");
      await cancelMarketListing(listingId);
      setFeedback("Annonce annulée avec succès.");
      await refreshCurrentData();
    } catch (e: any) {
      setFeedback(e?.message || "Impossible d’annuler l’annonce.");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleClaimReward(transactionId: number) {
    void primeSound();
    try {
      setClaimingTransactionId(transactionId);
      setFeedback("");
      await claimMarketTransactionReward(transactionId);
      playSoundEffect("market.reward");
      setFeedback("Récompense récupérée avec succès.");
      await refreshCurrentData();
    } catch (e: any) {
      setFeedback(e?.message || "Impossible de récupérer la récompense.");
    } finally {
      setClaimingTransactionId(null);
    }
  }

  async function handleBuy(listing: MarketListingRow) {
    void primeSound();
    const quantity =
      listing.listingMode === "LOT"
        ? listing.remainingQuantity
        : Number(buyQuantityByListing[listing.id] ?? "1");

    if (!Number.isInteger(quantity) || quantity < 1) {
      playActionDeniedSound();
      setFeedback("Quantité d’achat invalide.");
      return;
    }

    const offeredCardId = listingNeedsCard(listing)
      ? listing.wantedCardId ?? undefined
      : undefined;

    try {
      setBuyingId(listing.id);
      setFeedback("");

      await buyMarketListing(listing.id, {
        quantity,
        offeredCardId,
      });

      setFeedback("Achat effectué avec succès.");
      playSoundEffect("market.buy");
      setBuyQuantityByListing((prev) => ({ ...prev, [listing.id]: "1" }));
      await refreshCurrentData();
    } catch (e: any) {
      setFeedback(e?.message || "Impossible d’acheter cette annonce.");
    } finally {
      setBuyingId(null);
    }
  }

  function renderListingCard(
    listing: MarketListingRow,
    kind: "mine" | "market" | "suggestion",
  ) {
    const defaultQty =
      listing.listingMode === "LOT"
        ? String(listing.remainingQuantity)
        : buyQuantityByListing[listing.id] ?? "1";

    const cardImage = getCardImageFromMap(cardImageMap, {
      cardId: listing.cardId,
      cardKey: listing.cardKey,
    });

    const wantedCardImage = listing.wantedCardId
      ? getCardImageFromMap(cardImageMap, {
          cardId: listing.wantedCardId,
          cardKey: listing.wantedCardKey,
        })
      : "";

    return (
      <article className="marketListingCard" key={listing.id}>
        <div className="marketListingCard__mediaWrap">
          <div className="marketListingCard__media">
            {cardImage ? (
              <img src={cardImage} alt={listing.cardName} />
            ) : (
              <div className="marketListingCard__placeholder">Aucune image</div>
            )}
          </div>

          {listing.wantedCardId && (
            <div className="marketListingCard__wanted">
              <span>Demandé</span>
              <div className="marketListingCard__wantedThumb">
                {wantedCardImage ? (
                  <img
                    src={wantedCardImage}
                    alt={listing.wantedCardName ?? "Carte demandée"}
                  />
                ) : (
                  <div className="marketListingCard__placeholder marketListingCard__placeholder--small">
                    ?
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="marketListingCard__content">
          <div className="marketListingCard__top">
            <div>
              <h4>{listing.cardName}</h4>
              <p>
                {listing.rarity} • {listing.season ?? "—"} • #{listing.cardId}
              </p>
            </div>

            <div className="marketListingCard__badges">
              <span className={`badge badge--${listing.pricePosition.toLowerCase()}`}>
                {formatPricePosition(listing.pricePosition)}
              </span>
              <span className="badge">{formatListingMode(listing.listingMode)}</span>
              <span className="badge">{formatOfferType(listing.offerType)}</span>
              <span className={`badge badge--status badge--${listing.status.toLowerCase()}`}>
                {formatStatus(listing.status)}
              </span>
            </div>
          </div>

          <div className="marketListingCard__grid">
            <div>
              <span className="marketLabel">Vendeur</span>
              <strong>{listing.sellerUsername}</strong>
            </div>
            <div>
              <span className="marketLabel">Stock</span>
              <strong>
                {listing.remainingQuantity} / {listing.quantity}
              </strong>
            </div>
            <div>
              <span className="marketLabel">Prix du marché</span>
              <strong>{listing.marketPriceSnapshot} crédits</strong>
            </div>
            <div>
              <span className="marketLabel">Offre demandée</span>
              <strong>{formatOffer(listing)}</strong>
            </div>
          </div>

          <div className="marketListingCard__details">
            <span>Écart : {listing.priceDifference} crédits</span>
            <span>
              Différence :{" "}
              {listing.priceDifferencePercent === null
                ? "—"
                : `${listing.priceDifferencePercent}%`}
            </span>
            <span>Créée le {formatDate(listing.createdAt)}</span>
            {listing.closedAt && <span>Clôturée le {formatDate(listing.closedAt)}</span>}
          </div>

          {kind === "mine" ? (
            listing.status === "ACTIVE" && (
              <div className="marketListingCard__actions">
                <button
                  type="button"
                  className="marketBtn marketBtn--danger"
                  disabled={cancellingId === listing.id}
                  onClick={() => handleCancel(listing.id)}
                >
                  {cancellingId === listing.id ? "Annulation..." : "Annuler"}
                </button>
              </div>
            )
          ) : listing.status === "ACTIVE" ? (
            <div className="marketListingCard__actions marketListingCard__actions--buy">
              <label className="marketField marketField--small">
                <span>Quantité</span>
                <input
                  type="number"
                  min={1}
                  max={listing.remainingQuantity}
                  value={defaultQty}
                  disabled={listing.listingMode === "LOT"}
                  onChange={(e) =>
                    setBuyQuantityByListing((prev) => ({
                      ...prev,
                      [listing.id]: e.target.value,
                    }))
                  }
                />
              </label>

              {listingNeedsCard(listing) && (
                <div className="marketListingCard__requiredTrade">
                  <span className="marketLabel">Carte exigée</span>
                  <strong>
                    {listing.wantedCardQuantity}x{" "}
                    {listing.wantedCardName ?? `Carte #${listing.wantedCardId}`}
                  </strong>
                </div>
              )}

              <button
                type="button"
                className="marketBtn"
                disabled={buyingId === listing.id}
                onClick={() => handleBuy(listing)}
              >
                {buyingId === listing.id
                  ? "Achat..."
                  : listingCanBuyPartially(listing)
                    ? "Acheter"
                    : "Acheter le lot"}
              </button>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  function renderPendingRewardCard(tx: MarketTransactionRow) {
    const soldCardImage = getCardImageFromMap(cardImageMap, {
      cardId: tx.cardId,
      cardKey: tx.cardKey,
    });

    const rewardCardImage = tx.pendingRewardCardId
      ? getCardImageFromMap(cardImageMap, {
          cardId: tx.pendingRewardCardId,
          cardKey: tx.buyerOfferedCardKey,
        })
      : "";

    return (
      <article className="marketRewardCard" key={tx.id}>
        <div className="marketRewardCard__media">
          {soldCardImage ? (
            <img src={soldCardImage} alt={tx.cardName} />
          ) : (
            <div className="marketListingCard__placeholder">Aucune image</div>
          )}
        </div>

        <div className="marketRewardCard__content">
          <div className="marketRewardCard__top">
            <div>
              <h4>{tx.cardName}</h4>
              <p>Vendu le {formatDate(tx.createdAt)}</p>
            </div>

            <span className="badge badge--above_market">Récompense à récupérer</span>
          </div>

          <div className="marketRewardCard__grid">
            <div>
              <span className="marketLabel">Acheteur</span>
              <strong>{tx.buyerUsername}</strong>
            </div>
            <div>
              <span className="marketLabel">Quantité vendue</span>
              <strong>{tx.quantity}</strong>
            </div>
            <div>
              <span className="marketLabel">Crédits à récupérer</span>
              <strong>{tx.pendingRewardCredits}</strong>
            </div>
            <div>
              <span className="marketLabel">Carte à récupérer</span>
              <strong>
                {tx.pendingRewardCardName
                  ? `${tx.pendingRewardCardQuantity}x ${tx.pendingRewardCardName}`
                  : "Aucune"}
              </strong>
            </div>
          </div>

          {tx.pendingRewardCardName && (
            <div className="marketRewardCard__wanted">
              <span>Carte reçue</span>
              <div className="marketRewardCard__wantedThumb">
                {rewardCardImage ? (
                  <img src={rewardCardImage} alt={tx.pendingRewardCardName} />
                ) : (
                  <div className="marketListingCard__placeholder marketListingCard__placeholder--small">
                    ?
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="marketRewardCard__actions">
            <button
              type="button"
              className="marketBtn"
              disabled={claimingTransactionId === tx.id}
              onClick={() => handleClaimReward(tx.id)}
            >
              {claimingTransactionId === tx.id
                ? "Récupération..."
                : "Récupérer la récompense"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="pageShell">
      <AppNavbar currentPage="market" />

      <main className="marketPage container">
        <header className="marketHero">
          <div>
            <h1>Market</h1>
            <p>
              Gère tes ventes, cherche des cartes, consulte l’historique et crée
              de nouvelles annonces.
            </p>
          </div>

          <div className="marketHero__actions">
            <Link className="marketBtn" to="/market/create">
              Créer une annonce
            </Link>
            <Link
              className="marketBtn marketBtn--secondary"
              to="/collection?quickSellMode=1"
            >
              Vente rapide
            </Link>
          </div>
        </header>

        <nav className="marketTabs">
          <button
            type="button"
            className={activeTab === "my-listings" ? "is-active" : ""}
            onClick={() => setActiveTab("my-listings")}
          >
            Mes ventes
          </button>
          <button
            type="button"
            className={activeTab === "suggestions" ? "is-active" : ""}
            onClick={() => setActiveTab("suggestions")}
          >
            Suggestions
          </button>
          <button
            type="button"
            className={activeTab === "search" ? "is-active" : ""}
            onClick={() => setActiveTab("search")}
          >
            Recherche
          </button>
          <button
            type="button"
            className={activeTab === "history" ? "is-active" : ""}
            onClick={() => setActiveTab("history")}
          >
            Historique
          </button>
        </nav>

        <section className="marketSearchPanel">
          <div className="marketSearchQuickRow marketSearchQuickRow--single">
            <label className="marketField marketField--quickSearch">
              <span>Recherche rapide</span>
              <input
                type="text"
                value={searchFilters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Nom, numéro, ID, mot-clé..."
              />
            </label>

            <button
              type="button"
              className="marketBtn marketBtn--secondary"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
            >
              {showAdvancedFilters ? "Masquer les filtres" : "Plus de filtres"}
            </button>
          </div>

          {showAdvancedFilters && (
            <>
              <div className="marketSearchGrid">
                <label className="marketField">
                  <span>Rareté</span>
                  <select
                    value={searchFilters.rarity}
                    onChange={(e) => updateFilter("rarity", e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {rarities.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="marketField">
                  <span>Saison</span>
                  <select
                    value={searchFilters.season}
                    onChange={(e) => updateFilter("season", e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {seasons.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="marketField">
                  <span>Mode de vente</span>
                  <select
                    value={searchFilters.listingMode}
                    onChange={(e) =>
                      updateFilter(
                        "listingMode",
                        e.target.value as "" | MarketListingMode,
                      )
                    }
                  >
                    <option value="">Tous</option>
                    <option value="UNIT">À l’unité</option>
                    <option value="LOT">En lot</option>
                  </select>
                </label>

                <label className="marketField">
                  <span>Type d’offre</span>
                  <select
                    value={searchFilters.offerType}
                    onChange={(e) =>
                      updateFilter(
                        "offerType",
                        e.target.value as "" | MarketOfferType,
                      )
                    }
                  >
                    <option value="">Tous</option>
                    <option value="CREDITS_ONLY">Crédits uniquement</option>
                    <option value="CARD_ONLY">Échange de carte</option>
                    <option value="CARD_AND_CREDITS">Carte + crédits</option>
                  </select>
                </label>

                <label className="marketField">
                  <span>Prix min</span>
                  <input
                    type="number"
                    min={0}
                    value={searchFilters.minPrice}
                    onChange={(e) => updateFilter("minPrice", e.target.value)}
                  />
                </label>

                <label className="marketField">
                  <span>Prix max</span>
                  <input
                    type="number"
                    min={0}
                    value={searchFilters.maxPrice}
                    onChange={(e) => updateFilter("maxPrice", e.target.value)}
                  />
                </label>

                <label className="marketField">
                  <span>Trier par</span>
                  <select
                    value={searchFilters.sortBy}
                    onChange={(e) =>
                      updateFilter(
                        "sortBy",
                        e.target.value as SearchFilters["sortBy"],
                      )
                    }
                  >
                    <option value="createdAt">Date</option>
                    <option value="priceCredits">Prix demandé</option>
                    <option value="marketPriceSnapshot">Prix du marché</option>
                    <option value="rarity">Rareté</option>
                    <option value="cardName">Nom</option>
                  </select>
                </label>

                <label className="marketField">
                  <span>Ordre</span>
                  <select
                    value={searchFilters.sortOrder}
                    onChange={(e) =>
                      updateFilter(
                        "sortOrder",
                        e.target.value as SearchFilters["sortOrder"],
                      )
                    }
                  >
                    <option value="DESC">Décroissant</option>
                    <option value="ASC">Croissant</option>
                  </select>
                </label>
              </div>

              <div className="marketSearchActions">
                <button
                  type="button"
                  className="marketBtn marketBtn--secondary"
                  onClick={() => {
                    setSearchFilters({
                      search: "",
                      rarity: "",
                      season: "",
                      listingMode: "",
                      offerType: "",
                      minPrice: "",
                      maxPrice: "",
                      sortBy: "createdAt",
                      sortOrder: "DESC",
                    });
                  }}
                >
                  Réinitialiser
                </button>
              </div>
            </>
          )}
        </section>

        {feedback && <div className="marketFeedback">{feedback}</div>}
        {loading && <div className="marketInfo">Chargement...</div>}
        {error && !loading && <div className="marketError">{error}</div>}

        {!loading && !error && activeTab === "my-listings" && (
          <div className="marketStack">
            <section className="marketSection">
              <div className="marketSection__head">
                <h2>Récompenses à récupérer</h2>
                <span>{rewardPendingSales.length} vente(s)</span>
              </div>

              {rewardPendingSales.length === 0 ? (
                <div className="marketEmpty">
                  Aucune récompense en attente.
                </div>
              ) : (
                <>
                  <SectionPreviewHeader
                    total={rewardPendingSales.length}
                    shown={Math.min(PREVIEW_COUNT, rewardPendingSales.length)}
                    previewLabel="Les plus récentes"
                  />
                  <div className="marketRewards">
                    {rewardPendingSales.slice(0, PREVIEW_COUNT).map((tx) =>
                      renderPendingRewardCard(tx),
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="marketSection">
              <div className="marketSection__head">
                <h2>Cartes en vente</h2>
                <span>{activeMyListings.length} annonce(s)</span>
              </div>

              {activeMyListings.length === 0 ? (
                <div className="marketEmpty">
                  Aucune annonce active.
                </div>
              ) : (
                <div className="marketCards">
                  {activeMyListings.map((listing) => renderListingCard(listing, "mine"))}
                </div>
              )}
            </section>

            <section className="marketSection">
              <div className="marketSection__head">
                <h2>Cartes annulées</h2>
                <span>{myListings.filter((l) => l.status === "CANCELLED").length} annonce(s)</span>
              </div>

              {cancelledMyListings.length === 0 ? (
                <div className="marketEmpty">
                  Aucune annonce annulée.
                </div>
              ) : (
                <>
                  <SectionPreviewHeader
                    total={myListings.filter((l) => l.status === "CANCELLED").length}
                    shown={cancelledMyListings.length}
                    previewLabel="Les plus récentes"
                  />
                  <div className="marketCards">
                    {cancelledMyListings.map((listing) => renderListingCard(listing, "mine"))}
                  </div>
                </>
              )}
            </section>

            <section className="marketSection">
              <div className="marketSection__head">
                <h2>Cartes vendues</h2>
                <span>{myListings.filter((l) => l.status === "SOLD").length} annonce(s)</span>
              </div>

              {soldMyListings.length === 0 ? (
                <div className="marketEmpty">
                  Aucune annonce vendue.
                </div>
              ) : (
                <>
                  <SectionPreviewHeader
                    total={myListings.filter((l) => l.status === "SOLD").length}
                    shown={soldMyListings.length}
                    previewLabel="Les plus récentes"
                  />
                  <div className="marketCards">
                    {soldMyListings.map((listing) => renderListingCard(listing, "mine"))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {!loading && !error && activeTab === "suggestions" && (
          <section className="marketSection">
            <div className="marketSection__head">
              <h2>Suggestions à acheter</h2>
              <span>
                Basées sur les annonces actives pour des cartes que tu ne
                possèdes pas
              </span>
            </div>

            {suggestedListings.length === 0 ? (
              <div className="marketEmpty">
                Aucune suggestion disponible pour l’instant.
              </div>
            ) : (
              <div className="marketCards">
                {suggestedListings.map((listing) =>
                  renderListingCard(listing, "suggestion"),
                )}
              </div>
            )}
          </section>
        )}

        {!loading && !error && activeTab === "search" && (
          <section className="marketSection">
            <div className="marketSection__head">
              <h2>Recherche d’annonces</h2>
              <span>{filteredListings.length} résultat(s)</span>
            </div>

            {filteredListings.length === 0 ? (
              <div className="marketEmpty">
                Aucune annonce ne correspond à tes filtres.
              </div>
            ) : (
              <div className="marketCards">
                {filteredListings.map((listing) => renderListingCard(listing, "market"))}
              </div>
            )}
          </section>
        )}

        {!loading && !error && activeTab === "history" && (
          <div className="marketHistoryGrid">
            <HistorySection
              title="Mes achats"
              items={purchases}
              expanded={showAllPurchases}
              page={purchasesPage}
              onToggleExpanded={() => setShowAllPurchases((prev) => !prev)}
              onPageChange={setPurchasesPage}
            />

            <HistorySection
              title="Mes ventes"
              items={sales}
              expanded={showAllSales}
              page={salesPage}
              onToggleExpanded={() => setShowAllSales((prev) => !prev)}
              onPageChange={setSalesPage}
            />
          </div>
        )}
      </main>
    </div>
  );
}
