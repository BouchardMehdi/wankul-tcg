import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Menu.css";

import AppNavbar from "../components/AppNavbar";

import { getMe, getWallet } from "../api/me";
import type { MeResponse, WalletResponse } from "../api/me";

import { getMyStats } from "../api/stats";
import type { MyStatsResponse, SeasonProgress } from "../api/stats";

import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";

type DonutSlice = {
  label: string;
  value: number;
  color: string;
  percent: number;
};

type LootSeasonFilter = "global" | "Origins" | "Campus" | "Battle" | "Stellar";

function pct(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return (value / total) * 100;
}

function formatPercent(value: number) {
  if (value >= 10) return `${value.toFixed(1)}%`;
  return `${value.toFixed(2)}%`;
}

function Donut({
  size = 270,
  thickness = 32,
  slices,
  activeIndex,
  setActiveIndex,
}: {
  size?: number;
  thickness?: number;
  slices: DonutSlice[];
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
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

            const isActive = activeIndex === i;
            const isDimmed = activeIndex !== null && activeIndex !== i;

            return (
              <circle
                key={i}
                className={[
                  "donutSlice",
                  isActive ? "is-active" : "",
                  isDimmed ? "is-dimmed" : "",
                ].join(" ")}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={isActive ? thickness + 4 : thickness}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                pointerEvents="stroke"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <title>
                  {s.label} — {formatPercent(s.percent)}
                </title>
              </circle>
            );
          })}
      </svg>

      {activeIndex !== null ? (
        <div className="donutCenterHover">
          <div className="donutCenterHover__label">{slices[activeIndex]?.label}</div>
          <div className="donutCenterHover__value">
            {formatPercent(slices[activeIndex]?.percent ?? 0)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function seasonClassName(season: string) {
  const s = season.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("origin")) return "origins";
  if (s.includes("campus")) return "campus";
  if (s.includes("battle")) return "battle";
  if (s.includes("stellar")) return "stellar";
  if (s.includes("hors")) return "special";
  return "default";
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
          const total = s.total || 0;
          const owned = s.ownedUnique || 0;
          const percent = total > 0 ? Math.round((owned / total) * 100) : 0;
          const seasonClass = seasonClassName(s.season);

          return (
            <div className="barRow" key={s.season}>
              <div className="barRow__label">{s.season}</div>

              <div className={`barHover barHover--${seasonClass}`}>
                <div className="barRow__track">
                  <div
                    className={`barRow__fill barRow__fill--${seasonClass}`}
                    style={{ width: `${percent}%` }}
                  />
                  <div
                    className="barRow__tooltip"
                    style={{ left: `clamp(52px, ${percent}%, calc(100% - 52px))` }}
                  >
                    {percent}%{" "}
                    <span className="tooltip__muted">
                      ({owned}/{total})
                    </span>
                  </div>
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

  const [me, setMe] = useState<MeResponse | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [stats, setStats] = useState<MyStatsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [settings, setSettings] = useState(() => readAppSettings());
  const [lootSeason, setLootSeason] = useState<LootSeasonFilter>("global");

  const username = useMemo(() => me?.username ?? "Joueur", [me]);

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

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

  const seasonOrder = ["Origins", "Campus", "Battle", "Stellar", "Hors série"];

  const seasons: SeasonProgress[] = useMemo(() => {
    const source = stats?.seasonProgress ?? [];
    const map = new Map<string, SeasonProgress>();

    for (const s of source) {
      map.set(String(s.season), {
        season: String(s.season),
        ownedUnique: Number(s.ownedUnique ?? 0),
        total: Number(s.total ?? 0),
      });
    }

    if (!map.has("Origins")) map.set("Origins", { season: "Origins", ownedUnique: 0, total: 180 });
    if (!map.has("Campus")) map.set("Campus", { season: "Campus", ownedUnique: 0, total: 155 });
    if (!map.has("Battle")) map.set("Battle", { season: "Battle", ownedUnique: 0, total: 180 });
    if (!map.has("Stellar")) map.set("Stellar", { season: "Stellar", ownedUnique: 0, total: 180 });
    if (!map.has("Hors série")) map.set("Hors série", { season: "Hors série", ownedUnique: 0, total: 0 });

    return seasonOrder.map((name) => map.get(name)!);
  }, [stats]);

  const rarityCounts = useMemo(() => {
    if (!stats) return {};
    if (lootSeason === "global") return stats.rarities ?? {};
    return stats.raritiesBySeason?.[lootSeason] ?? {};
  }, [stats, lootSeason]);

  useEffect(() => {
    setActiveDonutIndex(null);
  }, [lootSeason]);

  const donutSlices: DonutSlice[] = useMemo(() => {
    const raw = [
      { label: "Commune", value: Number(rarityCounts["Commune"] ?? 0), color: "#8ec5ff" },
      {
        label: "Peu commune",
        value: Number(rarityCounts["Peu commune"] ?? rarityCounts["Peu Commune"] ?? 0),
        color: "#65e3a4",
      },
      { label: "Rare", value: Number(rarityCounts["Rare"] ?? 0), color: "#5aa9ff" },
      {
        label: "U1",
        value: Number(rarityCounts["U1"] ?? rarityCounts["Ultra rare holo 1"] ?? 0),
        color: "#a96cff",
      },
      {
        label: "U2",
        value: Number(rarityCounts["U2"] ?? rarityCounts["Ultra rare holo 2"] ?? 0),
        color: "#f06fd1",
      },
      {
        label: "Légendaire bronze",
        value: Number(rarityCounts["Légendaire bronze"] ?? 0),
        color: "#c98953",
      },
      {
        label: "Légendaire argent",
        value: Number(rarityCounts["Légendaire argent"] ?? 0),
        color: "#d7e4f2",
      },
      {
        label: "Légendaire or",
        value: Number(rarityCounts["Légendaire or"] ?? rarityCounts["Légendaire"] ?? 0),
        color: "#ffd76b",
      },
      { label: "Booster Gold", value: Number(rarityCounts["Booster Gold"] ?? 0), color: "#ffb84d" },
      { label: "Starter Pack", value: Number(rarityCounts["Starter Pack"] ?? 0), color: "#6fe6ff" },
      { label: "Ticket d'or", value: Number(rarityCounts["Ticket d'or"] ?? 0), color: "#fff0a6" },
      {
        label: "Gagnant ticket d'or",
        value: Number(rarityCounts["Gagnant ticket d'or"] ?? 0),
        color: "#ff8d57",
      },
    ].filter((s) => s.value > 0);

    const totalNoTerrain = raw.reduce((sum, s) => sum + s.value, 0);

    return raw.map((s) => ({
      ...s,
      percent: pct(s.value, totalNoTerrain),
    }));
  }, [rarityCounts]);

  if (loading) {
    return (
      <div className="app-shell">
        <AppNavbar currentPage="menu" />
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
        <AppNavbar currentPage="menu" />
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
      <AppNavbar currentPage="menu" />

      <section className="container menuSection menuSection--hero">
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
      </section>

      <section className="container menuSection menuSection--stats">
        <div className="panel menuPanel">
          <div className="panel-inner menuPanel__inner">
            <div className="section-title">
              <h2>Mes statistiques</h2>
              <p className="small">
                Tes stats personnelles (boosters, displays, progression et distribution du butin).
              </p>
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
            </div>

            <div className="chartGrid">
              <div className="chartCard chartCard--season">
                <div className="chartCard__header">
                  <div className="chartIcon chartIcon--bars" />
                  <div className="chartCard__title">PROGRESSION PAR SAISON</div>
                </div>
                <div className="chartCard__body">
                  <SeasonBars seasons={seasons} />
                </div>
              </div>

              <div className="chartCard chartCard--donut">
                <div className="chartCard__header chartCard__header--between">
                  <div className="chartCard__headerLeft">
                    <div className="chartIcon chartIcon--pie" />
                    <div className="chartCard__title">DISTRIBUTION DU BUTIN</div>
                  </div>

                  {settings.showDropRates ? (
                    <div className="lootFilter">
                      <label className="lootFilter__label" htmlFor="lootSeason">
                        Saison
                      </label>
                      <select
                        id="lootSeason"
                        className="lootFilter__select"
                        value={lootSeason}
                        onChange={(e) => setLootSeason(e.target.value as LootSeasonFilter)}
                      >
                        <option value="global">Global</option>
                        <option value="Origins">Origins</option>
                        <option value="Campus">Campus</option>
                        <option value="Battle">Battle</option>
                        <option value="Stellar">Stellar</option>
                      </select>
                    </div>
                  ) : null}
                </div>

                {settings.showDropRates ? (
                  <>
                    <div className="chartCard__body chartCard__body--donut">
                      <Donut
                        slices={donutSlices}
                        activeIndex={activeDonutIndex}
                        setActiveIndex={setActiveDonutIndex}
                      />

                      <div className="legend legend--wide">
                        {donutSlices.length === 0 ? (
                          <div className="small">Pas assez de données pour afficher la distribution.</div>
                        ) : (
                          donutSlices.map((s, i) => {
                            const isActive = activeDonutIndex === i;
                            const isDimmed = activeDonutIndex !== null && activeDonutIndex !== i;

                            return (
                              <div
                                className={[
                                  "legendRow",
                                  isActive ? "is-active" : "",
                                  isDimmed ? "is-dimmed" : "",
                                ].join(" ")}
                                key={s.label}
                                onMouseEnter={() => setActiveDonutIndex(i)}
                                onMouseLeave={() => setActiveDonutIndex(null)}
                              >
                                <div className="legendRow__left">
                                  <span className="legendDot" style={{ background: s.color }} />
                                  <span className="legendLabel">{s.label}</span>
                                </div>
                                <div className="legendValue">{formatPercent(s.percent)}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="chartCard__body chartCard__body--disabled">
                    <div className="chartDisabledState">
                      <div className="chartDisabledState__title">Drop rates masqués</div>
                      <div className="small">Active l'option <b>Show drop rates</b> dans les paramètres pour afficher ce graphique.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}