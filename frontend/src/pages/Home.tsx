import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import wankilLogo from '../assets/Wankil_Studio_Logo.png';
import wankulLogo from '../assets/Wankul_Logo_Blanc.webp';
import lainkImg from '../assets/wankul_laink.png';
import terracidImg from '../assets/wankul_terra.png';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      {/* HERO */}
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__left">
            <div className="badge">Projet fan • WebApp</div>
            <h1>Wankul WebApp</h1>
            <p className="hero__subtitle">
              Une application web <strong>créée par un fan</strong> autour des cartes <strong>Wankul</strong> :
              ouverture de boosters, collection, progression et stats — avec un tirage 100% côté serveur.
            </p>

            <div className="hero__actions">
              {!isAuthenticated ? (
                <>
                  <Link className="btn btn-lg" to="/register">
                    Créer un compte
                  </Link>
                  <Link className="btn secondary btn-lg" to="/login">
                    Se connecter
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn-lg" to="/booster">
                    Ouvrir un booster
                  </Link>
                  <Link className="btn secondary btn-lg" to="/collection">
                    Voir ma collection
                  </Link>
                </>
              )}
            </div>

            <div className="disclaimer">
              Disclaimer : projet non-officiel, fait pour le fun/portfolio, sans affiliation avec Wankil Studio.
            </div>
          </div>

          <div className="hero__right">
            <div className="heroCard">
              <img className="heroCard__logo" src={wankulLogo} alt="Wankul logo" />
              <div className="heroCard__grid">
                <div className="mini">
                  <div className="mini__title">Boosters</div>
                  <div className="mini__text">Ouverture animée (phase suivante)</div>
                </div>
                <div className="mini">
                  <div className="mini__title">Collection</div>
                  <div className="mini__text">Progression + filtres</div>
                </div>
                <div className="mini">
                  <div className="mini__title">Économie</div>
                  <div className="mini__text">Crédits + cooldowns</div>
                </div>
                <div className="mini">
                  <div className="mini__title">Stats</div>
                  <div className="mini__text">Taux réels / simulés</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero__glow" />
      </section>

      {/* SECTION : C'EST QUOI */}
      <section className="section">
        <div className="container">
          <h2>C’est quoi ce site ?</h2>
          <p className="muted">
            Cette webapp simule l’univers des cartes Wankul : tu ouvres des boosters (ou des displays),
            tu récupères les cartes dans ta collection, et tu gagnes des crédits en fonction de la rareté.
            L’objectif est de reproduire un opening “propre” avec des animations et une progression claire.
          </p>

          <div className="featureGrid">
            <div className="feature">
              <div className="feature__title">Tirage serveur</div>
              <div className="feature__text">Le RNG est 100% côté backend (anti-triche).</div>
            </div>
            <div className="feature">
              <div className="feature__title">Collection</div>
              <div className="feature__text">Toutes les cartes obtenues sont enregistrées en base.</div>
            </div>
            <div className="feature">
              <div className="feature__title">Booster / Display</div>
              <div className="feature__text">Booster gold, légendaire garantie en display, etc.</div>
            </div>
            <div className="feature">
              <div className="feature__title">Stats</div>
              <div className="feature__text">Comparaison des probabilités théoriques vs résultats réels.</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION : WANKIL + CARTES */}
      <section className="section section--alt">
        <div className="container">
          <div className="twoCols">
            <div>
              <h2>Wankil Studio & l’univers Wankul</h2>
              <p className="muted">
                Wankil Studio est un duo de créateurs de contenu, notamment <strong>Laink</strong> et <strong>Terracid</strong>.
                Les cartes Wankul reprennent des références, des personnages, liés à leurs univers.
              </p>

              <div className="logoRow">
                <div className="logoCard">
                  <img src={wankilLogo} alt="Wankil Studio logo" />
                  <div className="logoCard__label">Wankil Studio</div>
                </div>
                <div className="logoCard">
                  <img src={wankulLogo} alt="Wankul logo" />
                  <div className="logoCard__label">Cartes Wankul</div>
                </div>
              </div>
            </div>

            <div className="avatars">
              <div className="avatarCard">
                <img src={lainkImg} alt="Laink (Wankil)" />
                <div className="avatarCard__name">Laink</div>
              </div>
              <div className="avatarCard">
                <img src={terracidImg} alt="Terracid (Wankil)" />
                <div className="avatarCard__name">Terracid</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer__inner">
          <div className="muted">
            Wankul WebApp — projet fan / portfolio.
          </div>
          <div className="muted">
            Backend NestJS • MySQL • RNG serveur • Front React + Vite
          </div>
        </div>
      </footer>
    </div>
  );
}
