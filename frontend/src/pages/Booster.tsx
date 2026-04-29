import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Dashboard.css";
import "../styles/Booster.css";

import AppNavbar from "../components/AppNavbar";

import { useAuth } from "../auth/AuthContext";
import { API_BASE } from "../api/http";
import { getEconomyMe, formatCooldown, type EconomySnapshot } from "../api/economy";
import {
  getBoosterSeasons,
  getOpeningHistory,
  getOpeningReplay,
  openBooster,
  openDisplay,
  type BoosterSeasonInfo,
  type OpeningHistoryItem,
} from "../api/booster";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";
import { playSoundEffect, playUiErrorSound, primeSound } from "../utils/sound";
import {
  getSeasonBoosterImage,
  getSeasonDisplayImage,
  hasSeasonBoosterImage,
  hasSeasonDisplayImage,
} from "../utils/seasonAssets";

type SeasonCard = BoosterSeasonInfo & {
  boosterImg: string;
  displayImg: string;
};

type ConfirmModalState =
  | {
      open: false;
      kind: null;
      season: null;
      price: number;
      title: string;
      description: string;
    }
  | {
      open: true;
      kind: "booster" | "display";
      season: SeasonCard;
      price: number;
      title: string;
      description: string;
    };

const CLOSED_MODAL: ConfirmModalState = {
  open: false,
  kind: null,
  season: null,
  price: 0,
  title: "",
  description: "",
};

const HISTORY_PER_PAGE = 12;

type BoosterPanel = "shop" | "history";

function formatSeasonMeta(season: BoosterSeasonInfo) {
  return `${season.cardCount} cartes • Saison ${season.seasonNumber}`;
}

function resolveHistoryImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
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

function formatHistoryKind(item: OpeningHistoryItem) {
  return item.kind === "display" ? "Display" : "Booster";
}

export default function Booster() {
  const navigate = useNavigate();
  const { credits, refreshWallet } = useAuth();

  const [eco, setEco] = useState<EconomySnapshot | null>(null);
  const [seasons, setSeasons] = useState<SeasonCard[]>([]);
  const [activePanel, setActivePanel] = useState<BoosterPanel>("shop");
  const [openingHistory, setOpeningHistory] = useState<OpeningHistoryItem[]>([]);
  const [openingHistoryPage, setOpeningHistoryPage] = useState(1);
  const [openingHistoryTotal, setOpeningHistoryTotal] = useState(0);
  const [openingHistoryTotalPages, setOpeningHistoryTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [replayBusyKey, setReplayBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CLOSED_MODAL);
  const [settings, setSettings] = useState(() => readAppSettings());

  async function loadOpeningHistory(page = openingHistoryPage, silent = false) {
    if (!silent) setLoadingHistory(true);

    try {
      const historyRes = await getOpeningHistory(page, HISTORY_PER_PAGE);
      setOpeningHistory(historyRes.items ?? []);
      setOpeningHistoryPage(historyRes.page ?? page);
      setOpeningHistoryTotal(historyRes.total ?? 0);
      setOpeningHistoryTotalPages(historyRes.totalPages ?? 1);
    } catch (e: any) {
      if (!silent) setError(e?.message || "Impossible de charger l'historique.");
      setOpeningHistory([]);
      setOpeningHistoryTotal(0);
      setOpeningHistoryTotalPages(1);
    } finally {
      if (!silent) setLoadingHistory(false);
    }
  }

  async function loadPageData() {
    setLoading(true);
    setError("");

    try {
      const [snap, seasonsRes, historyRes] = await Promise.all([
        getEconomyMe(),
        getBoosterSeasons(),
        getOpeningHistory(1, HISTORY_PER_PAGE).catch(() => ({
          items: [],
          page: 1,
          perPage: HISTORY_PER_PAGE,
          total: 0,
          totalPages: 1,
          hasPrev: false,
          hasNext: false,
        })),
      ]);

      setEco(snap);

      const openableSeasons = (seasonsRes ?? [])
        .filter((item) => item.isOpenable)
        .sort((a, b) => a.seasonNumber - b.seasonNumber)
        .map((item) => ({
          ...item,
          boosterImg: getSeasonBoosterImage(item.seasonNumber),
          displayImg: getSeasonDisplayImage(item.seasonNumber),
        }))
        .filter(
          (item) =>
            hasSeasonBoosterImage(item.seasonNumber) &&
            hasSeasonDisplayImage(item.seasonNumber)
        );

      setSeasons(openableSeasons);
      setOpeningHistory(historyRes.items ?? []);
      setOpeningHistoryPage(historyRes.page ?? 1);
      setOpeningHistoryTotal(historyRes.total ?? 0);
      setOpeningHistoryTotalPages(historyRes.totalPages ?? 1);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les saisons et l'économie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  useEffect(() => {
    if (!confirmModal.open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyKey) {
        setConfirmModal(CLOSED_MODAL);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmModal.open, busyKey]);

  const boosterCooldown = useMemo(
    () => formatCooldown(eco?.nextBoosterChargeAt ?? null),
    [eco?.nextBoosterChargeAt]
  );

  const displayCooldown = useMemo(
    () => formatCooldown(eco?.nextDisplayChargeAt ?? null),
    [eco?.nextDisplayChargeAt]
  );

  const boosterDisabled =
    !eco || (eco.freeBoosterCharges <= 0 && !!boosterCooldown) || !!busyKey;

  const displayDisabled =
    !eco || (eco.freeDisplayCharges <= 0 && !!displayCooldown) || !!busyKey;

  function boosterBtnLabel() {
    if (!eco) return "Ouvrir Booster";
    if (eco.freeBoosterCharges > 0) return "Ouvrir Booster";
    if (boosterCooldown) return `Cooldown (${boosterCooldown})`;
    return `Ouvrir Booster • ${eco.costs.booster} crédits`;
  }

  function displayBtnLabel() {
    if (!eco) return "Ouvrir Display";
    if (eco.freeDisplayCharges > 0) return "Ouvrir Display";
    if (displayCooldown) return `Cooldown (${displayCooldown})`;
    return `Ouvrir Display • ${eco.costs.display} crédits`;
  }

  function askOpenBooster(season: SeasonCard) {
    if (!eco || busyKey || boosterDisabled) return;
    void primeSound();

    if (eco.freeBoosterCharges > 0 || !settings.confirmPurchases) {
      void onOpenBooster(season);
      return;
    }

    setConfirmModal({
      open: true,
      kind: "booster",
      season,
      price: eco.costs.booster,
      title: `Confirmer l'ouverture du booster ${season.label}`,
      description: `Cette ouverture te coûtera ${eco.costs.booster} crédits. Aucun débit ne sera effectué tant que tu n’as pas confirmé.`,
    });
  }

  function askOpenDisplay(season: SeasonCard) {
    if (!eco || busyKey || displayDisabled) return;
    void primeSound();

    if (eco.freeDisplayCharges > 0 || !settings.confirmPurchases) {
      void onOpenDisplay(season);
      return;
    }

    setConfirmModal({
      open: true,
      kind: "display",
      season,
      price: eco.costs.display,
      title: `Confirmer l'ouverture de la display ${season.label}`,
      description: `Cette ouverture te coûtera ${eco.costs.display} crédits. Aucun débit ne sera effectué tant que tu n’as pas confirmé.`,
    });
  }

  async function onOpenBooster(season: SeasonCard) {
    if (!eco || busyKey || boosterDisabled) return;

    const key = `booster:${season.seasonNumber}`;
    setBusyKey(key);
    setError("");

    try {
      const res = await openBooster(season.seasonNumber);
      setConfirmModal(CLOSED_MODAL);
      playSoundEffect("opening.purchase-booster");

      await refreshWallet();
      await loadPageData();

      navigate("/opening", {
        state: {
          kind: "booster",
          season: res?.season ?? season.label,
          seasonNumber: res?.seasonNumber ?? season.seasonNumber,
          result: res,
        },
      });
    } catch (e: any) {
      playUiErrorSound();
      setError(e?.message || "Ouverture impossible.");
    } finally {
      setBusyKey(null);
    }
  }

  async function onOpenDisplay(season: SeasonCard) {
    if (!eco || busyKey || displayDisabled) return;

    const key = `display:${season.seasonNumber}`;
    setBusyKey(key);
    setError("");

    try {
      const res = await openDisplay(season.seasonNumber);
      setConfirmModal(CLOSED_MODAL);
      playSoundEffect("opening.purchase-display");

      await refreshWallet();
      await loadPageData();

      navigate("/opening", {
        state: {
          kind: "display",
          season: res?.season ?? season.label,
          seasonNumber: res?.seasonNumber ?? season.seasonNumber,
          result: res,
        },
      });
    } catch (e: any) {
      playUiErrorSound();
      setError(e?.message || "Ouverture impossible.");
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmCurrentOpening() {
    if (!confirmModal.open || !confirmModal.kind || !confirmModal.season || busyKey) return;
    void primeSound();

    if (confirmModal.kind === "booster") {
      await onOpenBooster(confirmModal.season);
      return;
    }

    await onOpenDisplay(confirmModal.season);
  }

  async function replayOpening(item: OpeningHistoryItem) {
    if (!item.canReplay || replayBusyKey || busyKey) return;
    void primeSound();

    const key = `${item.kind}:${item.id}`;
    setReplayBusyKey(key);
    setError("");

    try {
      const replay = await getOpeningReplay(item.kind, item.id);

      navigate("/opening", {
        state: {
          kind: replay.kind,
          season: replay.season,
          seasonNumber: replay.seasonNumber ?? undefined,
          result: replay.result,
          replay: true,
          openedAt: replay.openedAt,
          historyId: replay.id,
        },
      });
    } catch (e: any) {
      playUiErrorSound();
      setError(e?.message || "Replay impossible.");
    } finally {
      setReplayBusyKey(null);
    }
  }

  function switchPanel(panel: BoosterPanel) {
    void primeSound();
    setActivePanel(panel);

    if (panel === "history") {
      void loadOpeningHistory(openingHistoryPage, false);
    }
  }

  function goToHistoryPage(page: number) {
    const safePage = Math.max(1, Math.min(openingHistoryTotalPages, page));
    void loadOpeningHistory(safePage, false);
  }

  if (loading) {
    return (
      <div className="app-shell">
        <AppNavbar currentPage="booster" />
        <div className="container">
          <div className="panel" style={{ marginTop: 16, padding: 16 }}>
            <div className="muted">Chargement…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-shell">
        <AppNavbar currentPage="booster" />

        <div className="container boosterPage">
          <section className="boosterHero">
            <div className="boosterHero__left">
              <h1 className="boosterHero__title">Boosters</h1>
            </div>

            <div className="boosterHero__right">
              <div className="boosterWallet">
                <div className="boosterWallet__label">Solde</div>
                <div className="boosterWallet__value">
                  {typeof credits === "number" ? credits : eco?.credits ?? 0} crédits
                </div>
                <div className="boosterWallet__meta muted">
                  Gratuites : {eco?.freeBoosterCharges ?? 0} booster • {eco?.freeDisplayCharges ?? 0} display
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <div className="error" style={{ marginTop: 14 }}>
              {error}
            </div>
          ) : null}

          <div className="boosterPanelSwitch" role="tablist" aria-label="Sections boosters">
            <button
              type="button"
              className={["boosterPanelSwitch__btn", activePanel === "shop" ? "is-active" : ""].join(" ")}
              onClick={() => switchPanel("shop")}
              role="tab"
              aria-selected={activePanel === "shop"}
            >
              Ouvrir
            </button>
            <button
              type="button"
              className={["boosterPanelSwitch__btn", activePanel === "history" ? "is-active" : ""].join(" ")}
              onClick={() => switchPanel("history")}
              role="tab"
              aria-selected={activePanel === "history"}
            >
              Historique
              {openingHistoryTotal > 0 ? <span>{openingHistoryTotal}</span> : null}
            </button>
          </div>

          {activePanel === "history" ? (
            <section className="panel openingHistoryPanel">
              <div className="openingHistoryPanel__header">
                <div>
                  <div className="openingHistoryPanel__eyebrow">Opening log</div>
                  <h2 className="openingHistoryPanel__title">Historique complet</h2>
                </div>
                <span className="openingHistoryPanel__count">
                  {openingHistoryTotal} opening{openingHistoryTotal > 1 ? "s" : ""} • page {openingHistoryPage}/{openingHistoryTotalPages}
                </span>
              </div>

              {loadingHistory ? (
                <div className="openingHistoryEmpty">Chargement de l'historique...</div>
              ) : openingHistory.length === 0 ? (
                <div className="openingHistoryEmpty">
                  Aucun opening dans l'historique pour le moment. Le premier booster va lancer la collection.
                </div>
              ) : (
                <div className="openingHistoryList openingHistoryList--paged">
                  {openingHistory.map((item, index) => {
                  const cover = resolveHistoryImg(item.coverCard?.imageUrl ?? item.coverCard?.image ?? "");
                  const busy = replayBusyKey === `${item.kind}:${item.id}`;
                  const isLatest = openingHistoryPage === 1 && index === 0;

                  return (
                    <article
                      key={`${item.kind}-${item.id}`}
                      className={[
                        "openingHistoryCard",
                        isLatest ? "openingHistoryCard--latest" : "",
                        item.hasGoldBooster ? "openingHistoryCard--gold" : "",
                      ].join(" ")}
                    >
                      <div className="openingHistoryCard__visual">
                        {cover ? (
                          <img src={cover} alt={item.coverCard?.name ?? "Carte de l'ouverture"} />
                        ) : (
                          <span>{formatHistoryKind(item).slice(0, 1)}</span>
                        )}
                      </div>

                      <div className="openingHistoryCard__body">
                        <div className="openingHistoryCard__topline">
                          <span>{isLatest ? "Dernier opening" : formatHistoryKind(item)}</span>
                          <span>{formatOpeningDate(item.openedAt)}</span>
                        </div>

                        <h3 className="openingHistoryCard__title">
                          {formatHistoryKind(item)} {item.seasonNumber ? `S${item.seasonNumber}` : ""}
                          {item.kind === "display" ? ` • ${item.boosterCount} boosters` : ""}
                        </h3>

                        <div className="openingHistoryCard__meta">
                          <span>+{item.creditsEarnedTotal ?? 0} credits</span>
                          <span>{item.newCount} NEW</span>
                          <span>{item.hitCount} hits</span>
                        </div>
                      </div>

                      <button
                        className="btn btn--ghost openingHistoryCard__replay"
                        type="button"
                        disabled={!item.canReplay || !!busyKey || !!replayBusyKey}
                        onClick={() => {
                          void replayOpening(item);
                        }}
                        title={!item.canReplay ? "Ancienne ouverture non rejouable" : undefined}
                      >
                        {busy ? "Chargement..." : "Revoir"}
                      </button>
                    </article>
                  );
                  })}
                </div>
              )}

              {openingHistoryTotalPages > 1 ? (
                <div className="openingHistoryPagination">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={openingHistoryPage <= 1 || loadingHistory}
                    onClick={() => goToHistoryPage(openingHistoryPage - 1)}
                  >
                    Page precedente
                  </button>
                  <span>
                    {Math.min((openingHistoryPage - 1) * HISTORY_PER_PAGE + 1, openingHistoryTotal)}
                    {" "}-{" "}
                    {Math.min(openingHistoryPage * HISTORY_PER_PAGE, openingHistoryTotal)}
                    {" "}sur {openingHistoryTotal}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={openingHistoryPage >= openingHistoryTotalPages || loadingHistory}
                    onClick={() => goToHistoryPage(openingHistoryPage + 1)}
                  >
                    Page suivante
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {activePanel === "shop" && seasons.length === 0 ? (
            <div className="panel boosterEmpty">
              <div className="boosterEmpty__title">Aucune saison affichable</div>
              <div className="boosterEmpty__text">
                Vérifie le seed des cartes, les raretés requises, les terrains, et la présence d’un visuel
                <b> booster.* </b>et <b>display.*</b> dans <b>src/assets/boosters/season-X/</b>.
              </div>
            </div>
          ) : activePanel === "shop" ? (
            <div className="boosterGrid">
              {seasons.map((s) => (
                <div key={s.seasonNumber} className="panel boosterSeasonCard">
                  <div className="boosterSeasonCard__top">
                    <div>
                      <div className="boosterSeasonCard__name">{s.label}</div>
                      <div className="boosterSeasonCard__meta">{formatSeasonMeta(s)}</div>
                    </div>
                    <div className="boosterSeasonCard__badge">S{s.seasonNumber}</div>
                  </div>

                  <div className="boosterSeasonCard__packs">
                    <div className="boosterPack">
                      <div
                        className={["boosterPack__visual", boosterDisabled ? "is-disabled" : ""].join(" ")}
                        role="button"
                        tabIndex={boosterDisabled ? -1 : 0}
                        aria-disabled={boosterDisabled}
                        onClick={() => {
                          if (!boosterDisabled) askOpenBooster(s);
                        }}
                        onKeyDown={(e) => {
                          if (boosterDisabled) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            askOpenBooster(s);
                          }
                        }}
                      >
                        <img className="boosterPack__img" src={s.boosterImg} alt={`Booster ${s.label}`} />
                      </div>

                      <button
                        className="btn btn--primary w-full"
                        disabled={boosterDisabled}
                        onClick={() => askOpenBooster(s)}
                      >
                        {busyKey === `booster:${s.seasonNumber}` ? "Ouverture..." : boosterBtnLabel()}
                      </button>
                    </div>

                    <div className="boosterPack">
                      <div
                        className={[
                          "boosterPack__visual",
                          "boosterPack__visual--display",
                          displayDisabled ? "is-disabled" : "",
                        ].join(" ")}
                        role="button"
                        tabIndex={displayDisabled ? -1 : 0}
                        aria-disabled={displayDisabled}
                        onClick={() => {
                          if (!displayDisabled) askOpenDisplay(s);
                        }}
                        onKeyDown={(e) => {
                          if (displayDisabled) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            askOpenDisplay(s);
                          }
                        }}
                      >
                        <img
                          className="boosterPack__img boosterPack__img--display"
                          src={s.displayImg}
                          alt={`Display ${s.label}`}
                        />
                      </div>

                      <button
                        className="btn btn--ghost w-full"
                        disabled={displayDisabled}
                        onClick={() => askOpenDisplay(s)}
                      >
                        {busyKey === `display:${s.seasonNumber}` ? "Ouverture..." : displayBtnLabel()}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {confirmModal.open ? (
        <div
          className="confirmModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={() => {
            if (!busyKey) setConfirmModal(CLOSED_MODAL);
          }}
        >
          <div className="confirmModal__backdrop" aria-hidden="true" />

          <div className="confirmModal__card" onClick={(e) => e.stopPropagation()}>
            <div className="confirmModal__glow" />

            <div className="confirmModal__header">
              <div className="confirmModal__eyebrow">Confirmation</div>
              <h2 id="confirm-modal-title" className="confirmModal__title">
                {confirmModal.title}
              </h2>
              <button
                type="button"
                className="confirmModal__close"
                onClick={() => setConfirmModal(CLOSED_MODAL)}
                disabled={!!busyKey}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="confirmModal__body">
              <p className="confirmModal__text">{confirmModal.description}</p>

              <div className="confirmModal__priceBox">
                <span className="confirmModal__priceLabel">Coût</span>
                <span className="confirmModal__priceValue">{confirmModal.price} crédits</span>
              </div>

              <div className="confirmModal__wallet">
                <span>Solde actuel</span>
                <b>{typeof credits === "number" ? credits : eco?.credits ?? 0} crédits</b>
              </div>
            </div>

            <div className="confirmModal__actions">
              <button
                type="button"
                className="btn btn--ghost confirmModal__btn"
                onClick={() => setConfirmModal(CLOSED_MODAL)}
                disabled={!!busyKey}
              >
                Annuler
              </button>

              <button
                type="button"
                className="btn btn--primary confirmModal__btn confirmModal__btn--confirm"
                onClick={() => {
                  void confirmCurrentOpening();
                }}
                disabled={!!busyKey}
              >
                {busyKey ? "Ouverture..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
