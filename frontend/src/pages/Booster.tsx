import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Menu.css";
import "../styles/Booster.css";

import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";

import { useAuth } from "../auth/AuthContext";
import { getEconomyMe, formatCooldown, type EconomySnapshot } from "../api/economy";
import { openBooster, openDisplay, type SeasonName } from "../api/booster";

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

const SEASONS: SeasonCard[] = [
  { id: "Origins", label: "Origins", boosterImg: originsBooster, displayImg: originsDisplay },
  { id: "Campus", label: "Campus", boosterImg: campusBooster, displayImg: campusDisplay },
  { id: "Battle", label: "Battle", boosterImg: battleBooster, displayImg: battleDisplay },
  { id: "Stellar", label: "Stellar", boosterImg: stellarBooster, displayImg: stellarDisplay },
];

export default function Booster() {
  const navigate = useNavigate();
  const { logout, credits, refreshWallet } = useAuth();

  const [eco, setEco] = useState<EconomySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

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

  const boosterCooldown = useMemo(
    () => formatCooldown(eco?.nextBoosterChargeAt ?? null),
    [eco?.nextBoosterChargeAt]
  );

  const displayCooldown = useMemo(
    () => formatCooldown(eco?.nextDisplayChargeAt ?? null),
    [eco?.nextDisplayChargeAt]
  );

  async function onOpenBooster(season: SeasonName) {
    if (!eco || busyKey) return;

    const key = `booster:${season}`;
    setBusyKey(key);
    setError("");

    try {
      const res = await openBooster(season);
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
    if (!eco || busyKey) return;

    const key = `display:${season}`;
    setBusyKey(key);
    setError("");

    try {
      const res = await openDisplay(season);
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

  const boosterDisabled =
    !eco || (eco.freeBoosterCharges <= 0 && !!boosterCooldown) || !!busyKey;

  const displayDisabled =
    !eco || (eco.freeDisplayCharges <= 0 && !!displayCooldown) || !!busyKey;

  if (loading) {
    return (
      <div className="container">
        <div className="panel" style={{ marginTop: 16, padding: 16 }}>
          <div className="muted">Chargement…</div>
        </div>
      </div>
    );
  }

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

        {error ? <div className="error" style={{ marginTop: 14 }}>{error}</div> : null}

        <div className="boosterGrid">
          {SEASONS.map((s) => (
            <div key={s.id} className="panel boosterSeasonCard">
              <div className="boosterSeasonCard__top">
                <div className="boosterSeasonCard__name">{s.label}</div>
              </div>

              <div className="boosterSeasonCard__packs">
                <div className="boosterPack">
                  <div className="boosterPack__visual">
                    <img
                      className="boosterPack__img"
                      src={s.boosterImg}
                      alt={`Booster ${s.label}`}
                    />
                  </div>

                  <button
                    className="btn btn--primary w-full"
                    disabled={boosterDisabled}
                    onClick={() => onOpenBooster(s.id)}
                  >
                    {busyKey === `booster:${s.id}` ? "Ouverture..." : boosterBtnLabel()}
                  </button>
                </div>

                <div className="boosterPack">
                  <div className="boosterPack__visual boosterPack__visual--display">
                    <img
                      className="boosterPack__img boosterPack__img--display"
                      src={s.displayImg}
                      alt={`Display ${s.label}`}
                    />
                  </div>

                  <button
                    className="btn btn--ghost w-full"
                    disabled={displayDisabled}
                    onClick={() => onOpenDisplay(s.id)}
                  >
                    {busyKey === `display:${s.id}` ? "Ouverture..." : displayBtnLabel()}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}