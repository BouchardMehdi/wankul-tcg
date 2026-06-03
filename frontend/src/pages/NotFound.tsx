import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";

import "../styles.css";
import "../styles/NotFound.css";

import { useAuth } from "../auth/AuthContext";
import AppNavbar from "../components/AppNavbar";
import SmartImage from "../components/SmartImage";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import wankulLogoBlack from "../assets/logo_wankul_noir.png";
import { getSeasonBoosterImage } from "../utils/seasonAssets";

const FAN_BOOSTERS = [
  { season: 1, label: "Origins", rotate: -20, shift: -132 },
  { season: 2, label: "Campus", rotate: -9, shift: -66 },
  { season: 3, label: "Battle", rotate: 1, shift: 0 },
  { season: 4, label: "Stellar", rotate: 10, shift: 66 },
  { season: 5, label: "Legacy", rotate: 19, shift: 132 },
];

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const homeTarget = isAuthenticated ? "/dashboard" : "/";

  return (
    <>
      {isAuthenticated ? (
        <AppNavbar currentPage="not-found" />
      ) : (
        <header className="notFoundTopbar">
          <div className="container notFoundTopbar__inner">
            <Link to="/" className="notFoundTopbar__brand" aria-label="Accueil Wankul TCG">
              <SmartImage
                src={wankulLogo}
                className="notFoundTopbar__logo notFoundTopbar__logo--white"
                alt="Wankul"
                loading="eager"
                fetchPriority="high"
              />
              <SmartImage
                src={wankulLogoBlack}
                className="notFoundTopbar__logo notFoundTopbar__logo--black"
                alt="Wankul"
                loading="eager"
                fetchPriority="high"
              />
            </Link>

            <div className="notFoundTopbar__actions">
              <Link className="btn btn--ghost" to="/login">Connexion</Link>
              <Link className="btn btn--primary" to="/register">Créer un compte</Link>
            </div>
          </div>
        </header>
      )}

      <main className="container notFoundPage">
        <section className="notFoundHero" aria-labelledby="not-found-title">
          <div className="notFoundHero__copy">
            <span className="notFoundHero__kicker">Erreur 404</span>
            <h1 id="not-found-title">Cette page n'est pas dans le booster.</h1>
            <p>
              La route <strong>{location.pathname}</strong> a sûrement glissé
              entre deux cartes. Reviens sur une vraie zone de jeu et on reprend
              la chasse aux hits.
            </p>

            <div className="notFoundHero__actions" aria-label="Actions de retour">
              <Link className="btn btn--primary" to={homeTarget}>
                {isAuthenticated ? "Retour au Home" : "Retour à l'accueil"}
              </Link>
              <Link className="btn btn--ghost" to={isAuthenticated ? "/booster" : "/login"}>
                {isAuthenticated ? "Ouvrir un booster" : "Me connecter"}
              </Link>
            </div>

            <div className="notFoundClues" aria-label="Indices">
              <div>
                <span>Indice 01</span>
                <strong>La carte ciblée est ailleurs.</strong>
              </div>
              <div>
                <span>Indice 02</span>
                <strong>Le market n'a rien trouvé.</strong>
              </div>
              <div>
                <span>Indice 03</span>
                <strong>Le prochain booster peut sauver la run.</strong>
              </div>
            </div>
          </div>

          <div className="notFoundHero__visual" aria-hidden="true">
            <div className="notFoundOrbit notFoundOrbit--one" />
            <div className="notFoundOrbit notFoundOrbit--two" />
            <div className="notFoundNumber">404</div>
            <div className="notFoundFan">
              {FAN_BOOSTERS.map((booster) => (
                <SmartImage
                  key={booster.season}
                  src={getSeasonBoosterImage(booster.season)}
                  alt=""
                  className={`notFoundFan__card notFoundFan__card--s${booster.season}`}
                  style={{
                    "--rotate": `${booster.rotate}deg`,
                    "--shift": `${booster.shift}px`,
                  } as CSSProperties}
                  loading={booster.season === 3 ? "eager" : "lazy"}
                  fetchPriority={booster.season === 3 ? "high" : "auto"}
                />
              ))}
            </div>
            <div className="notFoundTicket">
              <span>Page introuvable</span>
              <strong>Relance depuis le deck principal.</strong>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
