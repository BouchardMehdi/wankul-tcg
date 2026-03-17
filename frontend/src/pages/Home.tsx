import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/Home.css";

import wankilLogo from "../assets/Wankil_Studio_Logo.png";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import lainkImg from "../assets/wankul_laink.png";
import terracidImg from "../assets/wankul_terra.png";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      <div className="landing__bg" />

      <section className="hero">
        <div className="hero__inner">
          <div className="hero__left">
            <div className="hero__eyebrow">
              <span className="badge">Projet fan • WebApp</span>
              <span className="hero__status">Opening • Collection • Stats</span>
            </div>

            <h1 className="hero__title">
              Ouvre, collectionne et suis ta progression sur les cartes <span>Wankul</span>
            </h1>

            <p className="hero__subtitle">
              Une webapp créée par un fan pour retrouver le plaisir des openings Wankul avec
              boosters, displays, collection, économie en crédits et statistiques de drop.
              Le tirage est géré côté serveur pour garder une ouverture propre et cohérente.
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
                  <Link className="btn secondary btn-lg" to="/menu">
                    Aller au dashboard
                  </Link>
                </>
              )}
            </div>

            <div className="hero__meta">
              <div className="heroStat">
                <div className="heroStat__value">4</div>
                <div className="heroStat__label">Saisons principales</div>
              </div>
              <div className="heroStat">
                <div className="heroStat__value">Booster + Display</div>
                <div className="heroStat__label">Deux formats d’ouverture</div>
              </div>
              <div className="heroStat">
                <div className="heroStat__value">100%</div>
                <div className="heroStat__label">Tirage côté serveur</div>
              </div>
            </div>

            <div className="disclaimer">
              Projet non officiel, réalisé pour le fun et le portfolio, sans affiliation avec Wankil Studio.
            </div>
          </div>

          <div className="hero__right">
            <div className="showcaseCard">
              <div className="showcaseCard__top">
                <img className="showcaseCard__logo" src={wankulLogo} alt="Wankul logo" />
                <div className="showcaseCard__tag">TCG fan experience</div>
              </div>

              <div className="showcaseCard__grid">
                <div className="showcaseMini">
                  <div className="showcaseMini__title">Boosters</div>
                  <div className="showcaseMini__text">
                    Ouvertures rapides ou animées, cartes rares, holo et résumés.
                  </div>
                </div>

                <div className="showcaseMini">
                  <div className="showcaseMini__title">Displays</div>
                  <div className="showcaseMini__text">
                    Sessions multi-boosters avec gestion correcte des nouvelles cartes.
                  </div>
                </div>

                <div className="showcaseMini">
                  <div className="showcaseMini__title">Collection</div>
                  <div className="showcaseMini__text">
                    Filtres, progression, effets visuels et suivi des doublons.
                  </div>
                </div>

                <div className="showcaseMini">
                  <div className="showcaseMini__title">Statistiques</div>
                  <div className="showcaseMini__text">
                    Répartition du butin, progression par saison et comparaison visuelle.
                  </div>
                </div>
              </div>

              <div className="showcaseCard__footer">
                <span className="showcasePill">React + Vite</span>
                <span className="showcasePill">NestJS</span>
                <span className="showcasePill">MySQL</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero__glow" />
      </section>

      <section className="section">
        <div className="container">
          <div className="sectionHead">
            <span className="sectionHead__kicker">LE CONCEPT</span>
            <h2>Une vraie sensation d’opening, pensée comme une mini expérience TCG</h2>
            <p className="muted">
              Le but de la webapp est de recréer l’ouverture de cartes avec une interface agréable,
              une progression claire et une logique backend propre pour la gestion des récompenses.
            </p>
          </div>

          <div className="featureGrid">
            <div className="feature feature--cyan">
              <div className="feature__title">Tirage sécurisé</div>
              <div className="feature__text">
                Les ouvertures sont générées côté serveur, ce qui évite la triche et garde une logique fiable.
              </div>
            </div>

            <div className="feature feature--green">
              <div className="feature__title">Collection persistante</div>
              <div className="feature__text">
                Toutes les cartes obtenues sont enregistrées et réutilisées pour la progression et les doublons.
              </div>
            </div>

            <div className="feature feature--pink">
              <div className="feature__title">Économie intégrée</div>
              <div className="feature__text">
                Les crédits, charges gratuites et coûts d’ouverture donnent une vraie boucle de jeu.
              </div>
            </div>

            <div className="feature feature--gold">
              <div className="feature__title">Dashboard visuel</div>
              <div className="feature__text">
                Progression par saison, distribution du butin et suivi global de ton compte.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="infoGrid">
            <div className="infoPanel">
              <div className="sectionHead sectionHead--tight">
                <span className="sectionHead__kicker">UNIVERS</span>
                <h2>Wankil Studio & les cartes Wankul</h2>
              </div>

              <p className="muted">
                L’univers Wankul reprend l’imaginaire et les références liées à Wankil Studio,
                notamment autour de <strong>Laink</strong> et <strong>Terracid</strong>. Cette webapp
                cherche à retranscrire ce plaisir de collection dans un format interactif.
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

            <div className="creatorsPanel">
              <div className="avatars">
                <div className="avatarCard">
                  <div className="avatarCard__media">
                    <img src={lainkImg} alt="Laink" />
                  </div>
                  <div className="avatarCard__body">
                    <div className="avatarCard__name">Laink</div>
                    <div className="avatarCard__text">Références, personnages, humour et moments cultes.</div>
                  </div>
                </div>

                <div className="avatarCard">
                  <div className="avatarCard__media">
                    <img src={terracidImg} alt="Terracid" />
                  </div>
                  <div className="avatarCard__body">
                    <div className="avatarCard__name">Terracid</div>
                    <div className="avatarCard__text">L’autre moitié du duo, au cœur de l’identité Wankul.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="roadmap">
            <div className="roadmap__item">
              <div className="roadmap__step">01</div>
              <div>
                <div className="roadmap__title">Créer un compte</div>
                <div className="roadmap__text">Accède à ton espace personnel et à ta progression.</div>
              </div>
            </div>

            <div className="roadmap__item">
              <div className="roadmap__step">02</div>
              <div>
                <div className="roadmap__title">Ouvrir boosters et displays</div>
                <div className="roadmap__text">Récupère des cartes, des rares et des doublons convertis en crédits.</div>
              </div>
            </div>

            <div className="roadmap__item">
              <div className="roadmap__step">03</div>
              <div>
                <div className="roadmap__title">Compléter la collection</div>
                <div className="roadmap__text">Suis les saisons, les cartes uniques et les performances d’ouverture.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="muted">Wankul WebApp — projet fan / portfolio.</div>
          <div className="muted">Backend NestJS • MySQL • RNG serveur • Front React + Vite</div>
        </div>
      </footer>
    </div>
  );
}