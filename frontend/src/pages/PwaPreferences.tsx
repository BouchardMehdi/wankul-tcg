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
    title: "Vente terminee",
    desc: "Quand une recompense vendeur est disponible.",
    kind: "toggle",
  },
  {
    key: "freeOpeningsReadyEnabled",
    title: "Ouvertures gratuites pretes",
    desc: "Quand un booster ou une display gratuite peut etre recuperee.",
    kind: "toggle",
  },
  {
    key: "freeOpeningsSoonEnabled",
    title: "Recharge bientot prete",
    desc: "Quand une charge gratuite arrive bientot.",
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
    desc: "Delai avant le rappel sur une annonce active.",
    kind: "number",
    min: 6,
    max: 336,
    suffix: "h",
  },
  {
    key: "dailyMarketRecapEnabled",
    title: "Recap market quotidien",
    desc: "Un resume leger du market si tu veux plus d'engagement.",
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
  if (permission === "denied") return "Bloquee";
  if (permission === "default") return "Pas encore demandee";
  return "Non supportee";
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
    : "Non supporte";

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
      setInstallFeedback("Installation terminee. Wankul TCG est maintenant lanceable comme une app.");
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
          setPushPrefsError(err?.message || "Impossible de charger les preferences push.");
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
          ? "La PWA est deja installee sur cet appareil."
          : "Si le bouton navigateur n'apparait pas, utilise le menu du navigateur puis 'Installer l'application'.",
      );
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallFeedback(
      choice.outcome === "accepted"
        ? "Installation lancee. Bienvenue dans la vraie app."
        : "Installation annulee, tu pourras retenter plus tard.",
    );
  }

  async function refreshPwaStatus() {
    setCacheFeedback("");
    setLastStatusAt(Date.now());

    if (cacheSupported) {
      await requestPwaCacheStatus().catch(() => {
        setCacheFeedback("Service worker pas encore pret, reessaie dans quelques secondes.");
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
      setPushPrefsError("Les notifications ne sont pas supportees sur ce navigateur.");
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
      setPushPrefsError(err?.message || "Impossible d'activer les notifications push.");
    });
  }

  async function cacheUrls(urls: string[], successLabel: string) {
    if (!cacheSupported) {
      setCacheFeedback("Cache PWA non supporte sur ce navigateur.");
      return;
    }

    const usableUrls = Array.from(new Set(urls.filter(Boolean)));
    if (!usableUrls.length) {
      setCacheFeedback("Aucune image a mettre en cache pour le moment.");
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
      setCacheFeedback(err?.message || "Impossible de preparer le cache images.");
    }
  }

  async function cacheOwnedCards() {
    const ownedRows = await fetchOwnedCollection();
    const urls = ownedRows.map((row) => toAbsoluteAssetUrl(row.card.imageUrl));
    await cacheUrls(urls, "Images de ta collection preparees pour le hors ligne.");
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
    await cacheUrls(urls, `Cache intelligent prepare pour ${Math.min(urls.length, limit)} images.`);
  }

  async function clearImages() {
    if (!cacheSupported) return;

    setCacheBusy(true);
    setCacheFeedback("");
    setCacheProgress(null);

    try {
      await clearCardImageCache();
      setCacheFeedback("Cache images vide.");
    } catch (err: any) {
      playActionDeniedSound();
      setCacheBusy(false);
      setCacheFeedback(err?.message || "Impossible de vider le cache images.");
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
      setPushPrefsError(err?.message || "Impossible d'enregistrer les preferences.");
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
            <span>Web app premium</span>
            <h1>Preferences PWA</h1>
            <p>
              Installe l'app, prepare les images de cartes, regle le hors ligne
              et choisis precisement les notifications qui meritent de vibrer.
            </p>
          </div>

          <button type="button" className="pwaPreferencesBtn" onClick={handleInstall}>
            {installed ? "PWA installee" : "Installer l'app"}
          </button>
        </header>

        {installFeedback ? <div className="pwaPreferencesNotice">{installFeedback}</div> : null}

        <section className="pwaPreferencesGrid">
          <article className="pwaPremiumCard">
            <span>Etat</span>
            <strong>{online ? "Connectee" : "Hors ligne"}</strong>
            <em>{installed ? "Mode installe actif" : "Installation disponible selon navigateur"}</em>
          </article>
          <article className="pwaPremiumCard">
            <span>Notifications</span>
            <strong>{formatPermission(notificationPermission)}</strong>
            <em>{settings.pwaNotifications ? "Push active dans l'app" : "Push desactive dans l'app"}</em>
          </article>
          <article className="pwaPremiumCard">
            <span>Images cartes</span>
            <strong>{cacheStatus?.cardImageEntries ?? 0}</strong>
            <em>{cacheFillPercent}% du cache premium utilise</em>
          </article>
          <article className="pwaPremiumCard">
            <span>Service worker</span>
            <strong>{cacheSupported ? "Pret" : "Non supporte"}</strong>
            <em>{cacheStatus?.version ?? "Statut en attente"}</em>
          </article>
        </section>

        <section className="pwaStatusPanel">
          <div className="pwaStatusPanel__head">
            <div>
              <span>Statut reseau/cache</span>
              <h2>Donnees synchronisees</h2>
              <p>
                Une lecture rapide de ce que la PWA peut faire maintenant :
                connexion, service worker, cache et stockage navigateur.
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
              <em>{connection?.saveData ? "Mode economie de donnees detecte" : "Pret pour market et openings"}</em>
            </article>
            <article className={["pwaStatusCard", serviceWorkerReady ? "is-good" : "is-warn"].join(" ")}>
              <span>Service worker</span>
              <strong>{serviceWorkerLabel}</strong>
              <em>{cacheStatus?.version ?? "Version cache en attente"}</em>
            </article>
            <article className="pwaStatusCard">
              <span>Cache app</span>
              <strong>{(cacheStatus?.shellEntries ?? 0) + (cacheStatus?.runtimeEntries ?? 0)}</strong>
              <em>{cacheStatus?.shellEntries ?? 0} shell + {cacheStatus?.runtimeEntries ?? 0} assets</em>
            </article>
            <article className="pwaStatusCard">
              <span>Stockage navigateur</span>
              <strong>{storageFillPercent}%</strong>
              <em>{formatBytes(storageEstimate?.usage)} utilises sur {formatBytes(storageEstimate?.quota)}</em>
            </article>
          </div>

          <div className="pwaSyncBanner">
            <div>
              <strong>Derniere verification : {formatStatusTime(lastStatusAt || cacheStatus?.timestamp)}</strong>
              <span>
                Si tu passes hors ligne, garde surtout les pages deja ouvertes et les images de cartes cachees.
              </span>
            </div>
            <div className="pwaSyncBanner__chips">
              <span>{cacheStatus?.cardImageEntries ?? 0} cartes</span>
              <span>{cacheStatus?.runtimeEntries ?? 0} assets</span>
              <span>{online ? "Serveur joignable" : "Mode lecture locale"}</span>
            </div>
          </div>
        </section>

        <section className="pwaInstallGuide">
          <div>
            <span>Installation</span>
            <h2>Un raccourci propre, comme une vraie app.</h2>
            <p>
              Le bouton automatique apparait quand le navigateur autorise
              l'installation. Sinon, passe par le menu du navigateur.
            </p>
          </div>
          <ol>
            <li>Chrome/Edge : bouton Installer ou menu puis Installer l'application.</li>
            <li>Android : ajoute l'app a l'ecran d'accueil pour ouvrir en plein ecran.</li>
            <li>iPhone/iPad : menu Partager puis Sur l'ecran d'accueil.</li>
          </ol>
        </section>

        <section className="pwaPreferencesSection">
          <div className="pwaPreferencesSection__head">
            <div>
              <h2>Experience installee</h2>
              <p>Les options qui donnent le cote vraie application mobile.</p>
            </div>
          </div>

          <div className="pwaPreferenceRows">
            <div className="pwaPreferenceRow">
              <div>
                <strong>Notifications PWA globales</strong>
                <span>Autorise l'app a recevoir les vraies push systeme.</span>
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
                <strong>Cache intelligent des cartes</strong>
                <span>Prepare automatiquement les images importantes pour le hors ligne.</span>
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
              <h2>Cache images de cartes</h2>
              <p>Le service worker garde les images de cartes les plus utiles.</p>
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
              Cache en cours : {cacheProgress.cached} ok, {cacheProgress.failed} erreur(s), sur {cacheProgress.total}.
            </div>
          ) : null}

          {cacheFeedback ? <div className="pwaPreferencesNotice">{cacheFeedback}</div> : null}

          <div className="pwaPreferencesActions">
            <button type="button" className="pwaPreferencesBtn" disabled={cacheBusy} onClick={() => void cacheOwnedCards()}>
              Cache ma collection
            </button>
            <button type="button" className="pwaPreferencesBtn" disabled={cacheBusy} onClick={() => void cacheSmartCatalog()}>
              Optimiser le cache
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
            <div className="pwaPreferencesNotice">Chargement des preferences push...</div>
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
              {pushPrefsError || "Impossible de charger les preferences push."}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
