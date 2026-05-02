import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Dashboard.css";
import "../styles/Settings.css";

import AppNavbar from "../components/AppNavbar";

import {
  APP_SETTINGS_DEFAULTS,
  readAppSettings,
  subscribeAppSettings,
  writeAppSettings,
  type AppSettings,
  type ThemeMode,
} from "../utils/appSettings";
import { playActionDeniedSound, playSettingToggleSound, primeSound } from "../utils/sound";
import {
  isPwaNotificationSupported,
  requestPwaNotificationPermission,
} from "../utils/pwaNotifications";
import {
  getPushPreferences,
  updatePushPreferences,
  type PushNotificationPreferences,
} from "../api/push";
import { useAuth } from "../auth/AuthContext";
import {
  getMyBugReports,
  reportBug,
  type BugReportListItem,
  type BugReportStatus,
} from "../api/auth";

type SelectSettingKey = "collectionLayout" | "themeMode";
type ToggleSettingKey = Exclude<keyof AppSettings, SelectSettingKey | "compactCollectionGrid">;

type SettingRow =
  | {
      key: ToggleSettingKey;
      title: string;
      desc: string;
      kind: "toggle";
      section: "general" | "market";
    }
  | {
      key: SelectSettingKey;
      title: string;
      desc: string;
      kind: "select";
      section: "general" | "market";
    };

const SETTING_ROWS: SettingRow[] = [
  {
    key: "themeMode",
    title: "Apparence",
    desc: "Suit le theme de ton appareil par defaut, ou force le mode clair/sombre.",
    kind: "select",
    section: "general",
  },
  {
    key: "pwaNotifications",
    title: "Notifications de l'app",
    desc: "Recoit une alerte pour les boosters ou displays gratuits et les ventes du market pretes a etre recuperees.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "soundEffects",
    title: "Sons",
    desc: "Active les sons d'interface, d'opening, de market et des interactions principales.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "skipOpeningAnimations",
    title: "Passer les animations",
    desc: "Passe directement aux cartes ou au résumé pendant les openings.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "autoFlipCards",
    title: "Defilement auto des cartes",
    desc: "Fait défiler automatiquement les cartes révélées une par une.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "fastReveal",
    title: "Ouverture rapide",
    desc: "Accélère les timings d'ouverture et les enchaînements des cartes.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "disableHoloEffects",
    title: "Reduire les effets brillants",
    desc: "Désactive les effets holo et une partie des effets visuels lourds.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "showDuplicatesCounter",
    title: "Compteur de doublons",
    desc: "Affiche le compteur x2, x3, x4… sur les cartes possédées plusieurs fois.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "collectionLayout",
    title: "Affichage collection",
    desc: "Choisis la disposition de la grille de collection selon ton écran et ta préférence.",
    kind: "select",
    section: "general",
  },
  {
    key: "hideMissingCards",
    title: "Masquer les cartes manquantes",
    desc: "Masque les cartes non débloquées dans la collection.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "autoHighlightNewCards",
    title: "Nouvelles cartes mises en avant",
    desc: "Met en avant dans la collection les nouvelles cartes obtenues lors de la dernière ouverture.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "showDropRates",
    title: "Afficher les chances d'ouverture",
    desc: "Affiche la distribution du butin et les pourcentages dans ton espace joueur.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "confirmPurchases",
    title: "Confirmer les achats",
    desc: "Demande une confirmation avant d'acheter un booster ou une display avec des crédits.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "autoClaimMarketRewards",
    title: "Récupération automatique des récompenses",
    desc: "Récupère automatiquement les crédits et cartes gagnés quand une vente est terminée.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmQuickSell",
    title: "Confirmer avant une vente rapide",
    desc: "Affiche une confirmation avant de vendre une carte avec la vente rapide.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmCancelListing",
    title: "Confirmer avant l'annulation d'une annonce",
    desc: "Demande une confirmation avant d'annuler une annonce active du market.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmMarketBuy",
    title: "Confirmer avant un achat market",
    desc: "Affiche une confirmation avant d'acheter une annonce sur le market.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmBelowMarketSale",
    title: "Confirmer si le prix est très inférieur au marché",
    desc: "Demande une confirmation avant de créer une annonce bien en dessous du prix du marché.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmAboveMarketSale",
    title: "Confirmer si le prix est très supérieur au marché",
    desc: "Demande une confirmation avant de créer une annonce bien au-dessus du prix du marché.",
    kind: "toggle",
    section: "market",
  },
];

const SECTION_META = {
  general: {
    title: "Application",
    desc: "Preferences globales de l'app, de la collection et des openings.",
  },
  market: {
    title: "Market",
    desc: "Preferences de securite et de confort pour les achats et ventes.",
  },
  notifications: {
    title: "Notifications",
    desc: "Alertes de l'app pour le market, les charges gratuites, la watchlist et le recap quotidien.",
  },
  support: {
    title: "Support",
    desc: "Signale un bug, un probleme visuel ou un comportement anormal rencontre dans l'application.",
  },
} as const;

const PAGE_OPTIONS = [
  "Home",
  "Login",
  "Register",
  "Espace joueur",
  "Booster",
  "Opening",
  "Collection",
  "Market",
  "Settings",
  "Autre",
] as const;

const FEATURE_OPTIONS = [
  "Authentification",
  "Ouverture booster",
  "Ouverture display",
  "Animations",
  "Collection",
  "Filtres",
  "Vente rapide",
  "Création d'annonce",
  "Achat market",
  "Historique market",
  "Paramètres",
  "Autre",
] as const;

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "visual", label: "Problème visuel" },
  { value: "performance", label: "Performance" },
  { value: "market", label: "Market" },
  { value: "opening", label: "Opening" },
  { value: "collection", label: "Collection" },
  { value: "auth", label: "Authentification" },
  { value: "other", label: "Autre" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "minor", label: "Mineur" },
  { value: "medium", label: "Gênant" },
  { value: "high", label: "Important" },
  { value: "blocking", label: "Bloquant" },
] as const;

const STATUS_LABELS: Record<BugReportStatus, string> = {
  open: "Ouvert",
  investigating: "En analyse",
  planned: "Planifié",
  fixed: "Corrigé",
  closed: "Clos",
  rejected: "Rejeté",
};

const MAX_SCREENSHOT_SIZE = 4 * 1024 * 1024;
const PLAYER_REPORTS_PAGE_SIZE = 5;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR");
}

function getApiOrigin() {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  return raw.replace(/\/api\/?$/, "");
}

function toAbsoluteAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${getApiOrigin()}${url}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout, user, me } = useAuth();

  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());
  const [pushPrefsLoading, setPushPrefsLoading] = useState(true);
  const [pushPrefsSaving, setPushPrefsSaving] = useState(false);
  const [pushPrefsError, setPushPrefsError] = useState("");
  const [pushPrefsFeedback, setPushPrefsFeedback] = useState("");
  const [pushPrefs, setPushPrefs] = useState<PushNotificationPreferences | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<(typeof CATEGORY_OPTIONS)[number]["value"]>("bug");
  const [reportPage, setReportPage] = useState<string>("Settings");
  const [reportFeature, setReportFeature] = useState<string>("Paramètres");
  const [reportPriority, setReportPriority] = useState<(typeof PRIORITY_OPTIONS)[number]["value"]>("medium");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSteps, setReportSteps] = useState("");
  const [reportScreenshot, setReportScreenshot] = useState<File | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [reportHistory, setReportHistory] = useState<BugReportListItem[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("");
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    pageSize: PLAYER_REPORTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  useEffect(() => {
    loadBugReports(1, reportStatusFilter).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPushPrefs() {
      setPushPrefsLoading(true);
      setPushPrefsError("");

      try {
        const prefs = await getPushPreferences();
        if (cancelled) return;
        setPushPrefs(prefs);
      } catch (err: any) {
        if (cancelled) return;
        setPushPrefsError(err?.message || "Impossible de charger les notifications push.");
      } finally {
        if (!cancelled) setPushPrefsLoading(false);
      }
    }

    loadPushPrefs().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const enabledCount = useMemo(
    () =>
      Object.entries(settings).filter(([key, value]) => {
        if (key === "themeMode" || key === "collectionLayout" || key === "compactCollectionGrid") return false;
        return Boolean(value);
      }).length,
    [settings],
  );

  const generalRows = useMemo(
    () => SETTING_ROWS.filter((row) => row.section === "general"),
    [],
  );

  const marketRows = useMemo(
    () => SETTING_ROWS.filter((row) => row.section === "market"),
    [],
  );

  const currentUsername = user?.username ?? me?.username ?? "";
  const currentEmail = user?.email ?? me?.email ?? "";

  async function loadBugReports(nextPage = historyPagination.page, nextStatus = reportStatusFilter) {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await getMyBugReports({
        status: nextStatus || undefined,
        page: nextPage,
        pageSize: PLAYER_REPORTS_PAGE_SIZE,
      });

      setReportHistory(res.items ?? []);
      setHistoryPagination(
        res.pagination ?? {
          page: 1,
          pageSize: PLAYER_REPORTS_PAGE_SIZE,
          total: 0,
          totalPages: 1,
        },
      );
      setExpandedReportId(null);
    } catch (err: any) {
      setHistoryError(err?.message || "Impossible de charger l'historique.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function toggle(key: ToggleSettingKey) {
    const next = !settings[key];
    void primeSound(key === "soundEffects");

    if (key === "pwaNotifications" && next) {
      if (!isPwaNotificationSupported()) {
        playActionDeniedSound();
        return;
      }

      const permission = await requestPwaNotificationPermission();

      if (permission !== "granted") {
        playActionDeniedSound();
        setSettings((current) => ({ ...current, pwaNotifications: false }));
        writeAppSettings({ pwaNotifications: false });
        return;
      }
    }

    const merged = { ...settings, [key]: next };
    playSettingToggleSound(next, { force: key === "soundEffects" });
    setSettings(merged);
    writeAppSettings({ [key]: next });
  }

  function updateCollectionLayout(value: AppSettings["collectionLayout"]) {
    const merged = { ...settings, collectionLayout: value };
    setSettings(merged);
    writeAppSettings({ collectionLayout: value });
  }

  function updateThemeMode(value: ThemeMode) {
    const merged = { ...settings, themeMode: value };
    setSettings(merged);
    writeAppSettings({ themeMode: value });
    playSettingToggleSound(value !== "system");
  }

  function resetAll() {
    setSettings(APP_SETTINGS_DEFAULTS);
    writeAppSettings(APP_SETTINGS_DEFAULTS);
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
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

    void primeSound();
    setPushPrefsSaving(true);
    setPushPrefsError("");
    setPushPrefsFeedback("");

    try {
      const saved = await updatePushPreferences(pushPrefs);
      setPushPrefs(saved);
      setPushPrefsFeedback("Preferences push enregistrees.");
    } catch (err: any) {
      playActionDeniedSound();
      setPushPrefsError(err?.message || "Impossible d'enregistrer les notifications.");
    } finally {
      setPushPrefsSaving(false);
    }
  }

  function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0] ?? null;

    if (!file) {
      setReportScreenshot(null);
      return;
    }

    if (file.size > MAX_SCREENSHOT_SIZE) {
      setReportScreenshot(null);
      setReportError("La capture d’écran dépasse 4 Mo maximum.");
      input.value = "";
      return;
    }

    setReportError("");
    setReportScreenshot(file);
  }

  function removeScreenshot() {
    setReportScreenshot(null);
    setReportError("");
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    setReportError("");
    setReportMessage("");
    setReportSubmitting(true);

    try {
      let screenshotDataUrl: string | undefined;

      if (reportScreenshot) {
        if (reportScreenshot.size > MAX_SCREENSHOT_SIZE) {
          throw new Error("La capture d’écran dépasse 4 Mo.");
        }
        screenshotDataUrl = await fileToDataUrl(reportScreenshot);
      }

      const result = await reportBug({
        category: reportCategory,
        page: reportPage,
        feature: reportFeature,
        priority: reportPriority,
        description: reportDescription.trim(),
        reproductionSteps: reportSteps.trim(),
        currentUrl: window.location.href,
        browserInfo: navigator.userAgent,
        screenshotDataUrl,
        screenshotFilename: reportScreenshot?.name,
      });

      setReportMessage(
        result.message || "Merci, ton signalement a bien été envoyé."
      );
      setReportDescription("");
      setReportSteps("");
      setReportScreenshot(null);
      setReportCategory("bug");
      setReportPage("Settings");
      setReportFeature("Paramètres");
      setReportPriority("medium");

      await loadBugReports(1, reportStatusFilter);
    } catch (err: any) {
      setReportError(err?.message || "Impossible d'envoyer le signalement.");
    } finally {
      setReportSubmitting(false);
    }
  }

  function handlePlayerStatusFilterChange(value: string) {
    setReportStatusFilter(value);
    loadBugReports(1, value).catch(() => {});
  }

  function goToHistoryPage(nextPage: number) {
    loadBugReports(nextPage, reportStatusFilter).catch(() => {});
  }

  function renderRow(row: SettingRow) {
    if (row.kind === "select") {
      const isThemeSelect = row.key === "themeMode";

      return (
        <div className="settingsRow" key={row.key}>
          <div className="settingsRow__content">
            <div className="settingsRow__title">{row.title}</div>
            <div className="settingsRow__desc">{row.desc}</div>
          </div>

          <div className="settingsRow__control">
            <select
              className="settingsSelect"
              value={isThemeSelect ? settings.themeMode : settings.collectionLayout}
              onChange={(e) => {
                if (isThemeSelect) {
                  updateThemeMode(e.target.value as ThemeMode);
                  return;
                }

                updateCollectionLayout(e.target.value as AppSettings["collectionLayout"]);
              }}
            >
              {isThemeSelect ? (
                <>
                  <option value="system">Automatique systeme</option>
                  <option value="dark">Mode sombre</option>
                  <option value="light">Mode clair</option>
                </>
              ) : (
                <>
                  <option value="standard">Standard — 5 colonnes</option>
                  <option value="compact">Compact — 6 colonnes</option>
                  <option value="large">Large — 4 colonnes</option>
                </>
              )}
            </select>
          </div>
        </div>
      );
    }

    const checked = settings[row.key];
    return (
      <div className="settingsRow" key={row.key}>
        <div className="settingsRow__content">
          <div className="settingsRow__title">{row.title}</div>
          <div className="settingsRow__desc">{row.desc}</div>
        </div>

        <button
          type="button"
          className={`skipToggleBtn ${checked ? "is-on" : "is-off"}`}
          onClick={() => {
            void toggle(row.key);
          }}
          aria-pressed={checked}
        >
          <span className="skipToggleBtn__track">
            <span className="skipToggleBtn__thumb" />
          </span>
          <span className="skipToggleBtn__label">{checked ? "Activé" : "Désactivé"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppNavbar currentPage="settings" />

      <section className="container settingsPage">
        <div className="panel settingsPanel">
          <div className="panel-inner">
            <div className="section-title settingsHeading">
              <div>
                <h2>Paramètres</h2>
                <p className="small">Preferences de ton application.</p>
              </div>

              <div className="settingsSummary small">
                <b>{enabledCount}</b> option{enabledCount > 1 ? "s" : ""} activée{enabledCount > 1 ? "s" : ""}
              </div>
            </div>

            <div className="settingsSections">
              <div className="settingsSection">
                <div className="settingsSection__head">
                  <div className="settingsSection__title">{SECTION_META.general.title}</div>
                  <div className="settingsSection__desc">{SECTION_META.general.desc}</div>
                </div>

                <div className="settingsList">
                  {generalRows.map(renderRow)}
                </div>

                <div className="settingsPwaShortcut">
                  <div>
                    <div className="settingsPwaShortcut__title">Preferences de l'app installee</div>
                    <div className="settingsPwaShortcut__desc">
                      Installation, images de cartes hors ligne et notifications par type.
                    </div>
                  </div>

                  <Link className="btn" to="/pwa-preferences">
                    Ouvrir
                  </Link>
                </div>
              </div>

              <div className="settingsSection">
                <div className="settingsSection__head">
                  <div className="settingsSection__title">{SECTION_META.market.title}</div>
                  <div className="settingsSection__desc">{SECTION_META.market.desc}</div>
                </div>

                <div className="settingsList">
                  {marketRows.map(renderRow)}
                </div>
              </div>

              <div className="settingsSection">
                <div className="settingsSection__head">
                  <div className="settingsSection__title">{SECTION_META.notifications.title}</div>
                  <div className="settingsSection__desc">{SECTION_META.notifications.desc}</div>
                </div>

                {pushPrefsLoading ? (
                  <div className="settingsSupportCard__desc">Chargement des notifications...</div>
                ) : pushPrefs ? (
                  <div className="settingsList">
                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Vente terminee</div>
                        <div className="settingsRow__desc">Notif quand une recompense vendeur est disponible.</div>
                      </div>
                      <button
                        type="button"
                        className={`skipToggleBtn ${pushPrefs.saleRewardEnabled ? "is-on" : "is-off"}`}
                        onClick={() => updatePushPref("saleRewardEnabled", !pushPrefs.saleRewardEnabled)}
                        aria-pressed={pushPrefs.saleRewardEnabled}
                      >
                        <span className="skipToggleBtn__track">
                          <span className="skipToggleBtn__thumb" />
                        </span>
                        <span className="skipToggleBtn__label">{pushPrefs.saleRewardEnabled ? "Active" : "Desactive"}</span>
                      </button>
                    </div>

                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Charges gratuites pretes</div>
                        <div className="settingsRow__desc">Notif quand un booster ou une display gratuite est disponible.</div>
                      </div>
                      <button
                        type="button"
                        className={`skipToggleBtn ${pushPrefs.freeOpeningsReadyEnabled ? "is-on" : "is-off"}`}
                        onClick={() => updatePushPref("freeOpeningsReadyEnabled", !pushPrefs.freeOpeningsReadyEnabled)}
                        aria-pressed={pushPrefs.freeOpeningsReadyEnabled}
                      >
                        <span className="skipToggleBtn__track">
                          <span className="skipToggleBtn__thumb" />
                        </span>
                        <span className="skipToggleBtn__label">{pushPrefs.freeOpeningsReadyEnabled ? "Active" : "Desactive"}</span>
                      </button>
                    </div>

                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Charge gratuite bientot prete</div>
                        <div className="settingsRow__desc">Alerte quand une charge gratuite arrive dans moins de X minutes.</div>
                      </div>
                      <button
                        type="button"
                        className={`skipToggleBtn ${pushPrefs.freeOpeningsSoonEnabled ? "is-on" : "is-off"}`}
                        onClick={() => updatePushPref("freeOpeningsSoonEnabled", !pushPrefs.freeOpeningsSoonEnabled)}
                        aria-pressed={pushPrefs.freeOpeningsSoonEnabled}
                      >
                        <span className="skipToggleBtn__track">
                          <span className="skipToggleBtn__thumb" />
                        </span>
                        <span className="skipToggleBtn__label">{pushPrefs.freeOpeningsSoonEnabled ? "Active" : "Desactive"}</span>
                      </button>
                    </div>

                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Fenetre avant recharge</div>
                        <div className="settingsRow__desc">Nombre de minutes avant recharge pour recevoir l'alerte.</div>
                      </div>
                      <div className="settingsRow__control">
                        <input
                          className="settingsSelect"
                          type="number"
                          min={5}
                          max={180}
                          value={pushPrefs.freeOpeningsSoonMinutes}
                          onChange={(e) =>
                            updatePushPref(
                              "freeOpeningsSoonMinutes",
                              Math.max(5, Number(e.target.value || 15)),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Watchlist prix cible</div>
                        <div className="settingsRow__desc">Notif quand une carte suivie passe sous ton prix cible.</div>
                      </div>
                      <button
                        type="button"
                        className={`skipToggleBtn ${pushPrefs.watchlistPriceAlertEnabled ? "is-on" : "is-off"}`}
                        onClick={() => updatePushPref("watchlistPriceAlertEnabled", !pushPrefs.watchlistPriceAlertEnabled)}
                        aria-pressed={pushPrefs.watchlistPriceAlertEnabled}
                      >
                        <span className="skipToggleBtn__track">
                          <span className="skipToggleBtn__thumb" />
                        </span>
                        <span className="skipToggleBtn__label">{pushPrefs.watchlistPriceAlertEnabled ? "Active" : "Desactive"}</span>
                      </button>
                    </div>

                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Annonce perso trop longue</div>
                        <div className="settingsRow__desc">Rappel quand une annonce reste invendue apres un certain temps.</div>
                      </div>
                      <button
                        type="button"
                        className={`skipToggleBtn ${pushPrefs.staleListingAlertEnabled ? "is-on" : "is-off"}`}
                        onClick={() => updatePushPref("staleListingAlertEnabled", !pushPrefs.staleListingAlertEnabled)}
                        aria-pressed={pushPrefs.staleListingAlertEnabled}
                      >
                        <span className="skipToggleBtn__track">
                          <span className="skipToggleBtn__thumb" />
                        </span>
                        <span className="skipToggleBtn__label">{pushPrefs.staleListingAlertEnabled ? "Active" : "Desactive"}</span>
                      </button>
                    </div>

                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Seuil annonce invendue</div>
                        <div className="settingsRow__desc">Nombre d'heures avant le rappel sur une annonce active.</div>
                      </div>
                      <div className="settingsRow__control">
                        <input
                          className="settingsSelect"
                          type="number"
                          min={6}
                          max={336}
                          value={pushPrefs.staleListingHours}
                          onChange={(e) =>
                            updatePushPref(
                              "staleListingHours",
                              Math.max(6, Number(e.target.value || 24)),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="settingsRow">
                      <div className="settingsRow__content">
                        <div className="settingsRow__title">Recap quotidien market</div>
                        <div className="settingsRow__desc">Petit point journalier plus engageant sur ton activite et le volume du jour.</div>
                      </div>
                      <button
                        type="button"
                        className={`skipToggleBtn ${pushPrefs.dailyMarketRecapEnabled ? "is-on" : "is-off"}`}
                        onClick={() => updatePushPref("dailyMarketRecapEnabled", !pushPrefs.dailyMarketRecapEnabled)}
                        aria-pressed={pushPrefs.dailyMarketRecapEnabled}
                      >
                        <span className="skipToggleBtn__track">
                          <span className="skipToggleBtn__thumb" />
                        </span>
                        <span className="skipToggleBtn__label">{pushPrefs.dailyMarketRecapEnabled ? "Active" : "Desactive"}</span>
                      </button>
                    </div>

                    {pushPrefsFeedback ? (
                      <div className="settingsReportFeedback settingsReportFeedback--success">
                        {pushPrefsFeedback}
                      </div>
                    ) : null}

                    {pushPrefsError ? (
                      <div className="settingsReportFeedback settingsReportFeedback--error">
                        {pushPrefsError}
                      </div>
                    ) : null}

                    <div className="settingsFooter">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          void savePushPrefs();
                        }}
                        disabled={pushPrefsSaving}
                      >
                        {pushPrefsSaving ? "Enregistrement..." : "Sauvegarder les notifications push"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="settingsReportFeedback settingsReportFeedback--error">
                    {pushPrefsError || "Impossible de charger les notifications push."}
                  </div>
                )}
              </div>

              <div className="settingsSection">
                <div className="settingsSection__head">
                  <div className="settingsSection__title">{SECTION_META.support.title}</div>
                  <div className="settingsSection__desc">{SECTION_META.support.desc}</div>
                </div>

                <div className="settingsSupportCard">
                  <div className="settingsSupportCard__top">
                    <div>
                      <div className="settingsSupportCard__title">Reporter / signaler un problème</div>
                      <div className="settingsSupportCard__desc">
                        Ton nom d'utilisateur et ton email sont récupérés automatiquement depuis ton compte connecté.
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn settingsSupportToggle"
                      onClick={() => setReportOpen((v) => !v)}
                    >
                      {reportOpen ? "Fermer le formulaire" : "Ouvrir le formulaire"}
                    </button>
                  </div>

                  {reportOpen && (
                    <form className="settingsReportForm" onSubmit={handleSubmitReport}>
                      <div className="settingsReportGrid settingsReportGrid--identity">
                        <div className="settingsReportField">
                          <label>Nom d'utilisateur</label>
                          <input type="text" value={currentUsername} readOnly />
                        </div>

                        <div className="settingsReportField">
                          <label>Email</label>
                          <input type="text" value={currentEmail} readOnly />
                        </div>
                      </div>

                      <div className="settingsReportGrid">
                        <div className="settingsReportField">
                          <label>Type de problème</label>
                          <select
                            value={reportCategory}
                            onChange={(e) => setReportCategory(e.target.value as typeof reportCategory)}
                          >
                            {CATEGORY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="settingsReportField">
                          <label>Priorité ressentie</label>
                          <select
                            value={reportPriority}
                            onChange={(e) => setReportPriority(e.target.value as typeof reportPriority)}
                          >
                            {PRIORITY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="settingsReportGrid">
                        <div className="settingsReportField">
                          <label>Page concernée</label>
                          <select value={reportPage} onChange={(e) => setReportPage(e.target.value)}>
                            {PAGE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="settingsReportField">
                          <label>Fonction concernée</label>
                          <select value={reportFeature} onChange={(e) => setReportFeature(e.target.value)}>
                            {FEATURE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="settingsReportField">
                        <label>Description</label>
                        <textarea
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          rows={5}
                          placeholder="Décris clairement le problème rencontré."
                          required
                          minLength={10}
                        />
                      </div>

                      <div className="settingsReportField">
                        <label>Étapes pour reproduire</label>
                        <textarea
                          value={reportSteps}
                          onChange={(e) => setReportSteps(e.target.value)}
                          rows={4}
                          placeholder={`1. Aller sur...
2. Cliquer sur...
3. Observer le problème...`}
                        />
                      </div>

                      <div className="settingsReportField">
                        <label>Capture d’écran optionnelle</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleScreenshotChange}
                        />
                        <div className="small" style={{ opacity: 0.7 }}>
                          Formats acceptés : PNG, JPG, WEBP — max 4 Mo
                        </div>

                        {reportScreenshot ? (
                          <div className="settingsReportAttachment">
                            <span>
                              {reportScreenshot.name} ({(reportScreenshot.size / 1024 / 1024).toFixed(2)} Mo)
                            </span>
                            <button
                              type="button"
                              className="btn settingsAttachmentRemove"
                              onClick={removeScreenshot}
                            >
                              Retirer
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {reportMessage ? (
                        <div className="settingsReportFeedback settingsReportFeedback--success">
                          {reportMessage}
                        </div>
                      ) : null}

                      {reportError ? (
                        <div className="settingsReportFeedback settingsReportFeedback--error">
                          {reportError}
                        </div>
                      ) : null}

                      <div className="settingsReportActions">
                        <button
                          type="submit"
                          className="btn settingsReportSubmit"
                          disabled={reportSubmitting}
                        >
                          {reportSubmitting ? "Envoi..." : "Envoyer le signalement"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="settingsReportsHistory">
                    <div className="settingsReportsHistory__head">
                      <div>
                        <div className="settingsSupportCard__title">Historique de tes signalements</div>
                        <div className="settingsSupportCard__desc">
                          Les signalements corriges et rejetes sont masques par defaut pour garder un affichage plus lisible.
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn settingsSupportToggle"
                        onClick={() => loadBugReports(historyPagination.page, reportStatusFilter)}
                        disabled={historyLoading}
                      >
                        {historyLoading ? "Actualisation..." : "Actualiser"}
                      </button>
                    </div>

                    <div className="settingsPlayerFiltersBar">
                      <label className="settingsReportField">
                        <label>Filtrer par statut</label>
                        <select
                          value={reportStatusFilter}
                          onChange={(e) => handlePlayerStatusFilterChange(e.target.value)}
                        >
                          <option value="">Actifs et utiles</option>
                          <option value="open">Ouvert</option>
                          <option value="investigating">En analyse</option>
                          <option value="planned">Planifié</option>
                          <option value="closed">Clos</option>
                          <option value="fixed">Corrigé</option>
                          <option value="rejected">Rejeté</option>
                        </select>
                      </label>
                    </div>

                    {historyError ? (
                      <div className="settingsReportFeedback settingsReportFeedback--error">
                        {historyError}
                      </div>
                    ) : null}

                    {!historyLoading && reportHistory.length === 0 ? (
                      <div className="settingsReportsEmpty">
                        Aucun signalement pour ce filtre.
                      </div>
                    ) : null}

                    <div className="settingsReportsList">
                      {reportHistory.map((item) => {
                        const isExpanded = expandedReportId === item.id;
                        return (
                          <div className="settingsTicketCard" key={item.id}>
                            <button
                              type="button"
                              className="settingsTicketCard__top"
                              onClick={() =>
                                setExpandedReportId((prev) => (prev === item.id ? null : item.id))
                              }
                            >
                              <div className="settingsTicketCard__main">
                                <div className="settingsTicketCard__line1">
                                  <span className="settingsTicketCard__id">Ticket #{item.id}</span>
                                  <span className={`settingsStatusBadge is-${item.status}`}>
                                    {STATUS_LABELS[item.status]}
                                  </span>
                                  <span className={`settingsPriorityBadge is-${item.priority}`}>
                                    {item.priority}
                                  </span>
                                </div>

                                <div className="settingsTicketCard__line2">
                                  {item.page} · {item.feature} · envoyé le {formatDate(item.createdAt)}
                                </div>
                              </div>

                              <span className="settingsTicketCard__toggle">
                                {isExpanded ? "−" : "+"}
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="settingsTicketCard__body">
                                <div className="settingsTicketMetaGrid">
                                  <div>
                                    <b>Catégorie :</b> {item.category}
                                  </div>
                                  <div>
                                    <b>Priorité :</b> {item.priority}
                                  </div>
                                  <div>
                                    <b>Pris en charge :</b> {formatDate(item.treatedAt)}
                                  </div>
                                  <div>
                                    <b>Corrigé :</b> {formatDate(item.fixedAt)}
                                  </div>
                                  <div>
                                    <b>Clos :</b> {formatDate(item.closedAt)}
                                  </div>
                                  <div>
                                    <b>Dernière mise à jour :</b> {formatDate(item.updatedAt)}
                                  </div>
                                </div>

                                <div className="settingsTicketBlock">
                                  <div className="settingsTicketBlock__title">Description</div>
                                  <div className="settingsTicketBlock__content">{item.description}</div>
                                </div>

                                {item.reproductionSteps ? (
                                  <div className="settingsTicketBlock">
                                    <div className="settingsTicketBlock__title">Étapes pour reproduire</div>
                                    <div className="settingsTicketBlock__content settingsTicketBlock__content--pre">
                                      {item.reproductionSteps}
                                    </div>
                                  </div>
                                ) : null}

                                {item.resolutionNote ? (
                                  <div className="settingsTicketBlock">
                                    <div className="settingsTicketBlock__title">Note de traitement</div>
                                    <div className="settingsTicketBlock__content">{item.resolutionNote}</div>
                                  </div>
                                ) : null}

                                {item.screenshotUrl ? (
                                  <div className="settingsTicketBlock">
                                    <div className="settingsTicketBlock__title">Capture</div>
                                    <a
                                      href={toAbsoluteAssetUrl(item.screenshotUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="settingsTicketScreenshotLink"
                                    >
                                      Voir la capture
                                    </a>
                                  </div>
                                ) : null}

                                <div className="settingsTicketBlock">
                                  <div className="settingsTicketBlock__title">Historique du ticket</div>
                                  <div className="settingsTimeline">
                                    {item.histories.map((history) => (
                                      <div className="settingsTimelineItem" key={history.id}>
                                        <div className="settingsTimelineItem__dot" />
                                        <div className="settingsTimelineItem__content">
                                          <div className="settingsTimelineItem__top">
                                            <span className={`settingsStatusBadge is-${history.toStatus}`}>
                                              {STATUS_LABELS[history.toStatus as BugReportStatus]}
                                            </span>
                                            <span className="settingsTimelineItem__date">
                                              {formatDate(history.changedAt)}
                                            </span>
                                          </div>
                                          <div className="settingsTimelineItem__by">
                                            par {history.changedBy}
                                          </div>
                                          {history.note ? (
                                            <div className="settingsTimelineItem__note">{history.note}</div>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="settingsPlayerPagination">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => goToHistoryPage(Math.max(1, historyPagination.page - 1))}
                        disabled={historyLoading || historyPagination.page <= 1}
                      >
                        Précédent
                      </button>

                      <div className="settingsPlayerPagination__info">
                        Page <b>{historyPagination.page}</b> / <b>{historyPagination.totalPages}</b>
                      </div>

                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          goToHistoryPage(
                            Math.min(historyPagination.totalPages, historyPagination.page + 1),
                          )
                        }
                        disabled={
                          historyLoading ||
                          historyPagination.page >= historyPagination.totalPages
                        }
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settingsFooter">
              <button type="button" className="btn" onClick={resetAll}>
                Réinitialiser les paramètres
              </button>
            </div>

            <div className="settingsDangerZone">
              <div className="settingsDangerZone__title">Compte</div>
              <div className="settingsDangerZone__desc">
                Gere ton profil public, ton avatar et tes badges, ou deconnecte-toi de l'application sur cet appareil.
              </div>

              <Link to="/profile" className="btn settingsProfileBtn">
                Voir mon profil
              </Link>

              <button
                type="button"
                className="btn settingsLogoutBtn"
                onClick={handleLogout}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
