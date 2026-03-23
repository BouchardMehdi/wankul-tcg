import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles.css";
import "../styles/Menu.css";
import "../styles/Settings.css";

import AppNavbar from "../components/AppNavbar";

import {
  APP_SETTINGS_DEFAULTS,
  readAppSettings,
  subscribeAppSettings,
  writeAppSettings,
  type AppSettings,
} from "../utils/appSettings";
import { useAuth } from "../auth/AuthContext";
import {
  getMyBugReports,
  reportBug,
  type BugReportListItem,
  type BugReportStatus,
} from "../api/auth";

type SelectSettingKey = "collectionLayout";
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
    key: "skipOpeningAnimations",
    title: "Skip animations",
    desc: "Passe directement aux cartes ou au résumé pendant les openings.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "autoFlipCards",
    title: "Auto flip cards",
    desc: "Fait défiler automatiquement les cartes révélées une par une.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "fastReveal",
    title: "Fast reveal",
    desc: "Accélère les timings d'ouverture et les enchaînements des cartes.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "disableHoloEffects",
    title: "Disable holo effects",
    desc: "Désactive les effets holo et une partie des effets visuels lourds.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "showDuplicatesCounter",
    title: "Show duplicates counter",
    desc: "Affiche le compteur x2, x3, x4… sur les cartes possédées plusieurs fois.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "collectionLayout",
    title: "Collection layout",
    desc: "Choisis la disposition de la grille de collection selon ton écran et ta préférence.",
    kind: "select",
    section: "general",
  },
  {
    key: "hideMissingCards",
    title: "Hide missing cards",
    desc: "Masque les cartes non débloquées dans la collection.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "autoHighlightNewCards",
    title: "Auto highlight new cards",
    desc: "Met en avant dans la collection les nouvelles cartes obtenues lors de la dernière ouverture.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "showDropRates",
    title: "Show drop rates",
    desc: "Affiche la distribution du butin et les pourcentages sur le dashboard.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "confirmPurchases",
    title: "Confirm purchases",
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
    desc: "Préférences globales de l'app, de la collection et des openings.",
  },
  market: {
    title: "Market",
    desc: "Paramètres de sécurité et de comportement pour les achats et ventes.",
  },
  support: {
    title: "Support",
    desc: "Signale un bug, un problème visuel ou un comportement anormal rencontré dans l'application.",
  },
} as const;

const PAGE_OPTIONS = [
  "Home",
  "Login",
  "Register",
  "Menu",
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

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  useEffect(() => {
    loadBugReports().catch(() => {});
  }, []);

  const enabledCount = useMemo(
    () =>
      Object.entries(settings).filter(([key, value]) => {
        if (key === "collectionLayout" || key === "compactCollectionGrid") return false;
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

  async function loadBugReports() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await getMyBugReports();
      setReportHistory(res.items ?? []);
      if ((res.items ?? []).length > 0 && expandedReportId == null) {
        setExpandedReportId(res.items[0].id);
      }
    } catch (err: any) {
      setHistoryError(err?.message || "Impossible de charger l'historique.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function toggle(key: ToggleSettingKey) {
    const next = !settings[key];
    const merged = { ...settings, [key]: next };
    setSettings(merged);
    writeAppSettings({ [key]: next });
  }

  function updateCollectionLayout(value: AppSettings["collectionLayout"]) {
    const merged = { ...settings, collectionLayout: value };
    setSettings(merged);
    writeAppSettings({ collectionLayout: value });
  }

  function resetAll() {
    setSettings(APP_SETTINGS_DEFAULTS);
    writeAppSettings(APP_SETTINGS_DEFAULTS);
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
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

      await loadBugReports();
    } catch (err: any) {
      setReportError(err?.message || "Impossible d'envoyer le signalement.");
    } finally {
      setReportSubmitting(false);
    }
  }

  function renderRow(row: SettingRow) {
    if (row.kind === "select") {
      return (
        <div className="settingsRow" key={row.key}>
          <div className="settingsRow__content">
            <div className="settingsRow__title">{row.title}</div>
            <div className="settingsRow__desc">{row.desc}</div>
          </div>

          <div className="settingsRow__control">
            <select
              className="settingsSelect"
              value={settings.collectionLayout}
              onChange={(e) =>
                updateCollectionLayout(e.target.value as AppSettings["collectionLayout"])
              }
            >
              <option value="standard">Standard — 5 colonnes</option>
              <option value="compact">Compact — 6 colonnes</option>
              <option value="large">Large — 4 colonnes</option>
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
          onClick={() => toggle(row.key)}
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
                <p className="small">Préférences locales de l'application.</p>
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
                          Tu peux suivre ici l’état de traitement de tes tickets.
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn settingsSupportToggle"
                        onClick={() => loadBugReports()}
                        disabled={historyLoading}
                      >
                        {historyLoading ? "Actualisation..." : "Actualiser"}
                      </button>
                    </div>

                    {historyError ? (
                      <div className="settingsReportFeedback settingsReportFeedback--error">
                        {historyError}
                      </div>
                    ) : null}

                    {!historyLoading && reportHistory.length === 0 ? (
                      <div className="settingsReportsEmpty">
                        Aucun signalement pour le moment.
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
                Déconnecte-toi de l'application sur cet appareil.
              </div>

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