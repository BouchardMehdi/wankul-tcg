import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import {
  completeOnboarding,
  ensureOnboardingState,
  readOnboardingState,
  setOnboardingStep,
  skipOnboarding,
  subscribeOnboarding,
  type OnboardingState,
  type OnboardingStepId,
} from "../utils/onboarding";

import "../styles/OnboardingTour.css";

type TourStep = {
  id: OnboardingStepId;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  sections?: Array<{ label: string; text: string }>;
  demo?: "swipe";
  route?: string;
  target?: string;
  primaryLabel: string;
  helper?: string;
  locked?: boolean;
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    eyebrow: "Bienvenue dans le classeur",
    title: "On te montre juste les bases.",
    body: "Ce mini tuto se lance seulement à la première connexion. Il va te guider vers ton premier booster, puis te montrer la collection et le market.",
    bullets: [
      "Tu peux passer le tuto quand tu veux.",
      "Seule action demandée : ouvrir ton premier booster.",
      "Le reste sert juste à te montrer ce qui est possible.",
    ],
    route: "/dashboard",
    target: '[data-onboarding="dashboard-welcome"]',
    primaryLabel: "Commencer",
  },
  {
    id: "booster",
    eyebrow: "Étape 1",
    title: "Ouvre ton premier booster.",
    body: "Choisis le bouton encadré pour lancer ta première ouverture. Les displays et l'historique existent aussi, mais on reste simple pour démarrer.",
    bullets: [
      "Un booster ajoute les cartes à ta collection.",
      "Les doublons rapportent des WunkulCoins.",
      "Les gros hits sont mis en avant pendant l'ouverture.",
    ],
    route: "/booster",
    target: '[data-onboarding="booster-open"]',
    primaryLabel: "En attente du booster",
    helper: "Clique sur le bouton de booster encadré pour continuer.",
    locked: true,
  },
  {
    id: "opening",
    eyebrow: "Etape 2",
    title: "Découvre l'ouverture.",
    body: "Ici tu fais defiler les cartes, tu vois les nouvelles cartes marquees NEW, la valeur gagnee et les gros hits du booster.",
    bullets: [
      "Sur mobile, garde le doigt sur la carte puis glisse vers la gauche ou la droite.",
      "Sur desktop, tu peux aussi cliquer-glisser la carte ou utiliser Suivant.",
      "Le résumé affiche les gains, les nouvelles cartes et les hits.",
      "Quand tu es prêt, on passe à la collection.",
    ],
    demo: "swipe",
    target: '[data-onboarding="opening-stage"]',
    primaryLabel: "Voir ma collection",
  },
  {
    id: "collection",
    eyebrow: "Etape 3",
    title: "Ta collection devient ton objectif.",
    body: "La collection te permet de voir ce que tu possèdes, ce qu'il te manque, tes doublons utiles, tes favoris et tes objectifs perso.",
    bullets: [
      "Filtre par saison, rareté, type, artiste ou tag perso.",
      "Ajoute des favoris et des objectifs de collection.",
      "Depuis une carte vendable, tu peux partir vers la vente ou la vente rapide.",
    ],
    sections: [
      { label: "Collection", text: "Toutes tes cartes, les quantites, favoris, tags et actions de vente." },
      { label: "Stats & objectifs", text: "Progression par saison/rareté, cartes manquantes, doublons utiles et objectifs." },
      { label: "Vues rapides", text: "Tout, Objectifs, Manquantes, Doublons utiles et Favoris." },
    ],
    route: "/collection",
    target: '[data-onboarding="collection-panels"]',
    primaryLabel: "Voir le market",
  },
  {
    id: "market",
    eyebrow: "Etape 4",
    title: "Le market fait vivre l'économie.",
    body: "Le market sert à acheter, vendre, suivre des cartes en watchlist, surveiller les bonnes affaires et récupérer les récompenses de tes ventes.",
    bullets: [
      "Mes ventes suit tes annonces et recompenses.",
      "Recherche et suggestions aident à trouver les bons deals.",
      "Watchlist envoie des alertes quand une carte matche tes criteres.",
    ],
    sections: [
      { label: "Mes ventes", text: "Tes annonces actives, vendues, annulées et les récompenses à récupérer." },
      { label: "Suggestions", text: "Les bonnes affaires détectées par rapport au prix du marché." },
      { label: "Watchlist", text: "Les cartes que tu recherches avec alertes de prix et disponibilité." },
      { label: "Recherche", text: "Tous les filtres pour acheter une carte ou comparer les offres." },
      { label: "Historique", text: "Les ventes récentes pour lire la tendance d'une carte." },
    ],
    route: "/market",
    target: '[data-onboarding="market-tabs"]',
    primaryLabel: "Terminer le tuto",
  },
];

const STEP_INDEX = new Map(STEPS.map((step, index) => [step.id, index]));

function clampStep(step?: OnboardingStepId | null) {
  return STEPS.find((item) => item.id === step) ?? STEPS[0];
}

function getTargetRect(selector?: string): SpotlightRect | null {
  if (!selector || typeof document === "undefined") return null;
  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const padding = 10;
  return {
    top: Math.max(10, rect.top - padding),
    left: Math.max(10, rect.left - padding),
    width: Math.min(window.innerWidth - 20, rect.width + padding * 2),
    height: Math.min(window.innerHeight - 20, rect.height + padding * 2),
  };
}

function BlurPatches({ spotlight }: { spotlight: SpotlightRect | null }) {
  if (!spotlight) return <div className="onboardingTour__blurPatch onboardingTour__blurPatch--full" />;

  const bottomHeight = Math.max(0, window.innerHeight - spotlight.top - spotlight.height);
  const rightWidth = Math.max(0, window.innerWidth - spotlight.left - spotlight.width);

  return (
    <>
      <div
        className="onboardingTour__blurPatch"
        style={{ top: 0, left: 0, right: 0, height: spotlight.top }}
      />
      <div
        className="onboardingTour__blurPatch"
        style={{ left: 0, right: 0, bottom: 0, height: bottomHeight }}
      />
      <div
        className="onboardingTour__blurPatch"
        style={{ top: spotlight.top, left: 0, width: spotlight.left, height: spotlight.height }}
      />
      <div
        className="onboardingTour__blurPatch"
        style={{ top: spotlight.top, right: 0, width: rightWidth, height: spotlight.height }}
      />
    </>
  );
}

function SwipeDemo() {
  return (
    <div className="onboardingTour__swipeDemo" aria-hidden="true">
      <div className="onboardingTour__swipeStack">
        <span />
        <span />
        <strong />
      </div>
      <div className="onboardingTour__swipeHand" />
      <div className="onboardingTour__swipeText">Swipe</div>
    </div>
  );
}

export default function OnboardingTour() {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id ?? null;

  const [tour, setTour] = useState<OnboardingState | null>(null);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  const step = useMemo(() => clampStep(tour?.step), [tour?.step]);
  const stepIndex = STEP_INDEX.get(step.id) ?? 0;
  const isVisible =
    isAuthenticated &&
    !isLoading &&
    role !== "admin" &&
    Boolean(userId) &&
    tour?.status === "pending";

  useEffect(() => {
    if (!isAuthenticated || isLoading || role === "admin" || !userId) {
      setTour(null);
      return;
    }

    setTour(ensureOnboardingState(userId));
    return subscribeOnboarding(() => {
      setTour(readOnboardingState(userId));
    });
  }, [isAuthenticated, isLoading, role, userId]);

  useEffect(() => {
    if (!isVisible || !userId) return;
    if (!step.route) return;
    if (location.pathname === step.route) return;

    navigate(step.route);
  }, [isVisible, userId, step.route, location.pathname, navigate]);

  useEffect(() => {
    if (!isVisible) return;
    if (!step.target) {
      setSpotlight(null);
      return;
    }

    let frame = 0;

    const update = () => {
      setSpotlight(getTargetRect(step.target));
    };

    const scrollTargetIntoView = () => {
      const element = document.querySelector(step.target ?? "");
      element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    };

    frame = window.requestAnimationFrame(() => {
      scrollTargetIntoView();
      update();
    });

    const interval = window.setInterval(update, 300);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isVisible, step.target, location.pathname]);

  if (!isVisible || !userId) return null;

  const panelPlacement =
    spotlight && spotlight.top + spotlight.height / 2 > window.innerHeight / 2
      ? "onboardingTour__panel--top"
      : "onboardingTour__panel--bottom";

  function goNext() {
    if (!userId || step.locked) return;

    if (step.id === "welcome") {
      setOnboardingStep(userId, "booster");
      navigate("/booster");
      return;
    }

    if (step.id === "opening") {
      setOnboardingStep(userId, "collection");
      navigate("/collection");
      return;
    }

    if (step.id === "collection") {
      setOnboardingStep(userId, "market");
      navigate("/market");
      return;
    }

    if (step.id === "market") {
      completeOnboarding(userId);
    }
  }

  function skip() {
    if (!userId) return;
    skipOnboarding(userId);
  }

  return (
    <div className="onboardingTour" aria-live="polite">
      <div className="onboardingTour__veil" />
      <BlurPatches spotlight={spotlight} />

      {spotlight ? (
        <div
          className="onboardingTour__spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      ) : null}

      <section className={`onboardingTour__panel ${panelPlacement}`} role="dialog" aria-modal="false">
        <div className="onboardingTour__top">
          <span>{step.eyebrow}</span>
          <button type="button" onClick={skip}>
            Passer tuto
          </button>
        </div>

        <h2>{step.title}</h2>
        <p>{step.body}</p>

        <ul>
          {step.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        {step.demo === "swipe" ? <SwipeDemo /> : null}

        {step.sections?.length ? (
          <div className="onboardingTour__sections">
            {step.sections.map((section) => (
              <div className="onboardingTour__section" key={section.label}>
                <strong>{section.label}</strong>
                <span>{section.text}</span>
              </div>
            ))}
          </div>
        ) : null}

        {step.helper ? <div className="onboardingTour__helper">{step.helper}</div> : null}

        <div className="onboardingTour__footer">
          <div className="onboardingTour__progress" aria-label={`Etape ${stepIndex + 1} sur ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <span
                key={item.id}
                className={index === stepIndex ? "is-active" : index < stepIndex ? "is-done" : ""}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn btn--primary onboardingTour__primary"
            onClick={goNext}
            disabled={step.locked}
          >
            {step.primaryLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
