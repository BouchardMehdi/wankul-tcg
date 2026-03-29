import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";

import "../styles.css";
import "../styles/CardDetails.css";

import AppNavbar from "../components/AppNavbar";
import { fetchOwnedCollection } from "../api/collection";
import {
  fetchCardDetails,
  fetchCardPriceHistory,
  type CardDetailsDto,
  type CardPriceHistoryRange,
} from "../api/card-details";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const RANGES: Array<{ value: CardPriceHistoryRange; label: string }> = [
  { value: "24H", label: "24h" },
  { value: "7D", label: "7 jours" },
  { value: "30D", label: "30 jours" },
  { value: "6M", label: "6 mois" },
  { value: "1Y", label: "1 an" },
];

type PricePoint = {
  timestamp: string;
  price: number;
};

type SvgPoint = PricePoint & {
  x: number;
  y: number;
  label: string;
};

type TooltipState = {
  point: SvgPoint;
  index: number;
} | null;

type TooltipPosition = {
  left: number;
  top: number;
  placement: "top" | "bottom";
  arrowLeft: number;
} | null;

function resolveImg(imageUrl?: string | null) {
  const url = (imageUrl ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function formatTooltipDateLabel(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAxisDateLabel(iso: string, range: CardPriceHistoryRange) {
  const date = new Date(iso);
  const locale = "fr-FR";

  if (range === "24H") {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (range === "7D") {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "2-digit",
    }).format(date);
  }

  if (range === "30D") {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCredits(value: number) {
  return `${value.toLocaleString("fr-FR")} crédits`;
}

function formatSignedCredits(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("fr-FR")} crédits`;
}

function formatSignedPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(1));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} %`;
}

function getTrendTone(delta: number) {
  if (delta > 0) return "up" as const;
  if (delta < 0) return "down" as const;
  return "flat" as const;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function getRarityZoomPadding(rarity?: string | null) {
  const normalized = (rarity ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("legendaire")) {
    return { minRatio: 0.12, maxRatio: 0.12, minAbs: 120, maxAbs: 120 };
  }

  if (normalized.includes("u2")) {
    return { minRatio: 0.14, maxRatio: 0.14, minAbs: 90, maxAbs: 90 };
  }

  if (normalized.includes("u1")) {
    return { minRatio: 0.16, maxRatio: 0.16, minAbs: 70, maxAbs: 70 };
  }

  if (normalized.includes("rare")) {
    return { minRatio: 0.18, maxRatio: 0.18, minAbs: 40, maxAbs: 40 };
  }

  if (normalized.includes("peu commune")) {
    return { minRatio: 0.2, maxRatio: 0.2, minAbs: 24, maxAbs: 24 };
  }

  return { minRatio: 0.24, maxRatio: 0.24, minAbs: 12, maxAbs: 12 };
}

function buildNiceTicks(minValue: number, maxValue: number, count = 5) {
  const span = Math.max(1, maxValue - minValue);
  const roughStep = span / Math.max(1, count - 1);
  const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / power;

  let niceNormalized = 1;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  const step = niceNormalized * power;
  const start = Math.floor(minValue / step) * step;
  const end = Math.ceil(maxValue / step) * step;

  const ticks: number[] = [];
  for (let value = start; value <= end + step * 0.5; value += step) {
    ticks.push(Math.round(value));
  }

  return { step, start, end, ticks };
}

function pickXAxisTicks(
  points: PricePoint[],
  range: CardPriceHistoryRange,
  isMobile: boolean,
) {
  if (points.length <= 2) return points.map((_, index) => index);

  const wanted = isMobile
    ? range === "24H"
      ? 4
      : range === "7D"
        ? 4
        : 4
    : range === "24H"
      ? 6
      : range === "7D"
        ? 7
        : 6;

  const step = Math.max(1, Math.ceil((points.length - 1) / (wanted - 1)));
  const indexes: number[] = [];

  for (let i = 0; i < points.length; i += step) {
    indexes.push(i);
  }

  if (indexes[indexes.length - 1] !== points.length - 1) {
    indexes.push(points.length - 1);
  }

  return Array.from(new Set(indexes));
}

function CardDetails() {
  const { id } = useParams<{ id: string }>();
  const cardId = Number(id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [card, setCard] = useState<CardDetailsDto | null>(null);
  const [ownedQuantity, setOwnedQuantity] = useState(0);
  const [range, setRange] = useState<CardPriceHistoryRange>("7D");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 860 : false,
  );

  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 860);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!Number.isInteger(cardId) || cardId < 1) {
      setError("Carte introuvable.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCard() {
      setLoading(true);
      setError("");

      try {
        const [cardRes, ownedRes] = await Promise.all([
          fetchCardDetails(cardId),
          fetchOwnedCollection(),
        ]);

        if (cancelled) return;

        setCard(cardRes);
        const ownedRow = ownedRes.find((row) => row.card.id === cardId);
        setOwnedQuantity(Number(ownedRow?.quantity ?? 0));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Impossible de charger la carte.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCard();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  useEffect(() => {
    if (!Number.isInteger(cardId) || cardId < 1) return;

    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");
      setTooltip(null);
      setTooltipPosition(null);

      try {
        const res = await fetchCardPriceHistory(cardId, range);
        if (cancelled) return;
        setPoints(Array.isArray(res.points) ? res.points : []);
      } catch (e: any) {
        if (cancelled) return;
        setHistoryError(e?.message || "Impossible de charger l’historique des prix.");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [cardId, range]);

  const chart = useMemo(() => {
    if (!points.length) return null;

    const width = 1120;
    const height = isMobile ? 430 : 560;
    const paddingTop = isMobile ? 22 : 34;
    const paddingRight = isMobile ? 18 : 34;
    const paddingBottom = isMobile ? 74 : 88;
    const paddingLeft = isMobile ? 68 : 110;

    const rawMin = Math.min(...points.map((point) => point.price));
    const rawMax = Math.max(...points.map((point) => point.price));
    const zoom = getRarityZoomPadding(card?.rarity);
    const spread = Math.max(1, rawMax - rawMin);

    let displayMin = Math.max(
      0,
      Math.floor(
        Math.min(rawMin - Math.max(zoom.minAbs, spread * zoom.minRatio), rawMin),
      ),
    );
    let displayMax = Math.ceil(
      Math.max(rawMax + Math.max(zoom.maxAbs, spread * zoom.maxRatio), rawMax + 1),
    );

    if (displayMax <= displayMin) displayMax = displayMin + 10;

    const yTicksMeta = buildNiceTicks(displayMin, displayMax, isMobile ? 4 : 5);
    displayMin = yTicksMeta.start;
    displayMax = yTicksMeta.end;

    const xIndexes = pickXAxisTicks(points, range, isMobile);
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const ySpan = Math.max(1, displayMax - displayMin);

    const svgPoints: SvgPoint[] = points.map((point, index) => {
      const x =
        points.length === 1
          ? paddingLeft + innerWidth / 2
          : paddingLeft + (index / (points.length - 1)) * innerWidth;
      const y = paddingTop + (1 - (point.price - displayMin) / ySpan) * innerHeight;

      return {
        ...point,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        label: formatTooltipDateLabel(point.timestamp),
      };
    });

    const first = svgPoints[0];
    const last = svgPoints[svgPoints.length - 1];
    const delta = last.price - first.price;
    const deltaPercent = first.price > 0 ? (delta / first.price) * 100 : null;
    const tone = getTrendTone(delta);
    const xAxisTicks = xIndexes.map((index) => ({
      index,
      point: svgPoints[index],
      label: formatAxisDateLabel(svgPoints[index].timestamp, range),
    }));
    const yTicks = yTicksMeta.ticks.map((value) => {
      const ratio = (value - displayMin) / ySpan;
      return {
        value,
        y: Number((paddingTop + (1 - ratio) * innerHeight).toFixed(2)),
      };
    });

    return {
      width,
      height,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      minPrice: rawMin,
      maxPrice: rawMax,
      displayMin,
      displayMax,
      delta,
      deltaPercent,
      tone,
      svgPoints,
      xAxisTicks,
      yTicks,
      path: buildSmoothPath(svgPoints),
      area: [
        `${first.x},${height - paddingBottom}`,
        ...svgPoints.map((point) => `${point.x},${point.y}`),
        `${last.x},${height - paddingBottom}`,
      ].join(" "),
    };
  }, [card?.rarity, isMobile, points, range]);

  useLayoutEffect(() => {
    const wrapEl = chartWrapRef.current;
    if (!wrapEl) return;

    const update = () => {
      if (!tooltip || !chart || !wrapEl) {
        setTooltipPosition(null);
        return;
      }

      const tooltipEl = tooltipRef.current;
      const wrapWidth = wrapEl.clientWidth;
      const wrapHeight = wrapEl.clientHeight;
      const tooltipWidth = tooltipEl?.offsetWidth ?? 184;
      const tooltipHeight = tooltipEl?.offsetHeight ?? 74;

      const pointLeft = (tooltip.point.x / chart.width) * wrapWidth;
      const pointTop = (tooltip.point.y / chart.height) * wrapHeight;

      const sidePadding = isMobile ? 8 : 16;
      const verticalGap = isMobile ? 16 : 14;
      const topPreferred = pointTop - tooltipHeight - verticalGap;
      const bottomPreferred = pointTop + verticalGap;
      const placement: "top" | "bottom" =
        topPreferred >= sidePadding || bottomPreferred + tooltipHeight > wrapHeight - sidePadding
          ? "top"
          : "bottom";

      const unclampedLeft = pointLeft - tooltipWidth / 2;
      const left = Math.min(
        Math.max(sidePadding, unclampedLeft),
        Math.max(sidePadding, wrapWidth - tooltipWidth - sidePadding),
      );

      let top = placement === "top" ? topPreferred : bottomPreferred;
      top = Math.min(
        Math.max(sidePadding, top),
        Math.max(sidePadding, wrapHeight - tooltipHeight - sidePadding),
      );

      const arrowLeft = Math.min(
        Math.max(18, pointLeft - left),
        Math.max(18, tooltipWidth - 18),
      );

      setTooltipPosition({ left, top, placement, arrowLeft });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(wrapEl);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [chart, isMobile, tooltip]);

  const imageSrc = resolveImg(card?.imageUrl);
  const chartTone = chart?.tone ?? "flat";

  return (
    <div className="app-shell">
      <AppNavbar currentPage="collection" />

      <section className="cardDetailsPage">
        <div className="cardDetailsShell">
          <div className="cardDetailsTopbar">
            <Link className="btn" to="/collection">
              ← Retour à la collection
            </Link>
          </div>

          {loading ? (
            <div className="cardDetailsState">Chargement…</div>
          ) : error || !card ? (
            <div className="cardDetailsState cardDetailsState--error">
              {error || "Carte introuvable."}
            </div>
          ) : (
            <>
              <div className="cardDetailsHero">
                <div className="cardDetailsHero__mediaCol">
                  <div className="cardDetailsHero__media">
                    {imageSrc ? (
                      <img src={imageSrc} alt={card.name} />
                    ) : (
                      <div className="cardDetailsHero__placeholder">Aucune image</div>
                    )}
                  </div>
                </div>

                <div className="cardDetailsHero__content">
                  <h1>{card.name}</h1>
                  <div className="cardDetailsBadges">
                    <span className="cardDetailsBadge">Possédée : {ownedQuantity}</span>
                  </div>

                  <div className="cardDetailsGrid">
                    <div><span>Nom</span><strong>{card.name}</strong></div>
                    <div><span>Numéro</span><strong>{typeof card.number === "number" ? `#${card.number}` : "—"}</strong></div>
                    <div><span>Saison</span><strong>{card.season ?? "—"}</strong></div>
                    <div><span>Type</span><strong>{card.type ?? "—"}</strong></div>
                    <div><span>Artiste</span><strong>{card.artist ?? "—"}</strong></div>
                    <div><span>Rareté</span><strong>{card.rarity}</strong></div>
                  </div>
                </div>
              </div>

              <div className={`cardDetailsChartCard cardDetailsChartCard--${chartTone}`}>
                <div className="cardDetailsChartCard__head">
                  <div>
                    <h2>Évolution du prix</h2>
                    <p>Historique marché filtrable par période.</p>
                  </div>

                  <div className="cardDetailsRangeTabs">
                    {RANGES.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        className={`cardDetailsRangeTab ${range === tab.value ? "is-active" : ""}`}
                        onClick={() => setRange(tab.value)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {historyLoading ? (
                  <div className="cardDetailsState">Chargement du graphique…</div>
                ) : historyError ? (
                  <div className="cardDetailsState cardDetailsState--error">{historyError}</div>
                ) : chart ? (
                  <>
                    <div className="cardDetailsKpis">
                      <div className="cardDetailsKpiCard"><span>Min réel</span><strong>{formatCredits(chart.minPrice)}</strong></div>
                      <div className="cardDetailsKpiCard"><span>Max réel</span><strong>{formatCredits(chart.maxPrice)}</strong></div>
                      <div className="cardDetailsKpiCard"><span>Dernière valeur</span><strong>{formatCredits(chart.svgPoints[chart.svgPoints.length - 1].price)}</strong></div>
                      <div className={`cardDetailsKpiCard cardDetailsKpiCard--${chartTone}`}>
                        <span>Variation</span>
                        <strong>{formatSignedCredits(chart.delta)}</strong>
                        <em>{formatSignedPercent(chart.deltaPercent)}</em>
                      </div>
                    </div>

                    <div className="cardDetailsChartMeta">
                      <span>Période affichée : {RANGES.find((item) => item.value === range)?.label ?? range}</span>
                      <span>Échelle : {formatCredits(chart.displayMin)} → {formatCredits(chart.displayMax)}</span>
                    </div>

                    <div className="cardDetailsChartWrap" ref={chartWrapRef}>
                      <svg
                        viewBox={`0 0 ${chart.width} ${chart.height}`}
                        role="img"
                        aria-label={`Historique du prix de ${card.name}`}
                        preserveAspectRatio="none"
                      >
                        {chart.yTicks.map((tick) => (
                          <line
                            key={`grid-${tick.value}`}
                            className="cardDetailsChartGrid"
                            x1={chart.paddingLeft}
                            y1={tick.y}
                            x2={chart.width - chart.paddingRight}
                            y2={tick.y}
                          />
                        ))}

                        <line className="cardDetailsChartAxis" x1={chart.paddingLeft} y1={chart.paddingTop} x2={chart.paddingLeft} y2={chart.height - chart.paddingBottom} />
                        <line className="cardDetailsChartAxis" x1={chart.paddingLeft} y1={chart.height - chart.paddingBottom} x2={chart.width - chart.paddingRight} y2={chart.height - chart.paddingBottom} />

                        {chart.yTicks.map((tick) => (
                          <g key={`y-${tick.value}`}>
                            <line className="cardDetailsChartTick" x1={chart.paddingLeft - 8} y1={tick.y} x2={chart.paddingLeft} y2={tick.y} />
                            <text className="cardDetailsChartAxisLabel cardDetailsChartAxisLabel--y" x={chart.paddingLeft - 18} y={tick.y + 5}>{tick.value}</text>
                          </g>
                        ))}

                        {chart.xAxisTicks.map((tick) => (
                          <g key={`x-${tick.index}`}>
                            <line className="cardDetailsChartTick" x1={tick.point.x} y1={chart.height - chart.paddingBottom} x2={tick.point.x} y2={chart.height - chart.paddingBottom + 10} />
                            <text className="cardDetailsChartAxisLabel cardDetailsChartAxisLabel--x" x={tick.point.x} y={chart.height - chart.paddingBottom + 34} textAnchor="middle">{tick.label}</text>
                          </g>
                        ))}

                        <text className="cardDetailsChartAxisTitle" x={chart.width / 2} y={chart.height - 18} textAnchor="middle">Temps</text>
                        <text className="cardDetailsChartAxisTitle" transform={`translate(28 ${chart.height / 2}) rotate(-90)`} textAnchor="middle">Prix du marché (crédits)</text>

                        <polygon className="cardDetailsChartArea" points={chart.area} />
                        <path className="cardDetailsChartLine" d={chart.path} />

                        {chart.svgPoints.map((point, index) => (
                          <g key={`${point.timestamp}-${point.price}-${index}`}>
                            <circle className="cardDetailsChartDot" cx={point.x} cy={point.y} r={isMobile ? 6 : 7} />
                            <circle
                              className="cardDetailsChartDotHit"
                              cx={point.x}
                              cy={point.y}
                              r={isMobile ? 22 : 18}
                              onMouseEnter={() => setTooltip({ point, index })}
                              onMouseLeave={() => setTooltip(null)}
                              onFocus={() => setTooltip({ point, index })}
                              onBlur={() => setTooltip(null)}
                              onTouchStart={() => setTooltip({ point, index })}
                            />
                          </g>
                        ))}
                      </svg>

                      {tooltip && tooltipPosition && (
                        <div
                          ref={tooltipRef}
                          className={`cardDetailsTooltip cardDetailsTooltip--${chartTone} cardDetailsTooltip--${tooltipPosition.placement}`}
                          style={{
                            left: `${tooltipPosition.left}px`,
                            top: `${tooltipPosition.top}px`,
                            ["--tooltip-arrow-left" as any]: `${tooltipPosition.arrowLeft}px`,
                          }}
                        >
                          <div className="cardDetailsTooltip__date">{tooltip.point.label}</div>
                          <div className="cardDetailsTooltip__price">{formatCredits(tooltip.point.price)}</div>
                        </div>
                      )}
                    </div>

                    <div className="cardDetailsChartFooter">
                      <span>{formatAxisDateLabel(chart.svgPoints[0].timestamp, range)}</span>
                      <span>{formatAxisDateLabel(chart.svgPoints[chart.svgPoints.length - 1].timestamp, range)}</span>
                    </div>
                  </>
                ) : (
                  <div className="cardDetailsState">Aucune donnée disponible.</div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default CardDetails;