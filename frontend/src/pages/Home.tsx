import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "../styles/Home.css";

import { useAuth } from "../auth/AuthContext";
import wankilLogo from "../assets/Wankil_Studio_Logo.png";
import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";
import lainkImg from "../assets/wankul_laink.png";
import terracidImg from "../assets/wankul_terra.png";
import { playActionDeniedSound, playSoundEffect, primeSound } from "../utils/sound";
import {
  getSeasonBoosterImage,
} from "../utils/seasonAssets";

const PILLARS = [
  {
    kicker: "Opening",
    title: "Des boosters qui ont une vraie valeur",
    text: "Chaque ouverture nourrit ta collection, tes doublons et ton economie. Ce n'est pas un simple reveal visuel.",
  },
  {
    kicker: "Collection",
    title: "Une progression lisible saison par saison",
    text: "Tu suis tes cartes possedees, les raretes et les trous de collection sans perdre la sensation TCG.",
  },
  {
    kicker: "Market",
    title: "Un marche communautaire au centre du jeu",
    text: "Les cartes, les prix et la liquidite passent par le market. Le dashboard et les pages cartes s'appuient dessus.",
  },
  {
    kicker: "Economie",
    title: "Une boucle de credits sous controle",
    text: "Charges gratuites, quick sell, plafonds et historique de prix gardent le systeme stable et evitablement exploitable.",
  },
];

const LOOP_STEPS = [
  {
    step: "01",
    title: "Ouvre",
    text: "Boosters et displays creent le premier frisson et injectent de la valeur dans ton compte.",
  },
  {
    step: "02",
    title: "Collectionne",
    text: "Tu conserves les nouvelles cartes, tu identifies les doublons et tu vises les saisons que tu veux finir.",
  },
  {
    step: "03",
    title: "Vends ou achete",
    text: "Le market te permet de transformer tes doublons, de chasser une carte cible et de suivre de vrais prix.",
  },
  {
    step: "04",
    title: "Optimise",
    text: "Le dashboard te montre ce que tu ouvres, ce que tu possedes et comment ton compte evolue dans le temps.",
  },
];

const SEASONS = [
  {
    number: 1,
    label: "Origins",
    note: "Le point de depart de la collection et des premiers hunts de raretes.",
  },
  {
    number: 2,
    label: "Campus",
    note: "Une saison plus legere en surface, mais ideale pour faire tourner le market.",
  },
  {
    number: 3,
    label: "Battle",
    note: "Une extension qui renforce le cote chase card et les openings memorables.",
  },
  {
    number: 4,
    label: "Stellar",
    note: "La couche la plus recente du format, avec une identite visuelle forte.",
  },
];

const HERO_STATS = [
  { value: "PWA", label: "Pensée pour mobile et installable comme une app" },
  { value: "Market", label: "Les prix et la valeur des cartes partent du marche" },
  { value: "4 saisons", label: "Une progression en extensions plutot qu'une simple liste de cartes" },
];

const SHOWCASE_FOOTER_POINTS = [
  {
    title: "Openings",
    text: "Des reveals rapides, lisibles et memorables.",
  },
  {
    title: "Collection",
    text: "Une progression claire sans perdre le plaisir du hunt.",
  },
  {
    title: "Market",
    text: "Des cartes qui gardent une vraie utilite apres l'ouverture.",
  },
];

type InstallChoiceOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallChoiceOutcome;
    platform: string;
  }>;
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installMessage, setInstallMessage] = useState(
    "Installe Wankul TCG pour le retrouver directement sur ton ecran d'accueil.",
  );

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");

    const syncInstallState = () => {
      const installed = isStandaloneMode();
      setIsInstalled(installed);

      if (installed) {
        setInstallPrompt(null);
        setInstallMessage("Wankul TCG est deja installee sur cet appareil.");
      }
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallMessage("L'installation est disponible en un appui sur mobile comme sur desktop.");
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      playSoundEffect("pwa.installed");
      setInstallMessage("Wankul TCG est installee. Tu peux maintenant l'ouvrir comme une vraie app.");
    };

    syncInstallState();

    displayModeQuery.addEventListener("change", syncInstallState);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      displayModeQuery.removeEventListener("change", syncInstallState);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstallClick() {
    void primeSound();

    if (isInstalled) {
      return;
    }

    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (outcome === "accepted") {
        setInstallMessage("Installation lancee. L'app sera accessible depuis ton ecran d'accueil.");
      } else {
        playActionDeniedSound();
        setInstallMessage("Tu peux relancer l'installation quand tu veux depuis ce bouton.");
      }

      return;
    }

    const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    if (isAppleMobile) {
      setInstallMessage("Sur iPhone ou iPad, ouvre Partager puis choisis Sur l'ecran d'accueil.");
      return;
    }

    setInstallMessage(
      "L'installation apparait seulement quand le navigateur la propose. Chrome ou Edge sont les plus fiables.",
    );
    playActionDeniedSound();
  }

  return (
    <div className="homeLanding">
      <div className="homeLanding__bg" />
      <div className="homeLanding__noise" />

      <header className="homeTopbar homeShell">
        <Link to="/" className="homeBrand" aria-label="Accueil Wankul TCG">
          <div className="homeBrand__logos">
            <img src={wankulLogo} alt="Wankul TCG" className="homeBrand__logo homeBrand__logo--main" />
            <img src={wankilLogo} alt="Wankil Studio" className="homeBrand__logo homeBrand__logo--studio" />
          </div>
          <div className="homeBrand__text">
            <span className="homeBrand__eyebrow">Fan-made collector app</span>
            <strong>Wankul TCG</strong>
          </div>
        </Link>

        <div className="homeTopbar__actions">
          {!isAuthenticated ? (
            <>
              <Link className="homeButton homeButton--ghost" to="/login">
                Connexion
              </Link>
              <Link className="homeButton homeButton--primary" to="/register">
                Creer un compte
              </Link>
            </>
          ) : (
            <>
              <Link className="homeButton homeButton--ghost" to="/booster">
                Ouvrir
              </Link>
              <Link className="homeButton homeButton--primary" to="/dashboard">
                Dashboard
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="homeMain">
        <section className="homeHero homeShell">
          <div className="homeHero__copy">
            <div className="homeHero__kickers">
              <span className="homeChip">Collection</span>
              <span className="homeChip">Economy</span>
              <span className="homeChip">Market</span>
              <span className="homeChip homeChip--soft">Wankil universe</span>
            </div>

            <h1 className="homeHero__title">
              Le Wankul TCG pense comme une <span>experience de collection vivante</span>, faite pour donner envie de revenir.
            </h1>

            <p className="homeHero__text">
              Ouvre des boosters, fais grossir ta collection, exploite le market et pilote ton compte via un vrai dashboard.
              Le coeur du projet, c'est la boucle opening - collection - economie - marche.
            </p>

            <div className="homeHero__actions">
              {!isAuthenticated ? (
                <>
                  <Link className="homeButton homeButton--primary homeButton--large" to="/register">
                    Entrer dans la collection
                  </Link>
                  <Link className="homeButton homeButton--ghost homeButton--large" to="/login">
                    J'ai deja un compte
                  </Link>
                </>
              ) : (
                <>
                  <Link className="homeButton homeButton--primary homeButton--large" to="/dashboard">
                    Aller au dashboard
                  </Link>
                  <Link className="homeButton homeButton--ghost homeButton--large" to="/booster">
                    Lancer un opening
                  </Link>
                </>
              )}
            </div>

            <div className="homeHero__install">
              <button
                type="button"
                className="homeButton homeButton--ghost homeButton--install"
                onClick={handleInstallClick}
                disabled={isInstalled}
              >
                {isInstalled ? "Web app installee" : "Telecharger la web app"}
              </button>
              <p className="homeHero__installNote">{installMessage}</p>
            </div>

            <div className="homeHero__stats">
              {HERO_STATS.map((stat) => (
                <article key={stat.value} className="homeStatCard">
                  <div className="homeStatCard__value">{stat.value}</div>
                  <div className="homeStatCard__label">{stat.label}</div>
                </article>
              ))}
            </div>
          </div>

          <div className="homeHero__visual">
            <div className="homeShowcase">
              <div className="homeShowcase__top">
                <div>
                  <div className="homeShowcase__eyebrow">Public landing</div>
                  <div className="homeShowcase__title">Opening + dashboard + market</div>
                </div>
                <div className="homeShowcase__pill">PWA ready</div>
              </div>

              <div className="homeShowcase__scene">
                <div className="homeShowcase__halo" />
                <div className="homeShowcase__fan" aria-hidden="true">
                  <img
                    className="homeShowcase__booster homeShowcase__booster--one"
                    src={getSeasonBoosterImage(1)}
                    alt="Booster Origins"
                  />
                  <img
                    className="homeShowcase__booster homeShowcase__booster--two"
                    src={getSeasonBoosterImage(2)}
                    alt="Booster Campus"
                  />
                  <img
                    className="homeShowcase__booster homeShowcase__booster--three"
                    src={getSeasonBoosterImage(3)}
                    alt="Booster Battle"
                  />
                  <img
                    className="homeShowcase__booster homeShowcase__booster--four"
                    src={getSeasonBoosterImage(4)}
                    alt="Booster Stellar"
                  />
                </div>
              </div>

              <div className="homeShowcase__insights">
                <div className="homeFloatingCard">
                  <span>Market</span>
                  <strong>Prix reels, historique, lots et quick sell toujours a portee de main</strong>
                </div>

                <div className="homeFloatingCard">
                  <span>Dashboard</span>
                  <strong>Stats perso, progression par saison et lecture immediate de ton compte</strong>
                </div>
              </div>

              <div className="homeCreatorStrip">
                <div className="homeCreatorCard">
                  <img src={lainkImg} alt="Laink" />
                  <div>
                    <strong>Laink</strong>
                    <span>Il fait de belle photo de galaxie</span>
                  </div>
                </div>

                <div className="homeCreatorCard">
                  <img src={terracidImg} alt="Terracid" />
                  <div>
                    <strong>Terracid</strong>
                    <span>Il a payé 8 balles aau 118 218 pourr gagner un faux million</span>
                  </div>
                </div>
              </div>

              <div className="homeShowcase__footer">
                <div className="homeShowcase__footerTitle">Ce qui fait rester</div>
                <div className="homeShowcase__footerGrid">
                  {SHOWCASE_FOOTER_POINTS.map((point) => (
                    <div key={point.title} className="homeShowcase__footerItem">
                      <strong>{point.title}</strong>
                      <span>{point.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="homeSection homeShell">
          <div className="homeSection__head">
            <span className="homeSection__kicker">Le projet</span>
            <h2>Une app de collection orientee economie, avec le market comme source de verite.</h2>
            <p>
              L'objectif n'est pas de reproduire le gameplay papier, mais de capter le plaisir d'ouvrir, posseder, traquer
              et echanger de la valeur autour des cartes.
            </p>
          </div>

          <div className="homePillarGrid">
            {PILLARS.map((pillar, index) => (
              <article key={pillar.title} className={`homePillarCard homePillarCard--${index + 1}`}>
                <div className="homePillarCard__kicker">{pillar.kicker}</div>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="homeSection homeShell">
          <div className="homeEconomyGrid">
            <article className="homeEconomyCard homeEconomyCard--main">
              <div className="homeSection__kicker">Le coeur du systeme</div>
              <h2>Le market pilote la valeur, le quick sell reste en dessous, et le dashboard explique tout.</h2>
              <p>
                Les cartes tirent leur prix du marche, l'economie est cadre par des garde-fous, et tes pages details
                te montrent comment une carte evolue dans le temps. L'ouverture n'est donc jamais deconnectee du reste.
              </p>

              <div className="homeMarketBands">
                <div className="homeMarketBands__row">
                  <span>Prix dynamique</span>
                  <b>Rareté + possession + historique</b>
                </div>
                <div className="homeMarketBands__row">
                  <span>Quick sell</span>
                  <b>Toujours sous le marche</b>
                </div>
                <div className="homeMarketBands__row">
                  <span>Protection</span>
                  <b>Min, max, variation journaliere</b>
                </div>
              </div>
            </article>

            <article className="homeEconomyCard">
              <div className="homeMiniMetric">
                <span>Opening rewards</span>
                <strong>Nouvelle carte mieux valorisee que le doublon</strong>
              </div>
              <p>
                Les ouvertures servent la collection sans exploser l'economie. Les doublons nourrissent les credits, les
                nouvelles cartes poussent la retention.
              </p>
              <div className="homeEconomyList">
                <div className="homeEconomyList__item">
                  <b>Nouvelle carte</b>
                  <span>Elle doit donner le sentiment d'avoir vraiment avance dans ta collection.</span>
                </div>
                <div className="homeEconomyList__item">
                  <b>Doublon</b>
                  <span>Il garde une utilite immediate en credits au lieu de devenir une mauvaise surprise.</span>
                </div>
                <div className="homeEconomyList__item">
                  <b>Jackpot</b>
                  <span>Les gros moments restent possibles, sans casser la boucle globale du compte.</span>
                </div>
              </div>
            </article>

            <article className="homeEconomyCard">
              <div className="homeMiniMetric">
                <span>Card details</span>
                <strong>Un prix lisible sur mobile</strong>
              </div>
              <p>
                L'historique des prix aide a comprendre ce que vaut une carte avant de la garder, la vendre ou la chasser
                sur le market.
              </p>
              <div className="homeEconomyList">
                <div className="homeEconomyList__item">
                  <b>Courbe claire</b>
                  <span>Tu vois vite si la carte est stable, en hausse ou en train de retomber.</span>
                </div>
                <div className="homeEconomyList__item">
                  <b>Lecture rapide</b>
                  <span>Le min, le max et la derniere valeur donnent un contexte utile sans noyer l'utilisateur.</span>
                </div>
                <div className="homeEconomyList__item">
                  <b>Decision</b>
                  <span>Garder, vendre ou acheter devient un vrai choix, pas juste une intuition.</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="homeSection homeShell">
          <div className="homeSection__head homeSection__head--tight">
            <span className="homeSection__kicker">Boucle de jeu</span>
            <h2>Le flow principal est simple a lire, mais suffisamment riche pour donner envie d'y revenir.</h2>
          </div>

          <div className="homeLoopGrid">
            {LOOP_STEPS.map((step) => (
              <article key={step.step} className="homeLoopCard">
                <div className="homeLoopCard__step">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="homeSection homeShell">
          <div className="homeSection__head homeSection__head--tight">
            <span className="homeSection__kicker">Saisons</span>
            <h2>Chaque extension reste identifiable, utile a collectionner et exploitable dans l'economie du compte.</h2>
          </div>

          <div className="homeSeasonGrid">
            {SEASONS.map((season) => (
              <article key={season.number} className="homeSeasonCard">
                <div className="homeSeasonCard__media">
                  <img
                    src={getSeasonBoosterImage(season.number)}
                    alt={`Booster ${season.label}`}
                  />
                </div>
                <div className="homeSeasonCard__body">
                  <div className="homeSeasonCard__eyebrow">Saison {season.number}</div>
                  <h3>{season.label}</h3>
                  <p>{season.note}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="homeSection homeShell">
          <div className="homeClosing">
            <div className="homeClosing__copy">
              <span className="homeSection__kicker">Projet fan</span>
              <h2>Une home publique pour entrer dans l'univers, un dashboard prive pour jouer vraiment.</h2>
              <p>
                Le projet est non officiel et pense comme une vitrine jouable : l'accueil montre la promesse, le dashboard
                sert la progression du joueur, et tout le reste alimente cette boucle.
              </p>
            </div>

            <div className="homeClosing__actions">
              {!isAuthenticated ? (
                <>
                  <Link className="homeButton homeButton--primary homeButton--large" to="/register">
                    Commencer maintenant
                  </Link>
                  <Link className="homeButton homeButton--ghost homeButton--large" to="/login">
                    Me connecter
                  </Link>
                </>
              ) : (
                <>
                  <Link className="homeButton homeButton--primary homeButton--large" to="/dashboard">
                    Retour au dashboard
                  </Link>
                  <Link className="homeButton homeButton--ghost homeButton--large" to="/market">
                    Aller au market
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="homeFooter homeShell">
        <span>Wankul TCG - fan project / portfolio</span>
        <span>React + Vite, NestJS, MySQL, mobile-first PWA</span>
      </footer>
    </div>
  );
}
