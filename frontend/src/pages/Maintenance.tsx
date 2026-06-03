import { Link } from "react-router-dom";

import "../styles.css";
import "../styles/Maintenance.css";

import type { SystemStatusResponse } from "../api/system";
import SmartImage from "../components/SmartImage";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import wankulLogoBlack from "../assets/logo_wankul_noir.png";
import { getSeasonBoosterImage } from "../utils/seasonAssets";

type MaintenanceProps = {
  status: SystemStatusResponse;
};

export default function Maintenance({ status }: MaintenanceProps) {
  return (
    <main className="maintenancePage">
      <section className="maintenanceCard" aria-labelledby="maintenance-title">
        <div className="maintenanceCard__copy">
          <div className="maintenanceTopline">
            <Link to="/" className="maintenanceBrand" aria-label="Accueil Wankul TCG">
              <SmartImage
                src={wankulLogo}
                className="maintenanceBrand__logo maintenanceBrand__logo--white"
                alt="Wankul"
                loading="eager"
                fetchPriority="high"
              />
              <SmartImage
                src={wankulLogoBlack}
                className="maintenanceBrand__logo maintenanceBrand__logo--black"
                alt="Wankul"
                loading="eager"
                fetchPriority="high"
              />
            </Link>
            <span className="maintenanceCard__kicker">Maintenance en cours</span>
          </div>
          <h1 id="maintenance-title">On prépare la prochaine ouverture.</h1>
          <p>
            {status.message ||
              "Wankul TCG se met à jour. Tes cartes, tes WunkulCoins et ton compte restent bien au chaud pendant qu'on prépare la suite."}
          </p>

          {status.eta ? (
            <div className="maintenanceEta">
              <span>Retour prévu</span>
              <strong>{status.eta}</strong>
            </div>
          ) : null}

          <div className="maintenanceActions">
            <Link className="btn btn--primary" to="/login">
              Login
            </Link>
            <button className="btn btn--ghost" type="button" onClick={() => window.location.reload()}>
              Réessayer
            </button>
          </div>

          <div className="maintenanceNotes" aria-label="Ce qui se passe">
            <div>
              <span>Compte</span>
              <strong>Rien n'est perdu.</strong>
            </div>
            <div>
              <span>Market</span>
              <strong>Les échanges patientent.</strong>
            </div>
            <div>
              <span>Opening</span>
              <strong>Les boosters reviennent vite.</strong>
            </div>
          </div>
        </div>

        <div className="maintenanceCard__visual" aria-hidden="true">
          <div className="maintenanceGlow maintenanceGlow--pink" />
          <div className="maintenanceGlow maintenanceGlow--cyan" />
          <div className="maintenancePack">
            <SmartImage
              src={getSeasonBoosterImage(5)}
              alt=""
              className="maintenancePack__booster maintenancePack__booster--legacy"
              loading="eager"
              fetchPriority="high"
            />
            <SmartImage
              src={getSeasonBoosterImage(3)}
              alt=""
              className="maintenancePack__booster maintenancePack__booster--battle"
              loading="lazy"
            />
            <SmartImage
              src={getSeasonBoosterImage(4)}
              alt=""
              className="maintenancePack__booster maintenancePack__booster--stellar"
              loading="lazy"
            />
          </div>
          <div className="maintenanceSeal">
            <span>{status.sealLabel || "Update"}</span>
            <strong>{status.sealText || "Mode test admin actif"}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
