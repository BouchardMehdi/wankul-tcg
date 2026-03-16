import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Menu.css";
import "../styles/Booster.css";

import AppNavbar from "../components/AppNavbar";

import { useAuth } from "../auth/AuthContext";
import { getEconomyMe, formatCooldown, type EconomySnapshot } from "../api/economy";
import { openBooster, openDisplay, type SeasonName } from "../api/booster";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";

const originsBooster = new URL("../assets/boosters/booster_origin.png", import.meta.url).href;
const campusBooster = new URL("../assets/boosters/booster_campus.png", import.meta.url).href;
const battleBooster = new URL("../assets/boosters/booster_battle.png", import.meta.url).href;
const stellarBooster = new URL("../assets/boosters/booster_stellar.png", import.meta.url).href;

const originsDisplay = new URL("../assets/boosters/display_origin.webp", import.meta.url).href;
const campusDisplay = new URL("../assets/boosters/display_campus.webp", import.meta.url).href;
const battleDisplay = new URL("../assets/boosters/display_battle.webp", import.meta.url).href;
const stellarDisplay = new URL("../assets/boosters/display_stellar.webp", import.meta.url).href;

type SeasonCard = {
  id: SeasonName;
  label: string;
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
      season: SeasonName;
      price: number;
      title: string;
      description: string;
    };

const SEASONS: SeasonCard[] = [
  { id: "Origins", label: "Origins", boosterImg: originsBooster, displayImg: originsDisplay },
  { id: "Campus", label: "Campus", boosterImg: campusBooster, displayImg: campusDisplay },
  { id: "Battle", label: "Battle", boosterImg: battleBooster, displayImg: battleDisplay },
  { id: "Stellar", label: "Stellar", boosterImg: stellarBooster, displayImg: stellarDisplay },
];

const CLOSED_MODAL: ConfirmModalState = {
  open: false,
  kind: null,
  season: null,
  price: 0,
  title: "",
  description: "",
};

export default function Booster() {
  const navigate = useNavigate();
  const { credits, refreshWallet } = useAuth();

  const [eco, setEco] = useState<EconomySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CLOSED_MODAL);
  const [settings, setSettings] = useState(() => readAppSettings());

  async function loadEconomy() {
    setLoading(true);
    setError("");
    try {
      const snap = await getEconomyMe();
      setEco(snap);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger l'économie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEconomy();
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

  function askOpenBooster(season: SeasonName) {
    if (!eco || busyKey || boosterDisabled) return;

    if (eco.freeBoosterCharges > 0 || !settings.confirmPurchases) {
      void onOpenBooster(season);
      return;
    }

    setConfirmModal({
      open: true,
      kind: "booster",
      season,
      price: eco.costs.booster,
      title: `Confirmer l'ouverture du booster ${season}`,
      description: `Cette ouverture te coûtera ${eco.costs.booster} crédits. Aucun débit ne sera effectué tant que tu n’as pas confirmé.`,
    });
  }

  function askOpenDisplay(season: SeasonName) {
    if (!eco || busyKey || displayDisabled) return;

    if (eco.freeDisplayCharges > 0 || !settings.confirmPurchases) {
      void onOpenDisplay(season);
      return;
    }

    setConfirmModal({
      open: true,
      kind: "display",
      season,
      price: eco.costs.display,
      title: `Confirmer l'ouverture de la display ${season}`,
      description: `Cette ouverture te coûtera ${eco.costs.display} crédits. Aucun débit ne sera effectué tant que tu n’as pas confirmé.`,
    });
  }

  async function onOpenBooster(season: SeasonName) {
    if (!eco || busyKey || boosterDisabled) return;

    const key = `booster:${season}`;
    setBusyKey(key);
    setError("");

    try {
      const res = await openBooster(season);
      setConfirmModal(CLOSED_MODAL);

      await refreshWallet();
      await loadEconomy();

      navigate("/opening", {
        state: { kind: "booster", season, result: res },
      });
    } catch (e: any) {
      setError(e?.message || "Ouverture impossible.");
    } finally {
      setBusyKey(null);
    }
  }

  async function onOpenDisplay(season: SeasonName) {
    if (!eco || busyKey || displayDisabled) return;

    const key = `display:${season}`;
    setBusyKey(key);
    setError("");

    try {
      const res = await openDisplay(season);
      setConfirmModal(CLOSED_MODAL);

      await refreshWallet();
      await loadEconomy();

      navigate("/opening", {
        state: { kind: "display", season, result: res },
      });
    } catch (e: any) {
      setError(e?.message || "Ouverture impossible.");
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmCurrentOpening() {
    if (!confirmModal.open || !confirmModal.kind || !confirmModal.season || busyKey) return;

    if (confirmModal.kind === "booster") {
      await onOpenBooster(confirmModal.season);
      return;
    }

    await onOpenDisplay(confirmModal.season);
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
              <p className="boosterHero__subtitle">
                Choisis une saison et ouvre soit un booster, soit une display.
              </p>
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

          <div className="boosterGrid">
            {SEASONS.map((s) => (
              <div key={s.id} className="panel boosterSeasonCard">
                <div className="boosterSeasonCard__top">
                  <div className="boosterSeasonCard__name">{s.label}</div>
                </div>

                <div className="boosterSeasonCard__packs">
                  <div className="boosterPack">
                    <div
                      className={[
                        "boosterPack__visual",
                        boosterDisabled ? "is-disabled" : "",
                      ].join(" ")}
                      role="button"
                      tabIndex={boosterDisabled ? -1 : 0}
                      aria-disabled={boosterDisabled}
                      onClick={() => {
                        if (!boosterDisabled) askOpenBooster(s.id);
                      }}
                      onKeyDown={(e) => {
                        if (boosterDisabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          askOpenBooster(s.id);
                        }
                      }}
                    >
                      <img
                        className="boosterPack__img"
                        src={s.boosterImg}
                        alt={`Booster ${s.label}`}
                      />
                    </div>

                    <button
                      className="btn btn--primary w-full"
                      disabled={boosterDisabled}
                      onClick={() => askOpenBooster(s.id)}
                    >
                      {busyKey === `booster:${s.id}` ? "Ouverture..." : boosterBtnLabel()}
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
                        if (!displayDisabled) askOpenDisplay(s.id);
                      }}
                      onKeyDown={(e) => {
                        if (displayDisabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          askOpenDisplay(s.id);
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
                      onClick={() => askOpenDisplay(s.id)}
                    >
                      {busyKey === `display:${s.id}` ? "Ouverture..." : displayBtnLabel()}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

          <div
            className="confirmModal__card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirmModal__glow" />

            <div className="confirmModal__header">
              <div className="confirmModal__eyebrow">
                Confirmation
              </div>
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