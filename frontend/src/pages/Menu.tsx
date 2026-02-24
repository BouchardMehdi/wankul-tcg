import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Menu.css";

import { getMe, getWallet } from "../api/me";
import type { MeResponse, WalletResponse } from "../api/me";

import { getMyStats } from "../api/stats";
import type { MyStatsResponse, SeasonProgress } from "../api/stats";

import { useAuth } from "../auth/AuthContext";

import wankulLogo from "../assets/Wankul_Logo_Blanc.webp";

type DonutSlice = { label: string; value: number; color: string };

function pct(value: number, total: number) {
  if (!total || total <= 0) return 0;
  const p = (value / total) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}

function Donut({
  size = 190,
  thickness = 26,
  slices,
}: {
  size?: number;
  thickness?: number;
  slices: DonutSlice[];
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;

  return (
    <div className="donutWrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={thickness}
          pointerEvents="none"
        />

        {slices
          .filter((s) => s.value > 0)
          .map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const gap = c - dash;
            const offset = -acc * c;
            acc += frac;

            const percent = pct(s.value, total);

            return (
              <circle
                key={i}
                className="donutSlice"
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                pointerEvents="stroke"
              >
                <title>
                  {s.label} — {percent}% ({s.value})
                </title>
              </circle>
            );
          })}

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - thickness / 2}
          fill="rgba(0,0,0,0.25)"
          pointerEvents="none"
        />
      </svg>

      <div className="donutCenter">
        <div className="donutCenter__label">Total</div>
        <div className="donutCenter__value">{total}</div>
      </div>
    </div>
  );
}

function SeasonBars({ seasons }: { seasons: SeasonProgress[] }) {
  return (
    <div className="barChart">
      <div className="barChart__grid">
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>

      <div className="barChart__rows">
        {seasons.map((s) => {
          const total = s.total || 1;
          const owned = s.ownedUnique || 0; // ✅ UNIQUES
          const percent = pct(owned, total);

          return (
            <div className="barRow" key={s.season}>
              <div className="barRow__label">{s.season}</div>

              <div className="barHover tooltipWrap">
                <div className="barRow__track">
                  <div className="barRow__fill" style={{ width: `${percent}%` }} />
                </div>

                <div className="tooltip">
                  {percent}%{" "}
                  <span className="tooltip__muted">
                    ({owned}/{s.total})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Menu() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [stats, setStats] = useState<MyStatsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const username = useMemo(() => me?.username ?? "Joueur", [me]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [meRes, walletRes, statsRes] = await Promise.allSettled([
          getMe(),
          getWallet(),
          getMyStats(),
        ]);

        if (!mounted) return;

        if (meRes.status === "fulfilled") setMe(meRes.value);
        else throw meRes.reason;

        if (walletRes.status === "fulfilled") setWallet(walletRes.value);

        if (statsRes.status === "fulfilled") setStats(statsRes.value);
      } catch (e: any) {
        setError(e?.message || "Impossible de charger le menu.");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ Progression : UNIQUES
  const seasons: SeasonProgress[] =
    stats?.seasonProgress && stats.seasonProgress.length > 0
      ? stats.seasonProgress
      : [
          // fallback visuel en attendant ton backend :
          { season: "Origins", ownedUnique: stats?.uniqueCardsTotal ?? 0, total: 180 },
          { season: "Campus", ownedUnique: 0, total: 155 },
          { season: "Battle", ownedUnique: 0, total: 180 },
          { season: "Stellar", ownedUnique: 0, total: 180 },
        ];

  // Donut : distribution
  const rarityCounts = stats?.rarities ?? {};
  const donutSlices: DonutSlice[] = [
    { label: "Commune", value: Number(rarityCounts["Commune"] ?? 0), color: "var(--rar-common)" },
    {
      label: "Peu Commune",
      value: Number(rarityCounts["Peu commune"] ?? rarityCounts["Peu Commune"] ?? 0),
      color: "var(--rar-uncommon)",
    },
    { label: "Rare", value: Number(rarityCounts["Rare"] ?? 0), color: "var(--rar-rare)" },
    {
      label: "Ultra rare holo 1",
      value: Number(rarityCounts["U1"] ?? rarityCounts["Ultra rare holo 1"] ?? 0),
      color: "var(--rar-u1)",
    },
    {
      label: "Ultra rare holo 2",
      value: Number(rarityCounts["U2"] ?? rarityCounts["Ultra rare holo 2"] ?? 0),
      color: "var(--rar-u2)",
    },
    { label: "Terrain", value: Number(rarityCounts["Terrain"] ?? 0), color: "var(--rar-terrain)" },
    {
      label: "Légendaire",
      value: Number(rarityCounts["Légendaire"] ?? rarityCounts["Legendary"] ?? 0),
      color: "var(--rar-leg-gold)",
    },
  ].filter((s) => s.value > 0);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="panel">
            <div className="panel-inner">
              <p>Chargement…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="panel">
            <div className="panel-inner">
              <div className="alert alert-error">{error}</div>
              <div className="mt-2">
                <button className="btn btn-secondary" onClick={() => navigate("/", { replace: true })}>
                  Retour accueil
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link to="/menu" className="topbar__brand" aria-label="Wankul">
            <div className="topbar__logo">
              <img src={wankulLogo} alt="logo" />
            </div>
          </Link>

          <nav className="topbar__nav">
            <Link className="topbar__link" to="/booster">
              Booster
            </Link>
            <Link className="topbar__link" to="/collection">
              Collection
            </Link>
            <button className="topbar__logout" onClick={handleLogout}>
              Se déconnecter
            </button>
          </nav>
        </div>
      </header>

      <section className="container">
        <div className="welcome">
          <div className="welcome__left">
            <h1 className="welcome__title">Bienvenue, {username}</h1>
            <p className="welcome__subtitle">
              Ouvre des boosters, complète ta collection, et regarde tes stats.
            </p>
          </div>

          <div className="welcome__right">
            <div className="kpi">
              <div className="kpi__label">Crédits</div>
              <div className="kpi__value">{wallet?.credits ?? "—"}</div>
            </div>
          </div>
        </div>
      </section><br/>

      <section className="container mt-3">
        <div className="panel">
          <div className="panel-inner">
            <div className="section-title">
              <h2>Mes statistiques</h2>
              <p className="small">Tes stats personnelles (boosters, displays, raretés…).</p>
            </div>

            <div className="stats-grid">
              <div className="statCard holo">
                <div className="statCard__label">Boosters ouverts</div>
                <div className="statCard__value">{stats?.boostersOpened ?? "—"}</div>
              </div>

              <div className="statCard holo">
                <div className="statCard__label">Displays ouverts</div>
                <div className="statCard__value">{stats?.displaysOpened ?? "—"}</div>
              </div>

              <div className="statCard holo">
                <div className="statCard__label">Cartes obtenues (avec doublons)</div>
                <div className="statCard__value">{stats?.cardsTotal ?? "—"}</div>
              </div>

              <div className="statCard holo">
                <div className="statCard__label">Cartes uniques débloquées</div>
                <div className="statCard__value">{stats?.uniqueCardsTotal ?? "—"}</div>
              </div>
            </div><br/>

            <div className="chartGrid mt-3">
              <div className="chartCard">
                <div className="chartCard__header">
                  <div className="chartIcon chartIcon--bars" />
                  <div className="chartCard__title">PROGRESSION PAR SAISON</div>
                </div>
                <div className="chartCard__body">
                  <SeasonBars seasons={seasons} />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartCard__header">
                  <div className="chartIcon chartIcon--pie" />
                  <div className="chartCard__title">DISTRIBUTION DU BUTIN</div>
                </div>

                <div className="chartCard__body chartCard__body--donut">
                  <Donut slices={donutSlices} />

                  <div className="legend">
                    {donutSlices.length === 0 ? (
                      <div className="small">Pas assez de données pour afficher la distribution.</div>
                    ) : (
                      donutSlices.map((s) => (
                        <div className="legendRow" key={s.label}>
                          <div className="legendRow__left">
                            <span className="legendDot" style={{ background: s.color }} />
                            <span className="legendLabel">{s.label}</span>
                          </div>
                          <div className="legendValue">{s.value}</div>
                        </div>
                      ))
                    )}
                    <div className="small mt-2">Astuce : survole une part du donut pour voir le %.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* /Graphiques */}
          </div>
        </div>
      </section>
    </div>
  );
}
