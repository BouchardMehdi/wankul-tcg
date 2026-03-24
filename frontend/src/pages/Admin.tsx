import { useEffect, useMemo, useState } from "react";
import AppNavbar from "../components/AppNavbar";
import "../styles.css";
import "../styles/Menu.css";
import "../styles/Admin.css";
import { useAuth } from "../auth/AuthContext";
import {
  adminLogin,
  getAdminTickets,
  updateAdminTicketStatus,
  type AdminTicketsResponse,
  type BugReportListItem,
  type BugReportStatus,
} from "../api/auth";

const STATUS_LABELS: Record<BugReportStatus, string> = {
  open: "Ouvert",
  investigating: "En analyse",
  planned: "Planifié",
  fixed: "Corrigé",
  closed: "Clos",
  rejected: "Rejeté",
};

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

const PAGE_SIZE = 5;

export default function Admin() {
  const { role, isAdminAuthenticated, setAdminToken, clearAdminSession, me, user } = useAuth();

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

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    loadTickets(page, statusFilter, adminFilter).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAuthenticated, page]);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    setPage(1);
    loadTickets(1, statusFilter, adminFilter).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, adminFilter, isAdminAuthenticated]);

  const groupedCounts = useMemo(() => {
    return tickets.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [tickets]);

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
      setTickets((prev) =>
        prev.map((item) => (item.id === ticket.id ? res.item : item))
      );
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
                  Session admin active. Les actions sont séparées de la session joueur.
                </p>
              </div>

              <div className="adminHeaderActions">
                <button type="button" className="btn" onClick={() => loadTickets(page, statusFilter, adminFilter)}>
                  Actualiser
                </button>
                <button type="button" className="btn adminDangerBtn" onClick={clearAdminSession}>
                  Quitter le mode admin
                </button>
              </div>
            </div>

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
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
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
                <select
                  value={adminFilter}
                  onChange={(e) => setAdminFilter(e.target.value)}
                >
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
        </div>
      </section>
    </div>
  );
}