import { useEffect, useMemo, useState } from "react";

import "../styles.css";
import "../styles/PwaPreferences.css";

import AppNavbar from "../components/AppNavbar";
import { useAuth } from "../auth/AuthContext";
import { fetchAllCards } from "../api/cards";
import { fetchOwnedCollection } from "../api/collection";
import {
  getPushPreferences,
  updatePushPreferences,
  type PushNotificationPreferences,
} from "../api/push";
import {
  readAppSettings,
  subscribeAppSettings,
  writeAppSettings,
  type AppSettings,
} from "../utils/appSettings";
import {
  clearCardImageCache,
  isPwaCacheSupported,
  requestPwaCacheStatus,
  subscribePwaCacheProgress,
  subscribePwaCacheStatus,
  warmCardImageCache,
  type PwaCacheProgress,
  type PwaCacheStatus,
} from "../utils/pwaCache";
import {
  getPwaNotificationPermission,
  isPwaNotificationSupported,
  requestPwaNotificationPermission,
  subscribeCurrentBrowserToPush,
} from "../utils/pwaNotifications";
import { playActionDeniedSound, playSettingToggleSound, primeSound } from "../utils/sound";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    downlink?: number;
    effectiveType?: string;
    saveData?: boolean;
  };
};

type BrowserStorageEstimate = {
  quota?: number;
  usage?: number;
};

const NOTIFICATION_ROWS: Array<{
  key: keyof PushNotificationPreferences;
  title: string;
  desc: string;
  kind: "toggle" | "number";
  min?: number;
  max?: number;
  suffix?: string;
}> = [
  {
    key: "saleRewardEnabled",
    title: "Vente terminée",
    desc: "Quand une récompense vendeur est disponible.",
    kind: "toggle",
  },
  {
    key: "freeOpeningsReadyEnabled",
    title: "Ouvertures gratuites prêtes",
    desc: "Quand un booster ou une display gratuite peut être récupérée.",
    kind: "toggle",
  },
  {
    key: "freeOpeningsSoonEnabled",
    title: "Recharge bientôt prête",
    desc: "Quand une charge gratuite arrive bientôt.",
    kind: "toggle",
  },
  {
    key: "freeOpeningsSoonMinutes",
    title: "Fenetre recharge",
    desc: "Nombre de minutes avant la recharge pour recevoir l'alerte.",
    kind: "number",
    min: 5,
    max: 180,
    suffix: "min",
  },
  {
    key: "watchlistPriceAlertEnabled",
    title: "Watchlist prix",
    desc: "Quand une carte suivie passe sous ton prix cible ou match une annonce.",
    kind: "toggle",
  },
  {
    key: "staleListingAlertEnabled",
    title: "Annonce invendue",
    desc: "Quand une annonce perso reste trop longtemps sans vente.",
    kind: "toggle",
  },
  {
    key: "staleListingHours",
    title: "Seuil annonce invendue",
    desc: "Délai avant le rappel sur une annonce active.",
    kind: "number",
    min: 6,
    max: 336,
    suffix: "h",
  },
  {
    key: "dailyMarketRecapEnabled",
    title: "Recap market quotidien",
    desc: "Un résumé léger du market si tu veux plus d'engagement.",
    kind: "toggle",
  },
];

function getApiOrigin() {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  return raw.replace(/\/api\/?$/, "");
}

function toAbsoluteAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${getApiOrigin()}${url}`;
}

function formatPermission(permission: NotificationPermission | "unsupported") {
  if (permission === "granted") return "Autorisee";
  if (permission === "denied") return "Bloquée";
  if (permission === "default") return "Pas encore demandée";
  return "Non supportée";
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function formatBytes(value?: number) {
  if (!value || Number.isNaN(value)) return "En attente";
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} Go`;
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} Mo`;
  return `${Math.round(value / 1024)} Ko`;
}

function formatStatusTime(timestamp?: number) {
  if (!timestamp) return "Jamais";

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export default function PwaPreferences() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());
  const [online, setOnline] = useState(() => navigator.onLine);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(
    () => Boolean(navigator.serviceWorker?.controller),
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installFeedback, setInstallFeedback] = useState("");
  const [cacheStatus, setCacheStatus] = useState<PwaCacheStatus | null>(null);
  const [cacheProgress, setCacheProgress] = useState<PwaCacheProgress | null>(null);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [cacheFeedback, setCacheFeedback] = useState("");
  const [lastStatusAt, setLastStatusAt] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<BrowserStorageEstimate | null>(null);
  const [pushPrefs, setPushPrefs] = useState<PushNotificationPreferences | null>(null);
  const [pushPrefsLoading, setPushPrefsLoading] = useState(true);
  const [pushPrefsSaving, setPushPrefsSaving] = useState(false);
  const [pushPrefsFeedback, setPushPrefsFeedback] = useState("");
  const [pushPrefsError, setPushPrefsError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState(
    () => getPwaNotificationPermission(),
  );

  const installed = isStandaloneDisplay();
  const cacheSupported = isPwaCacheSupported();
  const connection = (navigator as NavigatorWithConnection).connection;
  const connectionLabel = online
    ? connection?.effectiveType
      ? `En ligne - ${connection.effectiveType.toUpperCase()}`
      : "En ligne"
    : "Hors ligne";
  const serviceWorkerLabel = cacheSupported
    ? serviceWorkerReady
      ? "Actif"
      : "En activation"
    : "Non supporté";

  useEffect(
    () =>
      subscribeAppSettings(() => {
        setSettings(readAppSettings());
      }),
    [],
  );

  useEffect(() => {
    const onOnline = () => setOnline(navigator.onLine);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setInstallFeedback("Installation terminée. Wankul TCG est maintenant lançable comme une app.");
    };
    const onControllerChange = () => setServiceWorkerReady(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    const unsubStatus = subscribePwaCacheStatus((status) => {
      setCacheStatus(status);
      setCacheBusy(false);
      setLastStatusAt(Date.now());
    });
    const unsubProgress = subscribePwaCacheProgress((progress) => {
      setCacheProgress(progress);
    });

    if (cacheSupported) {
      requestPwaCacheStatus().catch(() => undefined);
    }

    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, [cacheSupported]);

  useEffect(() => {
    let cancelled = false;

    async function loadStorageEstimate() {
      if (!navigator.storage?.estimate) return;
      const estimate = await navigator.storage.estimate();
      if (!cancelled) setStorageEstimate(estimate);
    }

    loadStorageEstimate().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [cacheStatus]);

  useEffect(() => {
    let cancelled = false;

    async function loadPushPrefs() {
      setPushPrefsLoading(true);
      setPushPrefsError("");

      try {
        const prefs = await getPushPreferences();
        if (!cancelled) setPushPrefs(prefs);
      } catch (err: any) {
        if (!cancelled) {
          setPushPrefsError(err?.message || "Impossible de charger les préférences de notifications.");
        }
      } finally {
        if (!cancelled) setPushPrefsLoading(false);
      }
    }

    loadPushPrefs().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const cacheFillPercent = useMemo(() => {
    if (!cacheStatus?.cardImageLimit) return 0;
    return Math.min(
      100,
      Math.round((cacheStatus.cardImageEntries / cacheStatus.cardImageLimit) * 100),
    );
  }, [cacheStatus]);

  const storageFillPercent = useMemo(() => {
    if (!storageEstimate?.quota || !storageEstimate?.usage) return 0;
    return Math.min(100, Math.round((storageEstimate.usage / storageEstimate.quota) * 100));
  }, [storageEstimate]);

  function updateLocalSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    writeAppSettings({ [key]: value });
    playSettingToggleSound(Boolean(value));
  }

  async function handleInstall() {
    if (!installPrompt) {
      setInstallFeedback(
        installed
          ? "L'app est déjà installée sur cet appareil."
          : "Si le bouton n'apparaît pas, utilise le menu de ton navigateur puis 'Installer l'application'.",
      );
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallFeedback(
      choice.outcome === "accepted"
        ? "Installation lancee. Bienvenue dans la vraie app."
        : "Installation annulée, tu pourras retenter plus tard.",
    );
  }

  async function refreshPwaStatus() {
    setCacheFeedback("");
    setLastStatusAt(Date.now());

    if (cacheSupported) {
      await requestPwaCacheStatus().catch(() => {
        setCacheFeedback("Préparation hors ligne pas encore prête, réessaie dans quelques secondes.");
      });
    }

    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate().catch(() => null);
      if (estimate) setStorageEstimate(estimate);
    }
  }

  async function enableNotifications() {
    if (!isPwaNotificationSupported()) {
      playActionDeniedSound();
      setPushPrefsError("Les notifications ne sont pas supportees sur cet appareil.");
      return;
    }

    const permission = await requestPwaNotificationPermission();
    setNotificationPermission(permission);

    if (permission !== "granted") {
      playActionDeniedSound();
      return;
    }

    writeAppSettings({ pwaNotifications: true });
    setSettings(readAppSettings());
    await subscribeCurrentBrowserToPush(token).catch((err: any) => {
      setPushPrefsError(err?.message || "Impossible d'activer les notifications.");
    });
  }

  async function cacheUrls(urls: string[], successLabel: string) {
    if (!cacheSupported) {
      setCacheFeedback("Préparation hors ligne non disponible sur cet appareil.");
      return;
    }

    const usableUrls = Array.from(new Set(urls.filter(Boolean)));
    if (!usableUrls.length) {
      setCacheFeedback("Aucune image à préparer pour le moment.");
      return;
    }

    void primeSound();
    setCacheBusy(true);
    setCacheProgress({ cached: 0, failed: 0, total: usableUrls.length });
    setCacheFeedback("");

    try {
      await warmCardImageCache(usableUrls);
      setCacheFeedback(successLabel);
    } catch (err: any) {
      playActionDeniedSound();
      setCacheBusy(false);
      setCacheFeedback(err?.message || "Impossible de préparer les images.");
    }
  }

  async function cacheOwnedCards() {
    const ownedRows = await fetchOwnedCollection();
    const urls = ownedRows.map((row) => toAbsoluteAssetUrl(row.card.imageUrl));
    await cacheUrls(urls, "Images de ta collection préparées pour le hors ligne.");
  }

  async function cacheSmartCatalog() {
    const [ownedRows, cards] = await Promise.all([
      fetchOwnedCollection(),
      fetchAllCards(),
    ]);
    const ownedIds = new Set(ownedRows.map((row) => row.card.id));
    const prioritized = [
      ...cards.filter((card) => ownedIds.has(card.id)),
      ...cards.filter((card) => !ownedIds.has(card.id)),
    ];
    const limit = cacheStatus?.cardImageLimit ?? 260;
    const urls = prioritized.slice(0, limit).map((card) => toAbsoluteAssetUrl(card.imageUrl));
    await cacheUrls(urls, `Images utiles préparées pour ${Math.min(urls.length, limit)} cartes.`);
  }

  async function clearImages() {
    if (!cacheSupported) return;

    setCacheBusy(true);
    setCacheFeedback("");
    setCacheProgress(null);

    try {
      await clearCardImageCache();
      setCacheFeedback("Images hors ligne videes.");
    } catch (err: any) {
      playActionDeniedSound();
      setCacheBusy(false);
      setCacheFeedback(err?.message || "Impossible de vider les images préparées.");
    }
  }

  function updatePushPref<K extends keyof PushNotificationPreferences>(
    key: K,
    value: PushNotificationPreferences[K],
  ) {
    setPushPrefs((current) => (current ? { ...current, [key]: value } : current));
    setPushPrefsFeedback("");
  }

  async function savePushPrefs() {
    if (!pushPrefs) return;

    setPushPrefsSaving(true);
    setPushPrefsError("");
    setPushPrefsFeedback("");

    try {
      const saved = await updatePushPreferences(pushPrefs);
      setPushPrefs(saved);
      setPushPrefsFeedback("Preferences de notifications enregistrees.");
    } catch (err: any) {
      playActionDeniedSound();
      setPushPrefsError(err?.message || "Impossible d'enregistrer les préférences.");
    } finally {
      setPushPrefsSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <AppNavbar currentPage="settings" />

      <main className="pwaPreferencesPage container">
        <header className="pwaPreferencesHero">
          <div>
            <span>App installée</span>
            <h1>Préférences de l'app</h1>
            <p>
              Installe l'app, prépare les images de cartes, règle le hors ligne
              et choisis précisément les notifications qui méritent de vibrer.
            </p>
          </div>

          <button type="button" className="pwaPreferencesBtn" onClick={handleInstall}>
            {installed ? "App installée" : "Installer l'app"}
          </button>
        </header>

        {installFeedback ? <div className="pwaPreferencesNotice">{installFeedback}</div> : null}

        <section className="pwaPreferencesGrid">
          <article className="pwaPremiumCard">
            <span>État</span>
            <strong>{online ? "Connectée" : "Hors ligne"}</strong>
            <em>{installed ? "Mode installé actif" : "Installation disponible selon ton appareil"}</em>
          </article>
          <article className="pwaPremiumCard">
            <span>Notifications</span>
            <strong>{formatPermission(notificationPermission)}</strong>
            <em>{settings.pwaNotifications ? "Alertes actives dans l'app" : "Alertes désactivées dans l'app"}</em>
          </article>
          <article className="pwaPremiumCard">
            <span>Images cartes</span>
            <strong>{cacheStatus?.cardImageEntries ?? 0}</strong>
            <em>{cacheFillPercent}% des images préparées</em>
          </article>
          <article className="pwaPremiumCard">
            <span>Mode hors ligne</span>
            <strong>{cacheSupported ? "Prêt" : "Non supporté"}</strong>
            <em>{cacheStatus?.version ?? "Statut en attente"}</em>
          </article>
        </section>

        <section className="pwaStatusPanel">
          <div className="pwaStatusPanel__head">
            <div>
              <span>État de l'app</span>
              <h2>Donnees synchronisees</h2>
              <p>
                Une lecture rapide de ce que l'app peut faire maintenant :
                connexion, mode hors ligne, images préparées et espace utilisé.
              </p>
            </div>
            <button
              type="button"
              className="pwaPreferencesBtn pwaPreferencesBtn--ghost"
              onClick={() => void refreshPwaStatus()}
            >
              Resynchroniser
            </button>
          </div>

          <div className="pwaStatusGrid">
            <article className={["pwaStatusCard", online ? "is-good" : "is-warn"].join(" ")}>
              <span>Connexion</span>
              <strong>{connectionLabel}</strong>
              <em>{connection?.saveData ? "Mode économie de données détecté" : "Prêt pour market et openings"}</em>
            </article>
            <article className={["pwaStatusCard", serviceWorkerReady ? "is-good" : "is-warn"].join(" ")}>
              <span>Mode hors ligne</span>
              <strong>{serviceWorkerLabel}</strong>
              <em>{cacheStatus?.version ? "Prêt" : "En préparation"}</em>
            </article>
            <article className="pwaStatusCard">
              <span>Elements disponibles</span>
              <strong>{(cacheStatus?.shellEntries ?? 0) + (cacheStatus?.runtimeEntries ?? 0)}</strong>
              <em>{cacheStatus?.shellEntries ?? 0} pages + {cacheStatus?.runtimeEntries ?? 0} images</em>
            </article>
            <article className="pwaStatusCard">
              <span>Espace utilisé</span>
              <strong>{storageFillPercent}%</strong>
              <em>{formatBytes(storageEstimate?.usage)} utilisés sur {formatBytes(storageEstimate?.quota)}</em>
            </article>
          </div>

          <div className="pwaSyncBanner">
            <div>
              <strong>Dernière vérification : {formatStatusTime(lastStatusAt || cacheStatus?.timestamp)}</strong>
              <span>
                Si tu passes hors ligne, garde surtout les pages déjà ouvertes et les images de cartes préparées.
              </span>
            </div>
            <div className="pwaSyncBanner__chips">
              <span>{cacheStatus?.cardImageEntries ?? 0} cartes</span>
              <span>{cacheStatus?.runtimeEntries ?? 0} éléments</span>
              <span>{online ? "Serveur joignable" : "Mode lecture locale"}</span>
            </div>
          </div>
        </section>

        <section className="pwaInstallGuide">
          <div>
            <span>Installation</span>
            <h2>Un raccourci propre, comme une vraie app.</h2>
            <p>
              Le bouton automatique apparaît quand ton appareil autorise
              l'installation. Sinon, passe par le menu de ton navigateur.
            </p>
          </div>
          <ol>
            <li>Chrome/Edge : bouton Installer ou menu puis Installer l'application.</li>
            <li>Android : ajoute l'app à l'écran d'accueil pour ouvrir en plein écran.</li>
            <li>iPhone/iPad : menu Partager puis Sur l'écran d'accueil.</li>
          </ol>
        </section>

        <section className="pwaPreferencesSection">
          <div className="pwaPreferencesSection__head">
            <div>
              <h2>Expérience installée</h2>
              <p>Les options qui donnent le côté vraie application mobile.</p>
            </div>
          </div>

          <div className="pwaPreferenceRows">
            <div className="pwaPreferenceRow">
              <div>
                <strong>Notifications de l'app</strong>
                <span>Autorise l'app à envoyer des alertes même quand elle est fermée.</span>
              </div>
              <button
                type="button"
                className={`skipToggleBtn ${settings.pwaNotifications ? "is-on" : "is-off"}`}
                onClick={() => {
                  if (settings.pwaNotifications) {
                    updateLocalSetting("pwaNotifications", false);
                    return;
                  }
                  void enableNotifications();
                }}
                aria-pressed={settings.pwaNotifications}
              >
                <span className="skipToggleBtn__track"><span className="skipToggleBtn__thumb" /></span>
                <span className="skipToggleBtn__label">{settings.pwaNotifications ? "Active" : "Desactive"}</span>
              </button>
            </div>

            <div className="pwaPreferenceRow">
              <div>
                <strong>Images de cartes hors ligne</strong>
                <span>Prépare automatiquement les images importantes pour les moments sans connexion.</span>
              </div>
              <button
                type="button"
                className={`skipToggleBtn ${settings.pwaAutoCacheCardImages ? "is-on" : "is-off"}`}
                onClick={() => updateLocalSetting("pwaAutoCacheCardImages", !settings.pwaAutoCacheCardImages)}
                aria-pressed={settings.pwaAutoCacheCardImages}
              >
                <span className="skipToggleBtn__track"><span className="skipToggleBtn__thumb" /></span>
                <span className="skipToggleBtn__label">{settings.pwaAutoCacheCardImages ? "Active" : "Desactive"}</span>
              </button>
            </div>

            <div className="pwaPreferenceRow">
              <div>
                <strong>Assistant hors ligne</strong>
                <span>Affiche un panneau utile quand la connexion saute.</span>
              </div>
              <button
                type="button"
                className={`skipToggleBtn ${settings.pwaOfflineHints ? "is-on" : "is-off"}`}
                onClick={() => updateLocalSetting("pwaOfflineHints", !settings.pwaOfflineHints)}
                aria-pressed={settings.pwaOfflineHints}
              >
                <span className="skipToggleBtn__track"><span className="skipToggleBtn__thumb" /></span>
                <span className="skipToggleBtn__label">{settings.pwaOfflineHints ? "Active" : "Desactive"}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="pwaPreferencesSection">
          <div className="pwaPreferencesSection__head">
            <div>
              <h2>Images disponibles hors ligne</h2>
              <p>L'app garde les images de cartes les plus utiles pour les moments sans connexion.</p>
            </div>
            <button
              type="button"
              className="pwaPreferencesBtn pwaPreferencesBtn--ghost"
              onClick={() => requestPwaCacheStatus().catch(() => undefined)}
            >
              Actualiser
            </button>
          </div>

          <div className="pwaCacheMeter">
            <div>
              <span style={{ width: `${cacheFillPercent}%` }} />
            </div>
            <strong>
              {cacheStatus?.cardImageEntries ?? 0} / {cacheStatus?.cardImageLimit ?? 260} images
            </strong>
          </div>

          {cacheProgress ? (
            <div className="pwaPreferencesNotice">
              Préparation en cours : {cacheProgress.cached} ok, {cacheProgress.failed} erreur(s), sur {cacheProgress.total}.
            </div>
          ) : null}

          {cacheFeedback ? <div className="pwaPreferencesNotice">{cacheFeedback}</div> : null}

          <div className="pwaPreferencesActions">
            <button type="button" className="pwaPreferencesBtn" disabled={cacheBusy} onClick={() => void cacheOwnedCards()}>
              Préparer ma collection
            </button>
            <button type="button" className="pwaPreferencesBtn" disabled={cacheBusy} onClick={() => void cacheSmartCatalog()}>
              Préparer les images utiles
            </button>
            <button type="button" className="pwaPreferencesBtn pwaPreferencesBtn--danger" disabled={cacheBusy} onClick={() => void clearImages()}>
              Vider images
            </button>
          </div>
        </section>

        <section className="pwaPreferencesSection">
          <div className="pwaPreferencesSection__head">
            <div>
              <h2>Notifications par type</h2>
              <p>Chaque type d'alerte peut vivre sa vie, sans spam inutile.</p>
            </div>
          </div>

          {pushPrefsLoading ? (
            <div className="pwaPreferencesNotice">Chargement des préférences de notifications...</div>
          ) : pushPrefs ? (
            <>
              <div className="pwaPreferenceRows">
                {NOTIFICATION_ROWS.map((row) => (
                  <div className="pwaPreferenceRow" key={row.key}>
                    <div>
                      <strong>{row.title}</strong>
                      <span>{row.desc}</span>
                    </div>

                    {row.kind === "toggle" ? (
                      <button
                        type="button"
                        className={`skipToggleBtn ${pushPrefs[row.key] ? "is-on" : "is-off"}`}
                        onClick={() =>
                          updatePushPref(row.key, !pushPrefs[row.key] as never)
                        }
                        aria-pressed={Boolean(pushPrefs[row.key])}
                      >
                        <span className="skipToggleBtn__track"><span className="skipToggleBtn__thumb" /></span>
                        <span className="skipToggleBtn__label">{pushPrefs[row.key] ? "Active" : "Desactive"}</span>
                      </button>
                    ) : (
                      <label className="pwaNumberField">
                        <input
                          type="number"
                          min={row.min}
                          max={row.max}
                          value={Number(pushPrefs[row.key])}
                          onChange={(event) =>
                            updatePushPref(
                              row.key,
                              Math.max(row.min ?? 1, Number(event.target.value || row.min || 1)) as never,
                            )
                          }
                        />
                        <span>{row.suffix}</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              {pushPrefsFeedback ? <div className="pwaPreferencesNotice">{pushPrefsFeedback}</div> : null}
              {pushPrefsError ? <div className="pwaPreferencesNotice pwaPreferencesNotice--error">{pushPrefsError}</div> : null}

              <div className="pwaPreferencesActions">
                <button type="button" className="pwaPreferencesBtn" disabled={pushPrefsSaving} onClick={() => void savePushPrefs()}>
                  {pushPrefsSaving ? "Enregistrement..." : "Sauvegarder les notifications"}
                </button>
              </div>
            </>
          ) : (
            <div className="pwaPreferencesNotice pwaPreferencesNotice--error">
              {pushPrefsError || "Impossible de charger les préférences de notifications."}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
