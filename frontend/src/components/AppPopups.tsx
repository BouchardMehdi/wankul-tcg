import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import "../styles/AppPopups.css";
import {
  WELCOME_BONUS_CREDITS,
  dismissPwaInstallPopup,
  hasSeenWelcomeBonusPopup,
  isStandalonePwaMode,
  markPwaInstallPopupAccepted,
  markWelcomeBonusPopupSeen,
  shouldShowPwaInstallPopup,
  subscribeAppPopups,
} from "../utils/appPopups";
import {
  ensureOnboardingState,
  readOnboardingState,
  setOnboardingStep,
  skipOnboarding,
  subscribeOnboarding,
  type OnboardingState,
} from "../utils/onboarding";
import { playActionDeniedSound, playSoundEffect, primeSound } from "../utils/sound";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isAppleMobile() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function AppPopups() {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const userId = user?.id ?? null;

  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [installVisible, setInstallVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalonePwaMode());
  const [installMessage, setInstallMessage] = useState(
    "Ajoute Wankul TCG a ton ecran d'accueil pour ouvrir tes boosters plus vite.",
  );
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    return subscribeAppPopups(() => {
      if (shouldShowPwaInstallPopup()) {
        setInstallVisible(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLoading || role === "admin" || !userId) {
      setWelcomeVisible(false);
      return;
    }

    const syncWelcome = () => {
      const seen = hasSeenWelcomeBonusPopup(userId);
      const currentOnboarding = readOnboardingState(userId);
      const shouldShowWelcome =
        !seen && (!currentOnboarding || currentOnboarding.status === "pending");

      if (!seen && currentOnboarding && currentOnboarding.status !== "pending") {
        markWelcomeBonusPopupSeen(userId);
      }

      setWelcomeVisible(shouldShowWelcome);
    };

    syncWelcome();
    return subscribeAppPopups(syncWelcome);
  }, [isAuthenticated, isLoading, role, userId]);

  useEffect(() => {
    if (!userId) {
      setOnboardingState(null);
      return;
    }

    const syncOnboarding = () => setOnboardingState(readOnboardingState(userId));

    syncOnboarding();
    return subscribeOnboarding(syncOnboarding);
  }, [userId]);

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");

    const syncInstallState = () => {
      const nextInstalled = isStandalonePwaMode();
      setInstalled(nextInstalled);

      if (nextInstalled) {
        setInstallVisible(false);
        setInstallPrompt(null);
        markPwaInstallPopupAccepted();
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallMessage("Installation disponible en un appui, sur mobile comme sur desktop.");
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallVisible(false);
      setInstallPrompt(null);
      markPwaInstallPopupAccepted();
      playSoundEffect("pwa.installed");
    };

    const timer = window.setTimeout(() => {
      if (shouldShowPwaInstallPopup()) {
        setInstallVisible(true);
      }
    }, 1400);

    syncInstallState();
    displayModeQuery.addEventListener("change", syncInstallState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(timer);
      displayModeQuery.removeEventListener("change", syncInstallState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const onboardingBlocksInstall = Boolean(
    userId &&
      (onboardingState?.status === "pending" ||
        (!onboardingState && !hasSeenWelcomeBonusPopup(userId))),
  );
  const canShowInstallPopup =
    installVisible && !installed && !welcomeVisible && !onboardingBlocksInstall;
  const welcomeName = user?.username || "collectionneur";

  function startTutorial() {
    if (!userId) return;
    void primeSound();
    markWelcomeBonusPopupSeen(userId);
    ensureOnboardingState(userId);
    setOnboardingStep(userId, "welcome");
    setWelcomeVisible(false);
  }

  function skipTutorialFromWelcome() {
    if (!userId) return;
    void primeSound();
    markWelcomeBonusPopupSeen(userId);
    skipOnboarding(userId);
    setWelcomeVisible(false);
  }

  async function installApp() {
    void primeSound();

    if (installed) {
      markPwaInstallPopupAccepted();
      setInstallVisible(false);
      return;
    }

    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        setInstallPrompt(null);

        if (outcome === "accepted") {
          markPwaInstallPopupAccepted();
          setInstallVisible(false);
          setInstallMessage("Installation lancee. Wankul TCG arrive dans tes apps.");
        } else {
          playActionDeniedSound();
          setInstallMessage("Pas de souci, tu peux relancer l'installation plus tard depuis Home.");
        }
      } catch {
        setInstallPrompt(null);
        setInstallMessage("L'installation n'est plus disponible ici. Reviens sur Home pour reessayer.");
        playActionDeniedSound();
      }

      return;
    }

    if (isAppleMobile()) {
      setInstallMessage("Sur iPhone ou iPad: Partager, puis Ajouter a l'ecran d'accueil.");
      return;
    }

    playActionDeniedSound();
    setInstallMessage("Si le bouton n'apparait pas, essaie Chrome ou Edge apres quelques secondes.");
  }

  function closeInstallPopup() {
    dismissPwaInstallPopup(7);
    setInstallVisible(false);
  }

  return (
    <>
      {welcomeVisible ? (
        <div className="appPopupLayer" role="dialog" aria-modal="true" aria-labelledby="welcome-popup-title">
          <div className="appPopupLayer__backdrop" />

          <section className="appPopupCard appPopupCard--welcome">
            <div className="appPopupCard__shine" />
            <div className="appPopupCard__pack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <p className="appPopupCard__eyebrow">Bienvenue dans le Wankul TCG</p>
            <h2 id="welcome-popup-title">Content de te voir, {welcomeName}.</h2>
            <p className="appPopupCard__text">
              Pour te remercier de nous avoir rejoint, on t'a offert ton bonus de
              bienvenue.
            </p>

            <div className="appPopupReward">
              <span>Bonus offert</span>
              <strong>{WELCOME_BONUS_CREDITS.toLocaleString("fr-FR")} credits</strong>
            </div>

            <div className="appPopupSteps" aria-label="Ce que le tuto va montrer">
              <span>Booster</span>
              <span>Collection</span>
              <span>Market</span>
            </div>

            <div className="appPopupCard__actions">
              <button type="button" className="btn btn--primary" onClick={startTutorial}>
                Commencer le tuto
              </button>
              <button type="button" className="btn btn--ghost" onClick={skipTutorialFromWelcome}>
                Passer pour l'instant
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {canShowInstallPopup ? (
        <div className="appPopupLayer" role="dialog" aria-modal="true" aria-labelledby="install-popup-title">
          <button
            type="button"
            className="appPopupLayer__backdrop appPopupLayer__backdrop--clickable"
            aria-label="Fermer la proposition d'installation"
            onClick={closeInstallPopup}
          />

          <section className="appPopupCard appPopupCard--install">
            <div className="appPopupCard__shine" />
            <div className="appPopupInstallIcon" aria-hidden="true">
              <img src="/favicon.png" alt="" />
            </div>

            <p className="appPopupCard__eyebrow">App prete a installer</p>
            <h2 id="install-popup-title">Installe Wankul TCG sur ton appareil.</h2>
            <p className="appPopupCard__text">{installMessage}</p>

            <div className="appPopupPerks">
              <span>Acces rapide</span>
              <span>Mode installe</span>
              <span>Notifications</span>
            </div>

            <div className="appPopupCard__actions">
              <button type="button" className="btn btn--primary" onClick={installApp}>
                Installer l'app
              </button>
              <button type="button" className="btn btn--ghost" onClick={closeInstallPopup}>
                Plus tard
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
