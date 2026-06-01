import { useEffect, useMemo, useState } from "react";
import AppNavbar from "../components/AppNavbar";
import CurrencyAmount, { CurrencyIcon, formatCurrencyText } from "../components/CurrencyAmount";
import "../styles.css";
import "../styles/Dashboard.css";
import "../styles/Admin.css";
import { useAuth } from "../auth/AuthContext";
import {
  adminLogin,
  getAdminTickets,
  updateAdminTicketStatus,
  getAdminEconomyOverview,
  getAdminEconomyLogs,
  getAdminSeasonCardsOverview,
  downloadAdminEconomyExport,
  adminCancelMarketTransaction,
  adminDisableMarketListing,
  adminAdjustMarketListingPrice,
  adminRefundPlayer,
  adminRemoveBuggedReward,
  downloadAdminBackupExport,
  type AdminTicketsResponse,
  type BugReportListItem,
  type BugReportStatus,
  type AdminEconomyOverviewResponse,
  type AdminEconomyLogsResponse,
  type AdminBackupScope,
  type AdminSeasonCardsResponse,
} from "../api/auth";

const STATUS_LABELS: Record<BugReportStatus, string> = {
  open: "Ouvert",
  investigating: "En analyse",
  planned: "Planifié",
  fixed: "Corrigé",
  closed: "Clos",
  rejected: "Rejeté",
};

type AdminTab = "dashboard" | "reports";
type AdminCorrectionKind =
  | "cancelTransaction"
  | "disableListing"
  | "adjustPrice"
  | "refundPlayer"
  | "removeReward";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR");
}

function formatDay(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
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

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("fr-FR").format(Number(value ?? 0));
}

function formatSignedNumber(value?: number | null) {
  const num = Number(value ?? 0);
  return `${num > 0 ? "+" : ""}${formatNumber(num)}`;
}

function formatPercent(value?: number | null, signed = true) {
  const num = Number(value ?? 0);
  return `${signed && num > 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(num)}%`;
}

function clampPercent(value: number) {
  return Math.max(4, Math.min(100, value));
}

function getRiskLabel(level?: string) {
  if (level === "danger") return "Critique";
  if (level === "watch") return "A surveiller";
  return "Stable";
}

const ECONOMY_ACTION_OPTIONS = [
  { value: "OPEN_BOOSTER", label: "Opening booster" },
  { value: "OPEN_DISPLAY", label: "Opening display" },
  { value: "QUICK_SELL", label: "Quick sell" },
  { value: "MARKET_LISTING_CREATE", label: "Création annonce" },
  { value: "MARKET_LISTING_CANCEL", label: "Annulation annonce" },
  { value: "MARKET_BUY", label: "Achat market" },
  { value: "MARKET_SALE", label: "Vente market" },
  { value: "MARKET_REWARD_CLAIM", label: "Récompense récupérée" },
  { value: "BADGE_REWARD", label: "Récompense badge" },
  { value: "SIGNUP_BONUS", label: "Bonus bienvenue" },
  { value: "ECONOMY_CREDITS_ADD", label: "Ajout de WunkulCoins" },
  { value: "ECONOMY_FREE_BOOSTER_ADD", label: "Ajout booster gratuit" },
  { value: "ECONOMY_RESET", label: "Reset économie" },
  { value: "ECONOMY_ROLLBACK", label: "Rollback économie" },
  { value: "ADMIN_TRANSACTION_CANCEL", label: "Admin annulation transaction" },
  { value: "ADMIN_LISTING_DISABLE", label: "Admin désactivation annonce" },
  { value: "ADMIN_LISTING_PRICE_ADJUST", label: "Admin ajustement prix" },
  { value: "ADMIN_PLAYER_REFUND", label: "Admin remboursement joueur" },
  { value: "ADMIN_REWARD_REMOVE", label: "Admin retrait récompense" },
  { value: "ANTI_ABUSE_OPENING_SPIKE", label: "Alerte pic d'openings" },
  { value: "ANTI_ABUSE_PAIR_TRADING", label: "Alerte comptes liés" },
  { value: "ANTI_ABUSE_PRICE_OUTLIER", label: "Alerte prix anormal" },
  { value: "ANTI_ABUSE_FAST_ENRICHMENT", label: "Alerte enrichissement rapide" },
];

function getSecurityActionLabel(action?: string) {
  const option = ECONOMY_ACTION_OPTIONS.find((item) => item.value === action);
  if (option) return option.label;

  switch (action) {
    case "OPEN_BOOSTER":
      return "Opening booster";
    case "OPEN_DISPLAY":
      return "Opening display";
    case "QUICK_SELL":
      return "Quick sell";
    case "MARKET_LISTING_CREATE":
      return "Création annonce";
    case "MARKET_LISTING_CANCEL":
      return "Annulation annonce";
    case "MARKET_BUY":
      return "Achat market";
    case "MARKET_REWARD_CLAIM":
      return "Claim vente";
    default:
      return action || "Action";
  }
}

function getSecurityStatusLabel(status?: string) {
  if (status === "blocked") return "Bloqué";
  if (status === "flagged") return "Signalé";
  return "OK";
}

function getSeverityLabel(severity?: string) {
  if (severity === "danger") return "Critique";
  if (severity === "watch") return "À surveiller";
  return "Info";
}

function formatLogActor(event: AdminEconomyLogsResponse["items"][number]) {
  if (!event.userId) return "Système";
  return `${event.username ?? "User"} #${event.userId}`;
}

function formatRelatedActor(event: AdminEconomyLogsResponse["items"][number]) {
  if (!event.relatedUserId) return null;
  return `${event.relatedUsername ?? "User"} #${event.relatedUserId}`;
}

function getLogHint(event: AdminEconomyLogsResponse["items"][number]) {
  const metadata = event.metadata ?? {};
  const parts: string[] = [];

  if (metadata.season) parts.push(String(metadata.season));
  if (metadata.quantity) parts.push(`${metadata.quantity} carte(s)`);
  if (metadata.cardName && !event.cardName) parts.push(String(metadata.cardName));
  if (metadata.badgeCode) parts.push(`Badge ${metadata.badgeCode}`);
  if (metadata.rewardType) parts.push(String(metadata.rewardType));
  if (metadata.listingId) parts.push(`Annonce #${metadata.listingId}`);
  if (metadata.transactionId) parts.push(`Transaction #${metadata.transactionId}`);

  return parts.join(" · ");
}

const PAGE_SIZE = 5;
const BACKUP_EXPORT_OPTIONS: Array<{ scope: AdminBackupScope; label: string; description: string }> = [
  { scope: "all", label: "Backup complet", description: "Tout regrouper dans un seul export." },
  { scope: "logs", label: "Logs économiques", description: "Journal admin, alertes et corrections." },
  { scope: "sales", label: "Ventes", description: "Transactions market et récompenses." },
  { scope: "users", label: "Joueurs", description: "Comptes sans secrets + soldes." },
  { scope: "collections", label: "Collections", description: "Cartes possédées et copies verrouillées." },
  { scope: "openings", label: "Openings", description: "Boosters, displays et résultats." },
];

export default function Admin() {
  const { role, isAdminAuthenticated, setAdminToken, clearAdminSession, me, user } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tickets, setTickets] = useState<BugReportListItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, BugReportStatus>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [adminFilter, setAdminFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [adminUsers, setAdminUsers] = useState<string[]>([]);
  const [pagination, setPagination] = useState<AdminTicketsResponse["pagination"]>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [ecoDays, setEcoDays] = useState(7);
  const [ecoLoading, setEcoLoading] = useState(false);
  const [ecoError, setEcoError] = useState("");
  const [ecoOverview, setEcoOverview] = useState<AdminEconomyOverviewResponse | null>(null);
  const [ecoLogs, setEcoLogs] = useState<AdminEconomyLogsResponse | null>(null);
  const [ecoLogsLoading, setEcoLogsLoading] = useState(false);
  const [ecoLogsError, setEcoLogsError] = useState("");
  const [ecoLogsPage, setEcoLogsPage] = useState(1);
  const [ecoLogAction, setEcoLogAction] = useState("");
  const [ecoLogStatus, setEcoLogStatus] = useState("");
  const [ecoLogSeverity, setEcoLogSeverity] = useState("");
  const [ecoLogUserId, setEcoLogUserId] = useState("");
  const [ecoLogCardId, setEcoLogCardId] = useState("");
  const [ecoLogFrom, setEcoLogFrom] = useState("");
  const [ecoLogTo, setEcoLogTo] = useState("");
  const [ecoExporting, setEcoExporting] = useState<"json" | "csv" | null>(null);
  const [backupExporting, setBackupExporting] = useState<string | null>(null);
  const [seasonCards, setSeasonCards] = useState<AdminSeasonCardsResponse | null>(null);
  const [seasonCardsLoading, setSeasonCardsLoading] = useState(false);
  const [seasonCardsError, setSeasonCardsError] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [seasonRarityFilter, setSeasonRarityFilter] = useState("all");
  const [seasonObtainableFilter, setSeasonObtainableFilter] = useState("all");
  const [seasonImageFilter, setSeasonImageFilter] = useState("all");
  const [correctionLoading, setCorrectionLoading] = useState<AdminCorrectionKind | null>(null);
  const [correctionError, setCorrectionError] = useState("");
  const [correctionSuccess, setCorrectionSuccess] = useState("");
  const [cancelTransactionForm, setCancelTransactionForm] = useState({
    transactionId: "",
    reason: "",
  });
  const [disableListingForm, setDisableListingForm] = useState({
    listingId: "",
    reason: "",
  });
  const [adjustPriceForm, setAdjustPriceForm] = useState({
    listingId: "",
    priceCredits: "",
    reason: "",
  });
  const [refundPlayerForm, setRefundPlayerForm] = useState({
    userId: "",
    amount: "",
    reason: "",
  });
  const [removeRewardForm, setRemoveRewardForm] = useState({
    userId: "",
    credits: "",
    cardId: "",
    cardQuantity: "",
    reason: "",
  });

  const currentAdminUsername = user?.username ?? me?.username ?? "";
  const canAccess = role === "admin";

  async function loadTickets(nextPage = page, nextStatus = statusFilter, nextAdmin = adminFilter) {
    setTicketsLoading(true);
    setTicketsError("");
    try {
      const handledBy = nextAdmin === "__me__" ? currentAdminUsername : nextAdmin;

      const res = await getAdminTickets({
        status: nextStatus || undefined,
        handledBy: handledBy || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setTickets(res.items ?? []);
      setAdminUsers(res.adminUsers ?? []);
      setPagination(
        res.pagination ?? {
          page: 1,
          pageSize: PAGE_SIZE,
          total: 0,
          totalPages: 1,
        }
      );

      setExpandedId(null);
    } catch (err: any) {
      setTicketsError(err?.message || "Impossible de charger les tickets.");
    } finally {
      setTicketsLoading(false);
    }
  }

  async function loadEconomyOverview(nextDays = ecoDays) {
    setEcoLoading(true);
    setEcoError("");

    try {
      const res = await getAdminEconomyOverview(nextDays);
      setEcoOverview(res);
    } catch (err: any) {
      setEcoError(err?.message || "Impossible de charger les statistiques économiques.");
    } finally {
      setEcoLoading(false);
    }
  }

  async function loadSeasonCardsOverview() {
    setSeasonCardsLoading(true);
    setSeasonCardsError("");

    try {
      const res = await getAdminSeasonCardsOverview();
      setSeasonCards(res);
    } catch (err: any) {
      setSeasonCardsError(err?.message || "Impossible de charger la gestion des saisons.");
    } finally {
      setSeasonCardsLoading(false);
    }
  }

  async function loadEconomyLogs(
    nextPage = ecoLogsPage,
    nextDays = ecoDays,
    overrides?: Partial<{
      action: string;
      status: string;
      severity: string;
      userId: string;
      cardId: string;
      from: string;
      to: string;
    }>,
  ) {
    setEcoLogsLoading(true);
    setEcoLogsError("");

    try {
      const action = overrides?.action ?? ecoLogAction;
      const status = overrides?.status ?? ecoLogStatus;
      const severity = overrides?.severity ?? ecoLogSeverity;
      const userId = overrides?.userId ?? ecoLogUserId;
      const cardId = overrides?.cardId ?? ecoLogCardId;
      const from = overrides?.from ?? ecoLogFrom;
      const to = overrides?.to ?? ecoLogTo;

      const res = await getAdminEconomyLogs({
        days: nextDays,
        from: from || undefined,
        to: to || undefined,
        page: nextPage,
        pageSize: 25,
        action: action || undefined,
        status: status || undefined,
        severity: severity || undefined,
        userId: userId ? Number(userId) : undefined,
        cardId: cardId ? Number(cardId) : undefined,
      });
      setEcoLogs(res);
    } catch (err: any) {
      setEcoLogsError(err?.message || "Impossible de charger les logs économie.");
    } finally {
      setEcoLogsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    loadEconomyOverview(ecoDays).catch(() => {});
    loadSeasonCardsOverview().catch(() => {});
    setEcoLogsPage(1);
    loadEconomyLogs(1, ecoDays).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAuthenticated, ecoDays]);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    if (activeTab !== "dashboard") return;
    loadEconomyLogs(ecoLogsPage, ecoDays).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAuthenticated, activeTab, ecoLogsPage]);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    if (activeTab !== "reports") return;
    loadTickets(page, statusFilter, adminFilter).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAuthenticated, page, activeTab]);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    if (activeTab !== "reports") return;
    setPage(1);
    loadTickets(1, statusFilter, adminFilter).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, adminFilter, isAdminAuthenticated, activeTab]);

  const groupedCounts = useMemo(() => {
    return tickets.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [tickets]);

  const ecoRows = ecoOverview?.rows ?? [];
  const ecoTotals = ecoOverview?.totals ?? {
    creditsSpent: 0,
    creditsEarned: 0,
  };
  const advanced = ecoOverview?.advanced ?? null;
  const health = advanced?.health ?? null;
  const ecoInflation = ecoOverview?.inflation ?? 0;

  const maxChartValue = useMemo(() => {
    const values = ecoRows.flatMap((row) => [
      Number(row.creditsSpent ?? 0),
      Number(row.creditsEarnedOpening ?? 0) + Number(row.creditsEarnedQuickSell ?? 0),
      Number(row.marketVolume ?? 0),
    ]);
    return Math.max(1, ...values);
  }, [ecoRows]);

  const totalBoostersOpened = useMemo(
    () => ecoRows.reduce((sum, row) => sum + Number(row.boostersOpened ?? 0), 0),
    [ecoRows]
  );

  const totalDisplaysOpened = useMemo(
    () => ecoRows.reduce((sum, row) => sum + Number(row.displaysOpened ?? 0), 0),
    [ecoRows]
  );

  const totalQuickSellEarned = useMemo(
    () => ecoRows.reduce((sum, row) => sum + Number(row.creditsEarnedQuickSell ?? 0), 0),
    [ecoRows]
  );

  const totalOpeningEarned = useMemo(
    () => ecoRows.reduce((sum, row) => sum + Number(row.creditsEarnedOpening ?? 0), 0),
    [ecoRows]
  );

  const totalMarketVolume = useMemo(
    () => ecoRows.reduce((sum, row) => sum + Number(row.marketVolume ?? 0), 0),
    [ecoRows]
  );

  const averageOpeningValue =
    totalBoostersOpened + totalDisplaysOpened > 0
      ? Math.round(totalOpeningEarned / (totalBoostersOpened + totalDisplaysOpened))
      : 0;
  const averageBoosterNet = totalBoostersOpened > 0 ? Math.round(totalOpeningEarned / totalBoostersOpened) : 0;
  const averageDisplayNet = totalDisplaysOpened > 0 ? Math.round(totalOpeningEarned / totalDisplaysOpened) : 0;
  const creditsCreated = health?.creditsCreated ?? ecoTotals.creditsEarned;
  const creditsDestroyed = health?.creditsDestroyed ?? ecoTotals.creditsSpent;
  const quickSellToMarketPercent = health?.quickSellToMarketPercent ?? 0;
  const quickSellShareOfCreatedPercent = health?.quickSellShareOfCreatedPercent ?? 0;
  const openingShareOfCreatedPercent = health?.openingShareOfCreatedPercent ?? 0;
  const riskScore = health?.riskScore ?? 0;
  const riskLevel = health?.riskLevel ?? "ok";
  const rarityProfitability = advanced?.rarityProfitability ?? [];
  const manipulatedCards = advanced?.manipulatedCards ?? [];
  const topManipulatedCards = manipulatedCards.slice(0, 4);
  const topProfitableRarities = rarityProfitability.slice(0, 4);
  const suspiciousUsers = advanced?.suspiciousUsers ?? [];
  const security = ecoOverview?.security ?? null;
  const securityTotals = security?.totals ?? {
    allowed: 0,
    flagged: 0,
    blocked: 0,
    danger: 0,
  };
  const antiAbuseAlerts = security?.alerts ?? [];
  const recentSecurityEvents = ecoLogs?.items ?? security?.recentEvents ?? [];
  const ecoLogsPagination = ecoLogs?.pagination ?? {
    page: ecoLogsPage,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  };
  const seasonItems = seasonCards?.items ?? [];
  const filteredSeasonItems = useMemo(() => {
    return seasonItems.filter((item) => {
      if (seasonFilter !== "all" && item.seasonGroupKey !== seasonFilter) return false;
      if (seasonRarityFilter !== "all" && item.rarity !== seasonRarityFilter) return false;
      if (seasonObtainableFilter === "obtainable" && !item.obtainable) return false;
      if (seasonObtainableFilter === "not_obtainable" && item.obtainable) return false;
      if (seasonObtainableFilter === "booster" && !item.boosterAvailable) return false;
      if (seasonImageFilter === "missing" && item.imageExists) return false;
      if (seasonImageFilter === "ok" && !item.imageExists) return false;
      return true;
    });
  }, [
    seasonItems,
    seasonFilter,
    seasonRarityFilter,
    seasonObtainableFilter,
    seasonImageFilter,
  ]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await adminLogin(adminPassword);
      setAdminToken(res.admin_access_token);
      setAdminPassword("");
    } catch (err: any) {
      setLoginError(err?.message || "Mot de passe admin invalide.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSaveStatus(ticket: BugReportListItem) {
    const nextStatus = statusDrafts[ticket.id] ?? ticket.status;
    const note = noteDrafts[ticket.id] ?? "";

    setSavingId(ticket.id);
    try {
      const res = await updateAdminTicketStatus(ticket.id, nextStatus, note);
      setTickets((prev) => prev.map((item) => (item.id === ticket.id ? res.item : item)));
    } catch (err: any) {
      setTicketsError(err?.message || "Impossible de mettre à jour le ticket.");
    } finally {
      setSavingId(null);
    }
  }

  function resetFilters() {
    setStatusFilter("");
    setAdminFilter("");
    setPage(1);
  }

  function goToPage(nextPage: number) {
    setPage(nextPage);
  }

  function applyEconomyLogFilters() {
    setEcoLogsPage(1);
    loadEconomyLogs(1, ecoDays).catch(() => {});
  }

  function resetEconomyLogFilters() {
    const emptyFilters = {
      action: "",
      status: "",
      severity: "",
      userId: "",
      cardId: "",
      from: "",
      to: "",
    };

    setEcoLogAction("");
    setEcoLogStatus("");
    setEcoLogSeverity("");
    setEcoLogUserId("");
    setEcoLogCardId("");
    setEcoLogFrom("");
    setEcoLogTo("");
    setEcoLogsPage(1);
    loadEconomyLogs(1, ecoDays, emptyFilters).catch(() => {});
  }

  function resetSeasonFilters() {
    setSeasonFilter("all");
    setSeasonRarityFilter("all");
    setSeasonObtainableFilter("all");
    setSeasonImageFilter("all");
  }

  async function handleEconomyExport(format: "json" | "csv") {
    setEcoExporting(format);
    setEcoError("");

    try {
      const { blob, filename } = await downloadAdminEconomyExport(ecoDays, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setEcoError(err?.message || "Export économie impossible.");
    } finally {
      setEcoExporting(null);
    }
  }

  async function handleBackupExport(scope: AdminBackupScope, format: "json" | "csv") {
    const key = `${scope}-${format}`;
    setBackupExporting(key);
    setEcoError("");

    try {
      const { blob, filename } = await downloadAdminBackupExport(scope, ecoDays, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setEcoError(err?.message || "Export backup impossible.");
    } finally {
      setBackupExporting(null);
    }
  }

  async function refreshEconomyAfterCorrection() {
    await Promise.all([
      loadEconomyOverview(ecoDays),
      loadEconomyLogs(ecoLogsPage, ecoDays),
    ]);
  }

  async function handleCorrection(kind: AdminCorrectionKind) {
    setCorrectionError("");
    setCorrectionSuccess("");

    const labels: Record<AdminCorrectionKind, string> = {
      cancelTransaction: "annuler cette transaction",
      disableListing: "désactiver cette annonce",
      adjustPrice: "ajuster ce prix",
      refundPlayer: "rembourser ce joueur",
      removeReward: "retirer cette récompense",
    };

    if (!window.confirm(`Confirmer: ${labels[kind]} ? Cette action sera journalisée.`)) {
      return;
    }

    setCorrectionLoading(kind);

    try {
      let res: { message?: string } | null = null;

      if (kind === "cancelTransaction") {
        res = await adminCancelMarketTransaction({
          transactionId: Number(cancelTransactionForm.transactionId),
          reason: cancelTransactionForm.reason,
        });
        setCancelTransactionForm({ transactionId: "", reason: "" });
      }

      if (kind === "disableListing") {
        res = await adminDisableMarketListing(
          Number(disableListingForm.listingId),
          disableListingForm.reason
        );
        setDisableListingForm({ listingId: "", reason: "" });
      }

      if (kind === "adjustPrice") {
        res = await adminAdjustMarketListingPrice(
          Number(adjustPriceForm.listingId),
          Number(adjustPriceForm.priceCredits),
          adjustPriceForm.reason
        );
        setAdjustPriceForm({ listingId: "", priceCredits: "", reason: "" });
      }

      if (kind === "refundPlayer") {
        res = await adminRefundPlayer({
          userId: Number(refundPlayerForm.userId),
          amount: Number(refundPlayerForm.amount),
          reason: refundPlayerForm.reason,
        });
        setRefundPlayerForm({ userId: "", amount: "", reason: "" });
      }

      if (kind === "removeReward") {
        res = await adminRemoveBuggedReward({
          userId: Number(removeRewardForm.userId),
          credits: removeRewardForm.credits ? Number(removeRewardForm.credits) : undefined,
          cardId: removeRewardForm.cardId ? Number(removeRewardForm.cardId) : undefined,
          cardQuantity: removeRewardForm.cardQuantity
            ? Number(removeRewardForm.cardQuantity)
            : undefined,
          reason: removeRewardForm.reason,
        });
        setRemoveRewardForm({
          userId: "",
          credits: "",
          cardId: "",
          cardQuantity: "",
          reason: "",
        });
      }

      setCorrectionSuccess(res?.message || "Correction appliquée.");
      await refreshEconomyAfterCorrection();
    } catch (err: any) {
      setCorrectionError(err?.message || "Correction admin impossible.");
    } finally {
      setCorrectionLoading(null);
    }
  }

  function renderSecurityEvent(event: AdminEconomyLogsResponse["items"][number]) {
    return (
      <article className={`adminSecurityEvent is-${event.severity}`} key={event.id}>
        <div className="adminSecurityEvent__top">
          <div>
            <strong>{getSecurityActionLabel(event.action)}</strong>
            <span>
              {getSecurityStatusLabel(event.status)} · {getSeverityLabel(event.severity)}
            </span>
          </div>
          <time>{formatDate(event.createdAt)}</time>
        </div>

        <div className="adminSecurityEvent__meta">
          <span>Joueur : {formatLogActor(event)}</span>
          {formatRelatedActor(event) ? <span>Lié : {formatRelatedActor(event)}</span> : null}
          {event.cardId ? (
            <span>
              Carte : {event.cardName ?? "Carte"} #{event.cardId}
              {event.cardRarity ? ` · ${event.cardRarity}` : ""}
            </span>
          ) : null}
          {event.valueCredits ? (
            <span className="adminSecurityEvent__coinValue">
              Valeur : {formatCurrencyText(event.valueCredits)} <CurrencyIcon className="adminSecurityEvent__coinIcon" />
            </span>
          ) : null}
          {event.targetType ? (
            <span>
              Cible : {event.targetType}
              {event.targetId ? ` #${event.targetId}` : ""}
            </span>
          ) : null}
        </div>

        {getLogHint(event) ? <p>{getLogHint(event)}</p> : null}
        {event.reason ? <p>{event.reason}</p> : null}
        {event.metadata ? (
          <details className="adminSecurityEvent__details">
            <summary>Détails</summary>
            <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
          </details>
        ) : null}
      </article>
    );
  }

  if (!canAccess) {
    return (
      <div className="app-shell">
        <AppNavbar currentPage="admin" />
        <section className="container adminPage">
          <div className="panel adminPanel">
            <div className="panel-inner">
              <h2>Administration</h2>
              <p className="small">Accès réservé aux comptes admin.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="app-shell">
        <AppNavbar currentPage="admin" />
        <section className="container adminPage">
          <div className="panel adminPanel adminUnlockPanel">
            <div className="panel-inner">
              <h2>Déverrouillage administration</h2>
              <p className="small">
                Entre ton mot de passe admin secondaire pour obtenir une session admin courte.
              </p>

              <form className="adminUnlockForm" onSubmit={handleAdminLogin}>
                <label className="adminField">
                  <span>Mot de passe admin</span>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="current-password"
                  />
                </label>

                {loginError ? <div className="adminError">{loginError}</div> : null}

                <button type="submit" className="btn adminPrimaryBtn" disabled={loginLoading}>
                  {loginLoading ? "Connexion..." : "Entrer en mode admin"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppNavbar currentPage="admin" />

      <section className="container adminPage">
        <div className="panel adminPanel">
          <div className="panel-inner">
            <div className="adminHeader">
              <div>
                <h2>Administration</h2>
                <p className="small">
                  Suivi économie + gestion des signalements dans une seule console admin.
                </p>
              </div>

              <div className="adminHeaderActions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (activeTab === "dashboard") {
                      loadEconomyOverview(ecoDays).catch(() => {});
                      loadSeasonCardsOverview().catch(() => {});
                    } else {
                      loadTickets(page, statusFilter, adminFilter).catch(() => {});
                    }
                  }}
                >
                  Actualiser
                </button>
                <button type="button" className="btn adminDangerBtn" onClick={clearAdminSession}>
                  Quitter le mode admin
                </button>
              </div>
            </div>

            <div className="adminTabs">
              <button
                type="button"
                className={`adminTabBtn ${activeTab === "dashboard" ? "is-active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                Suivi économie
              </button>
              <button
                type="button"
                className={`adminTabBtn ${activeTab === "reports" ? "is-active" : ""}`}
                onClick={() => setActiveTab("reports")}
              >
                Signalements
              </button>
            </div>

            {activeTab === "dashboard" ? (
              <div className="adminDashboard">
                <div className="adminToolbar">
                  <div className="adminToolbar__left">
                    <label className="adminField adminField--compact">
                      <span>Période</span>
                      <select
                        value={ecoDays}
                        onChange={(e) => setEcoDays(Number(e.target.value) || 7)}
                      >
                        <option value={7}>7 jours</option>
                        <option value={14}>14 jours</option>
                        <option value={30}>30 jours</option>
                      </select>
                    </label>
                  </div>

                  <div className="adminHeaderActions">
                    <button
                      type="button"
                      className="btn adminPrimaryBtn"
                      onClick={() => handleEconomyExport("json")}
                      disabled={!!ecoExporting}
                    >
                      {ecoExporting === "json" ? "Export..." : "Exporter JSON"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleEconomyExport("csv")}
                      disabled={!!ecoExporting}
                    >
                      {ecoExporting === "csv" ? "Export..." : "Exporter CSV"}
                    </button>
                  </div>
                </div>

                <section className="adminDashboardPanel adminBackupPanel">
                  <div className="adminDashboardPanel__head">
                    <h3>Export / backup</h3>
                    <p className="small">
                      Exporte les données clés en CSV ou JSON pour analyser, comparer ou restaurer après un bug économie.
                    </p>
                  </div>

                  <div className="adminBackupGrid">
                    {BACKUP_EXPORT_OPTIONS.map((option) => (
                      <article className="adminBackupCard" key={option.scope}>
                        <div>
                          <strong>{option.label}</strong>
                          <span>{option.description}</span>
                        </div>
                        <div className="adminBackupCard__actions">
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleBackupExport(option.scope, "csv")}
                            disabled={!!backupExporting}
                          >
                            {backupExporting === `${option.scope}-csv` ? "Export..." : "CSV"}
                          </button>
                          <button
                            type="button"
                            className="btn adminPrimaryBtn"
                            onClick={() => handleBackupExport(option.scope, "json")}
                            disabled={!!backupExporting}
                          >
                            {backupExporting === `${option.scope}-json` ? "Export..." : "JSON"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="adminDashboardPanel adminSeasonPanel">
                  <div className="adminDashboardPanel__head adminSeasonHead">
                    <div>
                      <h3>Gestion des saisons</h3>
                      <p className="small">
                        Contrôle les cartes par saison, leur disponibilité dans les boosters et les images manquantes.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => loadSeasonCardsOverview().catch(() => {})}
                      disabled={seasonCardsLoading}
                    >
                      {seasonCardsLoading ? "Scan..." : "Scanner"}
                    </button>
                  </div>

                  {seasonCardsError ? <div className="adminError">{seasonCardsError}</div> : null}
                  {seasonCardsLoading && !seasonCards ? (
                    <div className="adminEmpty">Chargement des cartes et vérification des images...</div>
                  ) : null}

                  {seasonCards ? (
                    <>
                      <div className="adminSeasonStats">
                        <article>
                          <span>Total cartes</span>
                          <strong>{formatNumber(seasonCards.totals.totalCards)}</strong>
                        </article>
                        <article className="is-ok">
                          <span>Obtenables</span>
                          <strong>{formatNumber(seasonCards.totals.obtainableCards)}</strong>
                        </article>
                        <article className="is-watch">
                          <span>Non obtenables</span>
                          <strong>{formatNumber(seasonCards.totals.notObtainableCards)}</strong>
                        </article>
                        <article className={seasonCards.totals.missingImages > 0 ? "is-danger" : "is-ok"}>
                          <span>Images manquantes</span>
                          <strong>{formatNumber(seasonCards.totals.missingImages)}</strong>
                        </article>
                      </div>

                      <div className="adminSeasonSummary">
                        {seasonCards.seasons.map((season) => (
                          <article className="adminSeasonSummaryCard" key={season.key}>
                            <div>
                              <span>{season.seasonNumber ? `Saison ${season.seasonNumber}` : "Spécial"}</span>
                              <strong>{season.label}</strong>
                            </div>
                            <div className="adminSeasonSummaryCard__stats">
                              <b>{formatNumber(season.totalCards)}</b>
                              <small>{formatNumber(season.obtainableCards)} obtenables</small>
                              <small>{formatNumber(season.missingImages)} image(s) manquante(s)</small>
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="adminFiltersBar adminFiltersBar--seasons">
                        <label className="adminField">
                          <span>Saison</span>
                          <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
                            <option value="all">Toutes</option>
                            {seasonCards.seasons.map((season) => (
                              <option key={season.key} value={season.key}>
                                {season.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="adminField">
                          <span>Rareté</span>
                          <select
                            value={seasonRarityFilter}
                            onChange={(e) => setSeasonRarityFilter(e.target.value)}
                          >
                            <option value="all">Toutes</option>
                            {seasonCards.rarities.map((rarity) => (
                              <option key={rarity} value={rarity}>
                                {rarity}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="adminField">
                          <span>Obtention</span>
                          <select
                            value={seasonObtainableFilter}
                            onChange={(e) => setSeasonObtainableFilter(e.target.value)}
                          >
                            <option value="all">Toutes</option>
                            <option value="obtainable">Obtenables</option>
                            <option value="not_obtainable">Non obtenables</option>
                            <option value="booster">Disponibles dans boosters</option>
                          </select>
                        </label>

                        <label className="adminField">
                          <span>Images</span>
                          <select value={seasonImageFilter} onChange={(e) => setSeasonImageFilter(e.target.value)}>
                            <option value="all">Toutes</option>
                            <option value="missing">Images manquantes</option>
                            <option value="ok">Images OK</option>
                          </select>
                        </label>

                        <div className="adminFiltersActions">
                          <button type="button" className="btn" onClick={resetSeasonFilters}>
                            Réinitialiser
                          </button>
                        </div>
                      </div>

                      <div className="adminSeasonResultLine">
                        <strong>{formatNumber(filteredSeasonItems.length)}</strong> carte(s) affichée(s)
                      </div>

                      <div className="adminDataTableWrap adminSeasonTableWrap">
                        <table className="adminDataTable adminSeasonTable">
                          <thead>
                            <tr>
                              <th>Carte</th>
                              <th>Saison</th>
                              <th>Rareté</th>
                              <th>Obtention</th>
                              <th>Image</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSeasonItems.length > 0 ? (
                              filteredSeasonItems.map((card) => (
                                <tr key={card.id}>
                                  <td>
                                    <div className="adminSeasonCardCell">
                                      <img
                                        src={toAbsoluteAssetUrl(card.imageUrl)}
                                        alt=""
                                        loading="lazy"
                                        onError={(event) => {
                                          event.currentTarget.classList.add("is-missing");
                                        }}
                                      />
                                      <div>
                                        <strong>{card.name}</strong>
                                        <span className="adminTableSub">
                                          #{card.displayNumber ?? card.number ?? card.id} - ID {card.id}
                                        </span>
                                        {card.specialCategory ? (
                                          <span className="adminTableSub">{card.specialCategory}</span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <strong>{card.seasonGroupLabel}</strong>
                                    <span className="adminTableSub">
                                      {card.affiliatedSeasonLabel
                                        ? `Affiliée ${card.affiliatedSeasonLabel}`
                                        : card.extension ?? card.season ?? "Carte standard"}
                                    </span>
                                  </td>
                                  <td>{card.rarity}</td>
                                  <td>
                                    <span className={`adminSignalBadge ${card.obtainable ? "is-ok" : "is-watch"}`}>
                                      {card.obtainable ? "Obtenable" : "Non obtenable"}
                                    </span>
                                    <span className="adminTableSub">{card.availabilitySource}</span>
                                    <span className="adminTableSub">{card.availabilityReason}</span>
                                  </td>
                                  <td>
                                    <span className={`adminSignalBadge ${card.imageExists ? "is-ok" : "is-danger"}`}>
                                      {card.imageExists ? "Image OK" : "Manquante"}
                                    </span>
                                    <span className="adminTableSub">{card.imagePath ?? "Aucun chemin"}</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5}>Aucune carte ne correspond aux filtres.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </section>

                {ecoError ? <div className="adminError">{ecoError}</div> : null}
                {ecoLoading ? <div className="adminEmpty">Chargement du suivi économie...</div> : null}

                {!ecoLoading ? (
                  <>
                    <div className="adminStats adminStats--dashboard">
                      <div className="adminStatCard adminStatCard--accent">
                        <div className="adminStatCard__value"><CurrencyAmount value={creditsCreated} /></div>
                        <div className="adminStatCard__label">WunkulCoins créés</div>
                      </div>

                      <div className="adminStatCard">
                        <div className="adminStatCard__value"><CurrencyAmount value={creditsDestroyed} /></div>
                        <div className="adminStatCard__label">WunkulCoins détruits</div>
                      </div>

                      <div className={`adminStatCard ${ecoInflation >= 0 ? "is-positive" : "is-negative"}`}>
                        <div className="adminStatCard__value">{formatSignedNumber(ecoInflation)}</div>
                        <div className="adminStatCard__label">Inflation nette</div>
                      </div>

                      <div className={`adminStatCard adminStatCard--risk is-${riskLevel}`}>
                        <div className="adminStatCard__value">{riskScore}/100</div>
                        <div className="adminStatCard__label">
                          Risque économie - {getRiskLabel(riskLevel)}
                        </div>
                      </div>

                      <div className="adminStatCard">
                        <div className="adminStatCard__value">{formatNumber(totalBoostersOpened)}</div>
                        <div className="adminStatCard__label">Boosters ouverts</div>
                      </div>

                      <div className="adminStatCard">
                        <div className="adminStatCard__value">{formatNumber(totalDisplaysOpened)}</div>
                        <div className="adminStatCard__label">Displays ouverts</div>
                      </div>

                      <div className="adminStatCard">
                        <div className="adminStatCard__value">{formatNumber(totalQuickSellEarned)}</div>
                        <div className="adminStatCard__label">Quick sell généré</div>
                      </div>
                    </div>

                    <div className={`adminRiskStrip is-${riskLevel}`}>
                      <div className="adminRiskStrip__main">
                        <span>Santé économie</span>
                        <strong>{getRiskLabel(riskLevel)}</strong>
                        <p>
                          <CurrencyAmount value={health?.netInflation ?? ecoInflation} signed /> nets sur {ecoOverview?.days ?? ecoDays} jours.
                          Quick sell = {formatPercent(quickSellShareOfCreatedPercent, false)} des WunkulCoins créés.
                        </p>
                      </div>
                      <div className="adminRiskStrip__metrics">
                        <div>
                          <span>Inflation</span>
                          <b>{formatPercent(health?.inflationRatePercent ?? 0)}</b>
                        </div>
                        <div>
                          <span>Quick sell / market</span>
                          <b>{formatPercent(quickSellToMarketPercent, false)}</b>
                        </div>
                        <div>
                          <span>Opening / création</span>
                          <b>{formatPercent(openingShareOfCreatedPercent, false)}</b>
                        </div>
                      </div>
                    </div>

                    <section className="adminDashboardPanel adminHealthPanel">
                      <div className="adminDashboardPanel__head">
                        <h3>Dashboard santé économie</h3>
                        <p className="small">
                          Vue simple des signaux qui disent si l'économie reste saine sur la période.
                        </p>
                      </div>

                      <div className="adminHealthGrid">
                        <article className={`adminHealthMetric ${ecoInflation >= 0 ? "is-warning" : "is-good"}`}>
                          <span>Inflation nette</span>
                          <strong>{formatSignedNumber(ecoInflation)}</strong>
                          <small>{formatPercent(health?.inflationRatePercent ?? 0)} sur {ecoOverview?.days ?? ecoDays} jours</small>
                        </article>

                        <article className="adminHealthMetric is-created">
                          <span>WunkulCoins créés</span>
                          <strong><CurrencyAmount value={creditsCreated} /></strong>
                          <small>Opening, quick sell, récompenses et bonus.</small>
                        </article>

                        <article className="adminHealthMetric is-destroyed">
                          <span>WunkulCoins détruits</span>
                          <strong><CurrencyAmount value={creditsDestroyed} /></strong>
                          <small>Achats de boosters et displays.</small>
                        </article>

                        <article className="adminHealthMetric">
                          <span>Volume market</span>
                          <strong><CurrencyAmount value={totalMarketVolume} /></strong>
                          <small>Échanges réalisés entre joueurs.</small>
                        </article>

                        <article className="adminHealthMetric">
                          <span>Quick sell</span>
                          <strong><CurrencyAmount value={totalQuickSellEarned} /></strong>
                          <small>{formatPercent(quickSellShareOfCreatedPercent, false)} des WunkulCoins créés.</small>
                        </article>

                        <article className="adminHealthMetric">
                          <span>Valeur moyenne opening</span>
                          <strong><CurrencyAmount value={averageOpeningValue} /></strong>
                          <small>Booster moyen : {formatCurrencyText(averageBoosterNet)}.</small>
                        </article>
                      </div>

                      <div className="adminHealthSignals">
                        <article className="adminHealthSignalCard">
                          <div>
                            <span>Top cartes manipulées</span>
                            <strong>{topManipulatedCards.length}</strong>
                          </div>
                          {topManipulatedCards.length > 0 ? (
                            <ul>
                              {topManipulatedCards.map((card) => (
                                <li key={card.cardId}>
                                  <b>{card.cardName}</b>
                                  <span>
                                    Score {card.score} · Écart {formatPercent(card.avgVsMarketPercent)} · Volatilité {formatPercent(card.volatilityPercent, false)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>Aucune carte à risque détectée.</p>
                          )}
                        </article>

                        <article className="adminHealthSignalCard">
                          <div>
                            <span>Raretés trop rentables</span>
                            <strong>{topProfitableRarities.length}</strong>
                          </div>
                          {topProfitableRarities.length > 0 ? (
                            <ul>
                              {topProfitableRarities.map((rarity) => (
                                <li key={rarity.rarity}>
                                  <b>{rarity.rarity}</b>
                                  <span>
                                    Score {rarity.score} · Prix moy. {formatCurrencyText(rarity.avgUnitPrice)} · Reward/carte {formatCurrencyText(rarity.estimatedRewardPerOpenedCard)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>Pas assez de ventes pour faire ressortir une rareté.</p>
                          )}
                        </article>
                      </div>
                    </section>

                    <section className="adminDashboardPanel adminSecurityPanel adminSecurityPanel--alerts">
                      <div className="adminDashboardPanel__head">
                        <h3>Alertes anti-abus</h3>
                        <p className="small">
                          Détection automatique des pics d'openings, prix anormaux, échanges répétés et enrichissements rapides.
                        </p>
                      </div>

                      <div className="adminSecurityEvents adminSecurityEvents--alerts">
                        {antiAbuseAlerts.length > 0 ? (
                          antiAbuseAlerts.map(renderSecurityEvent)
                        ) : (
                          <div className="adminEmpty">Aucune alerte anti-abus sur cette période.</div>
                        )}
                      </div>
                    </section>

                    <section className="adminDashboardPanel adminCorrectionPanel">
                      <div className="adminDashboardPanel__head">
                        <h3>Outils de correction</h3>
                        <p className="small">
                          Actions sensibles réservées aux corrections économie. Chaque action demande une raison et crée une trace admin.
                        </p>
                      </div>

                      {correctionError ? <div className="adminError">{correctionError}</div> : null}
                      {correctionSuccess ? <div className="adminSuccess">{correctionSuccess}</div> : null}

                      <div className="adminCorrectionGrid">
                        <form
                          className="adminCorrectionCard"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCorrection("cancelTransaction");
                          }}
                        >
                          <h4>Annuler une transaction</h4>
                          <p>Rembourse l'acheteur, rend la carte au vendeur et bloque la récompense pending.</p>
                          <label className="adminField">
                            <span>Transaction ID</span>
                            <input
                              type="number"
                              min={1}
                              value={cancelTransactionForm.transactionId}
                              onChange={(e) =>
                                setCancelTransactionForm((form) => ({ ...form, transactionId: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <label className="adminField">
                            <span>Raison</span>
                            <textarea
                              value={cancelTransactionForm.reason}
                              onChange={(e) =>
                                setCancelTransactionForm((form) => ({ ...form, reason: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <button type="submit" className="btn adminDangerBtn" disabled={!!correctionLoading}>
                            {correctionLoading === "cancelTransaction" ? "Correction..." : "Annuler"}
                          </button>
                        </form>

                        <form
                          className="adminCorrectionCard"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCorrection("disableListing");
                          }}
                        >
                          <h4>Désactiver une annonce</h4>
                          <p>Ferme l'annonce active et déverrouille les copies restantes du vendeur.</p>
                          <label className="adminField">
                            <span>Annonce ID</span>
                            <input
                              type="number"
                              min={1}
                              value={disableListingForm.listingId}
                              onChange={(e) =>
                                setDisableListingForm((form) => ({ ...form, listingId: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <label className="adminField">
                            <span>Raison</span>
                            <textarea
                              value={disableListingForm.reason}
                              onChange={(e) =>
                                setDisableListingForm((form) => ({ ...form, reason: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <button type="submit" className="btn adminDangerBtn" disabled={!!correctionLoading}>
                            {correctionLoading === "disableListing" ? "Correction..." : "Désactiver"}
                          </button>
                        </form>

                        <form
                          className="adminCorrectionCard"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCorrection("adjustPrice");
                          }}
                        >
                          <h4>Ajuster un prix suspect</h4>
                          <p>Remplace le prix en WunkulCoins d'une annonce active trop basse ou trop haute.</p>
                          <div className="adminCorrectionFields">
                            <label className="adminField">
                              <span>Annonce ID</span>
                              <input
                                type="number"
                                min={1}
                                value={adjustPriceForm.listingId}
                                onChange={(e) =>
                                  setAdjustPriceForm((form) => ({ ...form, listingId: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label className="adminField">
                              <span>Nouveau prix</span>
                              <input
                                type="number"
                                min={0}
                                value={adjustPriceForm.priceCredits}
                                onChange={(e) =>
                                  setAdjustPriceForm((form) => ({ ...form, priceCredits: e.target.value }))
                                }
                                required
                              />
                            </label>
                          </div>
                          <label className="adminField">
                            <span>Raison</span>
                            <textarea
                              value={adjustPriceForm.reason}
                              onChange={(e) =>
                                setAdjustPriceForm((form) => ({ ...form, reason: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <button type="submit" className="btn adminPrimaryBtn" disabled={!!correctionLoading}>
                            {correctionLoading === "adjustPrice" ? "Correction..." : "Ajuster"}
                          </button>
                        </form>

                        <form
                          className="adminCorrectionCard"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCorrection("refundPlayer");
                          }}
                        >
                          <h4>Rembourser un joueur</h4>
                          <p>Ajoute des WunkulCoins au joueur après bug ou compensation validée.</p>
                          <div className="adminCorrectionFields">
                            <label className="adminField">
                              <span>Joueur ID</span>
                              <input
                                type="number"
                                min={1}
                                value={refundPlayerForm.userId}
                                onChange={(e) =>
                                  setRefundPlayerForm((form) => ({ ...form, userId: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label className="adminField">
                              <span>Montant</span>
                              <input
                                type="number"
                                min={1}
                                value={refundPlayerForm.amount}
                                onChange={(e) =>
                                  setRefundPlayerForm((form) => ({ ...form, amount: e.target.value }))
                                }
                                required
                              />
                            </label>
                          </div>
                          <label className="adminField">
                            <span>Raison</span>
                            <textarea
                              value={refundPlayerForm.reason}
                              onChange={(e) =>
                                setRefundPlayerForm((form) => ({ ...form, reason: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <button type="submit" className="btn adminPrimaryBtn" disabled={!!correctionLoading}>
                            {correctionLoading === "refundPlayer" ? "Correction..." : "Rembourser"}
                          </button>
                        </form>

                        <form
                          className="adminCorrectionCard adminCorrectionCard--wide"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCorrection("removeReward");
                          }}
                        >
                          <h4>Retirer une récompense bugguée</h4>
                          <p>Retire des WunkulCoins et/ou des copies disponibles sans toucher aux cartes verrouillées.</p>
                          <div className="adminCorrectionFields adminCorrectionFields--four">
                            <label className="adminField">
                              <span>Joueur ID</span>
                              <input
                                type="number"
                                min={1}
                                value={removeRewardForm.userId}
                                onChange={(e) =>
                                  setRemoveRewardForm((form) => ({ ...form, userId: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label className="adminField">
                              <span>WunkulCoins</span>
                              <input
                                type="number"
                                min={0}
                                value={removeRewardForm.credits}
                                onChange={(e) =>
                                  setRemoveRewardForm((form) => ({ ...form, credits: e.target.value }))
                                }
                              />
                            </label>
                            <label className="adminField">
                              <span>Carte ID</span>
                              <input
                                type="number"
                                min={1}
                                value={removeRewardForm.cardId}
                                onChange={(e) =>
                                  setRemoveRewardForm((form) => ({ ...form, cardId: e.target.value }))
                                }
                              />
                            </label>
                            <label className="adminField">
                              <span>Quantité</span>
                              <input
                                type="number"
                                min={0}
                                value={removeRewardForm.cardQuantity}
                                onChange={(e) =>
                                  setRemoveRewardForm((form) => ({ ...form, cardQuantity: e.target.value }))
                                }
                              />
                            </label>
                          </div>
                          <label className="adminField">
                            <span>Raison</span>
                            <textarea
                              value={removeRewardForm.reason}
                              onChange={(e) =>
                                setRemoveRewardForm((form) => ({ ...form, reason: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <button type="submit" className="btn adminDangerBtn" disabled={!!correctionLoading}>
                            {correctionLoading === "removeReward" ? "Correction..." : "Retirer la récompense"}
                          </button>
                        </form>
                      </div>
                    </section>

                    <section className="adminDashboardPanel adminSecurityPanel">
                      <div className="adminDashboardPanel__head">
                        <h3>Journal économique</h3>
                        <p className="small">
                          Historique consultable des openings, ventes, achats, quick sell, récompenses et corrections sensibles.
                        </p>
                      </div>

                      <div className="adminSecurityStats">
                        <div className="adminSecurityPill is-ok">
                          <span>Actions OK</span>
                          <strong>{formatNumber(securityTotals.allowed)}</strong>
                        </div>
                        <div className="adminSecurityPill is-watch">
                          <span>Signalées</span>
                          <strong>{formatNumber(securityTotals.flagged)}</strong>
                        </div>
                        <div className="adminSecurityPill is-danger">
                          <span>Bloquées</span>
                          <strong>{formatNumber(securityTotals.blocked)}</strong>
                        </div>
                        <div className="adminSecurityPill">
                          <span>Critiques</span>
                          <strong>{formatNumber(securityTotals.danger)}</strong>
                        </div>
                      </div>

                      <div className="adminFiltersBar adminFiltersBar--economyLogs">
                        <label className="adminField">
                          <span>Type d'action</span>
                          <select value={ecoLogAction} onChange={(e) => setEcoLogAction(e.target.value)}>
                            <option value="">Toutes les actions</option>
                            {ECONOMY_ACTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="adminField">
                          <span>Statut</span>
                          <select value={ecoLogStatus} onChange={(e) => setEcoLogStatus(e.target.value)}>
                            <option value="">Tous</option>
                            <option value="allowed">OK</option>
                            <option value="flagged">Signalé</option>
                            <option value="blocked">Bloqué</option>
                          </select>
                        </label>

                        <label className="adminField">
                          <span>Niveau</span>
                          <select value={ecoLogSeverity} onChange={(e) => setEcoLogSeverity(e.target.value)}>
                            <option value="">Tous</option>
                            <option value="info">Info</option>
                            <option value="watch">À surveiller</option>
                            <option value="danger">Critique</option>
                          </select>
                        </label>

                        <label className="adminField">
                          <span>Joueur ID</span>
                          <input
                            type="number"
                            min={1}
                            value={ecoLogUserId}
                            onChange={(e) => setEcoLogUserId(e.target.value)}
                            placeholder="Ex: 12"
                          />
                        </label>

                        <label className="adminField">
                          <span>Carte ID</span>
                          <input
                            type="number"
                            min={1}
                            value={ecoLogCardId}
                            onChange={(e) => setEcoLogCardId(e.target.value)}
                            placeholder="Ex: 405"
                          />
                        </label>

                        <label className="adminField">
                          <span>Du</span>
                          <input type="date" value={ecoLogFrom} onChange={(e) => setEcoLogFrom(e.target.value)} />
                        </label>

                        <label className="adminField">
                          <span>Au</span>
                          <input type="date" value={ecoLogTo} onChange={(e) => setEcoLogTo(e.target.value)} />
                        </label>

                        <div className="adminFiltersActions">
                          <button type="button" className="btn adminPrimaryBtn" onClick={applyEconomyLogFilters} disabled={ecoLogsLoading}>
                            Appliquer
                          </button>
                          <button type="button" className="btn" onClick={resetEconomyLogFilters} disabled={ecoLogsLoading}>
                            Réinitialiser
                          </button>
                        </div>
                      </div>

                      <div className="adminSecurityEvents">
                        {ecoLogsLoading ? <div className="adminEmpty">Chargement des logs économie...</div> : null}
                        {ecoLogsError ? <div className="adminError">{ecoLogsError}</div> : null}
                        {recentSecurityEvents.length > 0 ? (
                          recentSecurityEvents.map((event) => (
                            <article
                              className={`adminSecurityEvent is-${event.severity}`}
                              key={event.id}
                            >
                              <div className="adminSecurityEvent__top">
                                <div>
                                  <strong>{getSecurityActionLabel(event.action)}</strong>
                                  <span>
                                    {getSecurityStatusLabel(event.status)} · {getSeverityLabel(event.severity)}
                                  </span>
                                </div>
                                <time>{formatDate(event.createdAt)}</time>
                              </div>

                              <div className="adminSecurityEvent__meta">
                                <span>Joueur : {formatLogActor(event)}</span>
                                {formatRelatedActor(event) ? <span>Lié : {formatRelatedActor(event)}</span> : null}
                                {event.cardId ? (
                                  <span>
                                    Carte : {event.cardName ?? "Carte"} #{event.cardId}
                                    {event.cardRarity ? ` · ${event.cardRarity}` : ""}
                                  </span>
                                ) : null}
                                {event.valueCredits ? (
                                  <span className="adminSecurityEvent__coinValue">
                                    Valeur : {formatCurrencyText(event.valueCredits)} <CurrencyIcon className="adminSecurityEvent__coinIcon" />
                                  </span>
                                ) : null}
                                {event.targetType ? (
                                  <span>
                                    Cible : {event.targetType}
                                    {event.targetId ? ` #${event.targetId}` : ""}
                                  </span>
                                ) : null}
                              </div>

                              {getLogHint(event) ? <p>{getLogHint(event)}</p> : null}
                              {event.reason ? <p>{event.reason}</p> : null}
                              {event.metadata ? (
                                <details className="adminSecurityEvent__details">
                                  <summary>Détails</summary>
                                  <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                                </details>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <div className="adminEmpty">Aucune action économique sur cette période.</div>
                        )}
                      </div>

                      <div className="adminPagination adminPagination--compact">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setEcoLogsPage((value) => Math.max(1, value - 1))}
                          disabled={ecoLogsPagination.page <= 1 || ecoLogsLoading}
                        >
                          Précédent
                        </button>
                        <div className="adminPagination__info">
                          Journal page {ecoLogsPagination.page} / {ecoLogsPagination.totalPages} - {formatNumber(ecoLogsPagination.total)} entrée(s)
                        </div>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setEcoLogsPage((value) => Math.min(ecoLogsPagination.totalPages, value + 1))}
                          disabled={ecoLogsPagination.page >= ecoLogsPagination.totalPages || ecoLogsLoading}
                        >
                          Suivant
                        </button>
                      </div>
                    </section>

                    <div className="adminDashboardGrid">
                      <section className="adminDashboardPanel">
                        <div className="adminDashboardPanel__head">
                          <h3>Flux WunkulCoins / jour</h3>
                          <p className="small">Création, destruction et volume de marché.</p>
                        </div>

                        <div className="adminBarChart">
                          {ecoRows.length > 0 ? (
                            ecoRows
                              .slice()
                              .reverse()
                              .map((row) => {
                                const earned =
                                  Number(row.creditsEarnedOpening ?? 0) +
                                  Number(row.creditsEarnedQuickSell ?? 0);
                                const spent = Number(row.creditsSpent ?? 0);
                                const market = Number(row.marketVolume ?? 0);

                                return (
                                  <div className="adminBarChartRow" key={row.date}>
                                    <div className="adminBarChartRow__label">{formatDay(row.date)}</div>

                                    <div className="adminBarChartRow__bars">
                                      <div
                                        className="adminBarChartRow__bar is-earned"
                                        style={{ width: `${clampPercent((earned / maxChartValue) * 100)}%` }}
                                        title={`WunkulCoins créés : ${earned}`}
                                      >
                                        <span>{formatNumber(earned)}</span>
                                      </div>

                                      <div
                                        className="adminBarChartRow__bar is-spent"
                                        style={{ width: `${clampPercent((spent / maxChartValue) * 100)}%` }}
                                        title={`WunkulCoins détruits : ${spent}`}
                                      >
                                        <span>{formatNumber(spent)}</span>
                                      </div>

                                      <div
                                        className="adminBarChartRow__bar is-market"
                                        style={{ width: `${clampPercent((market / maxChartValue) * 100)}%` }}
                                        title={`Volume market : ${market}`}
                                      >
                                        <span>{formatNumber(market)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            <div className="adminEmpty">Aucune donnée économique sur la période.</div>
                          )}
                        </div>

                        <div className="adminChartLegend">
                          <span><i className="is-earned" /> WunkulCoins créés</span>
                          <span><i className="is-spent" /> WunkulCoins détruits</span>
                          <span><i className="is-market" /> Volume market</span>
                        </div>
                      </section>

                      <section className="adminDashboardPanel">
                        <div className="adminDashboardPanel__head">
                          <h3>Vue d’ensemble</h3>
                          <p className="small">Lecture rapide de l’équilibre économique.</p>
                        </div>

                        <div className="adminKpiList">
                          <div className="adminKpiRow">
                            <span>Rewards d’ouverture</span>
                            <strong>{formatNumber(totalOpeningEarned)}</strong>
                          </div>
                          <div className="adminKpiRow">
                            <span>Quick sell généré</span>
                            <strong>{formatNumber(totalQuickSellEarned)}</strong>
                          </div>
                          <div className="adminKpiRow">
                            <span>Volume market</span>
                            <strong>{formatNumber(totalMarketVolume)}</strong>
                          </div>
                          <div className="adminKpiRow">
                            <span>Moyenne par booster</span>
                            <strong>{formatNumber(averageBoosterNet)}</strong>
                          </div>
                          <div className="adminKpiRow">
                            <span>Moyenne par display</span>
                            <strong>{formatNumber(averageDisplayNet)}</strong>
                          </div>
                          <div className="adminKpiRow">
                            <span>Période analysée</span>
                            <strong>{ecoOverview?.days ?? ecoDays} jours</strong>
                          </div>
                        </div>

                        <div className="adminInsightCards">
                          <div className={`adminInsightCard ${ecoInflation > 0 ? "is-warning" : "is-good"}`}>
                            <div className="adminInsightCard__title">Inflation nette</div>
                            <div className="adminInsightCard__value">{formatSignedNumber(ecoInflation)}</div>
                            <div className="adminInsightCard__text">
                              {ecoInflation > 0
                                ? "Plus de WunkulCoins sont créés que détruits sur la période."
                                : "L’économie est stable ou déflationniste sur la période."}
                            </div>
                          </div>

                          <div className="adminInsightCard">
                            <div className="adminInsightCard__title">Ouvertures</div>
                            <div className="adminInsightCard__value">
                              {formatNumber(totalBoostersOpened + totalDisplaysOpened)}
                            </div>
                            <div className="adminInsightCard__text">
                              {formatNumber(totalBoostersOpened)} boosters + {formatNumber(totalDisplaysOpened)} displays.
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="adminDashboardGrid adminDashboardGrid--analytics">
                      <section className="adminDashboardPanel">
                        <div className="adminDashboardPanel__head">
                          <h3>Raretés trop rentables</h3>
                          <p className="small">Raretés avec trop de volume, de rewards ou d'écart au prix marché.</p>
                        </div>

                        <div className="adminDataTableWrap">
                          <table className="adminDataTable adminDataTable--compact">
                            <thead>
                              <tr>
                                <th>Rareté</th>
                                <th>Score</th>
                                <th>Ventes</th>
                                <th>Prix moy.</th>
                                <th>Ecart</th>
                                <th>Reward/carte</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rarityProfitability.length > 0 ? (
                                rarityProfitability.map((row) => (
                                  <tr key={row.rarity}>
                                    <td>
                                      <span className={`adminSignalBadge is-${row.status}`}>
                                        {row.rarity}
                                      </span>
                                    </td>
                                    <td>{row.score}</td>
                                    <td>{formatNumber(row.saleCount)}</td>
                                    <td>{formatNumber(row.avgUnitPrice)}</td>
                                    <td>{formatPercent(row.avgVsMarketPercent)}</td>
                                    <td>{formatNumber(row.estimatedRewardPerOpenedCard)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6}>Pas assez de ventes pour détecter une rareté à risque.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="adminDashboardPanel">
                        <div className="adminDashboardPanel__head">
                          <h3>Utilisateurs suspects</h3>
                          <p className="small">Scores heuristiques: volume, écarts prix, annulations, openings.</p>
                        </div>

                        <div className="adminSuspiciousList">
                          {suspiciousUsers.length > 0 ? (
                            suspiciousUsers.map((user) => (
                              <article className="adminSuspiciousCard" key={user.userId}>
                                <div className="adminSuspiciousCard__top">
                                  <div>
                                    <strong>{user.username}</strong>
                                    <span>#{user.userId}</span>
                                  </div>
                                  <b>{user.score}/100</b>
                                </div>
                                <div className="adminSuspiciousCard__grid">
                                  <span>{formatNumber(user.totalVolume)} vol.</span>
                                  <span>{formatNumber(user.totalTrades)} trades</span>
                                  <span>{formatNumber(user.openingCount)} openings</span>
                                  <span>{formatPercent(user.cancelRatePercent, false)} annulations</span>
                                </div>
                                <p>
                                  {user.reasons.length > 0
                                    ? user.reasons.join(" • ")
                                    : "Signal faible, à surveiller."}
                                </p>
                              </article>
                            ))
                          ) : (
                            <div className="adminEmpty">Aucun utilisateur suspect sur cette période.</div>
                          )}
                        </div>
                      </section>
                    </div>

                    <section className="adminDashboardPanel adminDashboardPanel--full">
                      <div className="adminDashboardPanel__head">
                        <h3>Cartes possiblement manipulées</h3>
                        <p className="small">Écart au prix snapshot, volatilité historique et trades outliers.</p>
                      </div>

                      <div className="adminDataTableWrap">
                        <table className="adminDataTable">
                          <thead>
                            <tr>
                              <th>Carte</th>
                              <th>Rareté</th>
                              <th>Score</th>
                              <th>Ventes</th>
                              <th>Prix moy.</th>
                              <th>Écart marché</th>
                              <th>Volatilité</th>
                              <th>Outliers</th>
                            </tr>
                          </thead>
                          <tbody>
                            {manipulatedCards.length > 0 ? (
                              manipulatedCards.map((card) => (
                                <tr key={card.cardId}>
                                  <td>
                                    <strong>{card.cardName}</strong>
                                    <span className="adminTableSub">#{card.cardId}</span>
                                  </td>
                                  <td>{card.rarity}</td>
                                  <td>{card.score}</td>
                                  <td>{formatNumber(card.saleCount)}</td>
                                  <td>{formatNumber(card.avgUnitPrice)}</td>
                                  <td>{formatPercent(card.avgVsMarketPercent)}</td>
                                  <td>{formatPercent(card.volatilityPercent, false)}</td>
                                  <td>{formatNumber(card.outlierTrades)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8}>Aucune carte manipulée détectée sur cette période.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="adminDashboardPanel adminDashboardPanel--full">
                      <div className="adminDashboardPanel__head">
                        <h3>Détail journalier</h3>
                        <p className="small">Suivi brut par jour pour vérifier les tests et l’équilibrage.</p>
                      </div>

                      <div className="adminDataTableWrap">
                        <table className="adminDataTable">
                          <thead>
                            <tr>
                              <th>Jour</th>
                              <th>Boosters</th>
                              <th>Displays</th>
                              <th>Créés opening</th>
                              <th>Créés quick sell</th>
                              <th>Détruits</th>
                              <th>Volume market</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ecoRows.length > 0 ? (
                              ecoRows.map((row) => (
                                <tr key={row.date}>
                                  <td>{formatDay(row.date)}</td>
                                  <td>{formatNumber(row.boostersOpened)}</td>
                                  <td>{formatNumber(row.displaysOpened)}</td>
                                  <td>{formatNumber(row.creditsEarnedOpening)}</td>
                                  <td>{formatNumber(row.creditsEarnedQuickSell)}</td>
                                  <td>{formatNumber(row.creditsSpent)}</td>
                                  <td>{formatNumber(row.marketVolume)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7}>Aucune donnée disponible.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="adminReports">
                <div className="adminStats">
                  <div className="adminStatCard">
                    <div className="adminStatCard__value">{pagination.total}</div>
                    <div className="adminStatCard__label">Tickets filtrés</div>
                  </div>
                  {Object.entries(groupedCounts).map(([status, count]) => (
                    <div className="adminStatCard" key={status}>
                      <div className="adminStatCard__value">{count}</div>
                      <div className="adminStatCard__label">{STATUS_LABELS[status as BugReportStatus]}</div>
                    </div>
                  ))}
                </div>

                <div className="adminFiltersBar">
                  <label className="adminField">
                    <span>Statut</span>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">Tous les statuts</option>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="adminField">
                    <span>Admin</span>
                    <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)}>
                      <option value="">Tous les admins</option>
                      <option value="__me__">Mes tickets</option>
                      {adminUsers.map((adminName) => (
                        <option key={adminName} value={adminName}>
                          {adminName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="adminFiltersActions">
                    <button type="button" className="btn" onClick={resetFilters}>
                      Réinitialiser
                    </button>
                  </div>
                </div>

                {ticketsError ? <div className="adminError">{ticketsError}</div> : null}
                {ticketsLoading ? <div className="adminEmpty">Chargement...</div> : null}

                <div className="adminTicketsList">
                  {tickets.map((ticket) => {
                    const isOpen = expandedId === ticket.id;
                    const draftStatus = statusDrafts[ticket.id] ?? ticket.status;
                    const draftNote = noteDrafts[ticket.id] ?? ticket.resolutionNote ?? "";

                    return (
                      <div className="adminTicketCard" key={ticket.id}>
                        <button
                          type="button"
                          className="adminTicketCard__top"
                          onClick={() => setExpandedId((prev) => (prev === ticket.id ? null : ticket.id))}
                        >
                          <div className="adminTicketCard__main">
                            <div className="adminTicketCard__line1">
                              <span className="adminTicketCard__id">Ticket #{ticket.id}</span>
                              <span className={`adminStatusBadge is-${ticket.status}`}>
                                {STATUS_LABELS[ticket.status]}
                              </span>
                              <span className={`adminPriorityBadge is-${ticket.priority}`}>
                                {ticket.priority}
                              </span>
                            </div>
                            <div className="adminTicketCard__line2">
                              {ticket.usernameSnapshot} · {ticket.page} · {ticket.feature}
                            </div>
                          </div>

                          <span className="adminTicketCard__toggle">{isOpen ? "−" : "+"}</span>
                        </button>

                        {isOpen ? (
                          <div className="adminTicketCard__body">
                            <div className="adminTicketMetaGrid">
                              <div><b>Compte :</b> {ticket.usernameSnapshot}</div>
                              <div><b>Email :</b> {ticket.emailSnapshot ?? "—"}</div>
                              <div><b>Envoyé :</b> {formatDate(ticket.createdAt)}</div>
                              <div><b>Dernière MAJ :</b> {formatDate(ticket.updatedAt)}</div>
                              <div><b>Pris en charge :</b> {formatDate(ticket.treatedAt)} par {ticket.treatedBy ?? "—"}</div>
                              <div><b>Corrigé :</b> {formatDate(ticket.fixedAt)} par {ticket.fixedBy ?? "—"}</div>
                              <div><b>Clos :</b> {formatDate(ticket.closedAt)} par {ticket.closedBy ?? "—"}</div>
                              <div><b>Dernier changement :</b> {ticket.lastStatusChangedBy ?? "—"}</div>
                            </div>

                            <div className="adminTicketBlock">
                              <div className="adminTicketBlock__title">Description</div>
                              <div className="adminTicketBlock__content">{ticket.description}</div>
                            </div>

                            {ticket.reproductionSteps ? (
                              <div className="adminTicketBlock">
                                <div className="adminTicketBlock__title">Étapes</div>
                                <div className="adminTicketBlock__content adminTicketBlock__content--pre">
                                  {ticket.reproductionSteps}
                                </div>
                              </div>
                            ) : null}

                            {ticket.screenshotUrl ? (
                              <div className="adminTicketBlock">
                                <div className="adminTicketBlock__title">Capture</div>
                                <a
                                  className="adminScreenshotLink"
                                  href={toAbsoluteAssetUrl(ticket.screenshotUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Voir la capture
                                </a>
                              </div>
                            ) : null}

                            <div className="adminEditGrid">
                              <label className="adminField">
                                <span>Nouveau statut</span>
                                <select
                                  value={draftStatus}
                                  onChange={(e) =>
                                    setStatusDrafts((prev) => ({
                                      ...prev,
                                      [ticket.id]: e.target.value as BugReportStatus,
                                    }))
                                  }
                                >
                                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="adminField adminField--full">
                                <span>Note de traitement</span>
                                <textarea
                                  rows={4}
                                  value={draftNote}
                                  onChange={(e) =>
                                    setNoteDrafts((prev) => ({
                                      ...prev,
                                      [ticket.id]: e.target.value,
                                    }))
                                  }
                                />
                              </label>

                              <div className="adminEditActions">
                                <button
                                  type="button"
                                  className="btn adminPrimaryBtn"
                                  onClick={() => handleSaveStatus(ticket)}
                                  disabled={savingId === ticket.id}
                                >
                                  {savingId === ticket.id ? "Sauvegarde..." : "Enregistrer"}
                                </button>
                              </div>
                            </div>

                            <div className="adminTicketBlock">
                              <div className="adminTicketBlock__title">Historique</div>
                              <div className="adminTimeline">
                                {ticket.histories.map((history) => (
                                  <div className="adminTimelineItem" key={history.id}>
                                    <div className="adminTimelineItem__dot" />
                                    <div className="adminTimelineItem__content">
                                      <div className="adminTimelineItem__top">
                                        <span className={`adminStatusBadge is-${history.toStatus}`}>
                                          {STATUS_LABELS[history.toStatus]}
                                        </span>
                                        <span className="adminTimelineItem__date">
                                          {formatDate(history.changedAt)}
                                        </span>
                                      </div>
                                      <div className="adminTimelineItem__by">
                                        par {history.changedBy}
                                      </div>
                                      {history.note ? (
                                        <div className="adminTimelineItem__note">{history.note}</div>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {!ticketsLoading && tickets.length === 0 ? (
                  <div className="adminEmpty">Aucun ticket pour ces filtres.</div>
                ) : null}

                <div className="adminPagination">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => goToPage(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page <= 1 || ticketsLoading}
                  >
                    Précédent
                  </button>

                  <div className="adminPagination__info">
                    Page <b>{pagination.page}</b> / <b>{pagination.totalPages}</b>
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => goToPage(Math.min(pagination.totalPages, pagination.page + 1))}
                    disabled={pagination.page >= pagination.totalPages || ticketsLoading}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
