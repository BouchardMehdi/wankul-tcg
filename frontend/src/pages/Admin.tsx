import { useEffect, useMemo, useState } from "react";
import AppNavbar from "../components/AppNavbar";
import "../styles.css";
import "../styles/Dashboard.css";
import "../styles/Admin.css";
import { useAuth } from "../auth/AuthContext";
import {
  adminLogin,
  getAdminTickets,
  updateAdminTicketStatus,
  getAdminEconomyOverview,
  type AdminTicketsResponse,
  type BugReportListItem,
  type BugReportStatus,
  type AdminEconomyOverviewResponse,
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

function clampPercent(value: number) {
  return Math.max(4, Math.min(100, value));
}

const PAGE_SIZE = 5;

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

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    loadEconomyOverview(ecoDays).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAuthenticated, ecoDays]);

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

  const averageBoosterNet = totalBoostersOpened > 0 ? Math.round(totalOpeningEarned / totalBoostersOpened) : 0;
  const averageDisplayNet = totalDisplaysOpened > 0 ? Math.round(totalOpeningEarned / totalDisplaysOpened) : 0;

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
                  Dashboard économique + gestion des reports dans une seule console admin.
                </p>
              </div>

              <div className="adminHeaderActions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (activeTab === "dashboard") {
                      loadEconomyOverview(ecoDays).catch(() => {});
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
                Dashboard économie
              </button>
              <button
                type="button"
                className={`adminTabBtn ${activeTab === "reports" ? "is-active" : ""}`}
                onClick={() => setActiveTab("reports")}
              >
                Reports / tickets
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
                </div>

                {ecoError ? <div className="adminError">{ecoError}</div> : null}
                {ecoLoading ? <div className="adminEmpty">Chargement du dashboard économie...</div> : null}

                {!ecoLoading ? (
                  <>
                    <div className="adminStats adminStats--dashboard">
                      <div className="adminStatCard adminStatCard--accent">
                        <div className="adminStatCard__value">{formatNumber(ecoTotals.creditsEarned)}</div>
                        <div className="adminStatCard__label">Crédits créés</div>
                      </div>

                      <div className="adminStatCard">
                        <div className="adminStatCard__value">{formatNumber(ecoTotals.creditsSpent)}</div>
                        <div className="adminStatCard__label">Crédits détruits</div>
                      </div>

                      <div className={`adminStatCard ${ecoInflation >= 0 ? "is-positive" : "is-negative"}`}>
                        <div className="adminStatCard__value">{formatSignedNumber(ecoInflation)}</div>
                        <div className="adminStatCard__label">Inflation nette</div>
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

                    <div className="adminDashboardGrid">
                      <section className="adminDashboardPanel">
                        <div className="adminDashboardPanel__head">
                          <h3>Flux crédits / jour</h3>
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
                                        title={`Crédits créés : ${earned}`}
                                      >
                                        <span>{formatNumber(earned)}</span>
                                      </div>

                                      <div
                                        className="adminBarChartRow__bar is-spent"
                                        style={{ width: `${clampPercent((spent / maxChartValue) * 100)}%` }}
                                        title={`Crédits détruits : ${spent}`}
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
                          <span><i className="is-earned" /> Crédits créés</span>
                          <span><i className="is-spent" /> Crédits détruits</span>
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
                                ? "Plus de crédits sont créés que détruits sur la période."
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
