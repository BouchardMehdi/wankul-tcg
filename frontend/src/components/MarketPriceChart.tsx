import { useEffect, useMemo, useState } from "react";

import "../styles/MarketPriceChart.css";

import {
  getMarketCardPriceHistory,
  type MarketPriceHistoryPoint,
  type MarketPriceHistoryRange,
} from "../api/market";

type Props = {
  cardId: number | null | undefined;
  title?: string;
  compact?: boolean;
};

const RANGE_OPTIONS: Array<{ value: MarketPriceHistoryRange; label: string }> = [
  { value: "2H", label: "2h" },
  { value: "7D", label: "7j" },
  { value: "1M", label: "1m" },
  { value: "6M", label: "6m" },
  { value: "1Y", label: "1a" },
];

function formatDateLabel(value: string, range: MarketPriceHistoryRange) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  if (range === "2H") {
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (range === "7D") {
    return d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  }

  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: range === "1Y" ? "2-digit" : undefined,
  });
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points
    .map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
}

export default function MarketPriceChart({
  cardId,
  title = "Évolution du prix",
  compact = false,
}: Props) {
  const [range, setRange] = useState<MarketPriceHistoryRange>("7D");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [points, setPoints] = useState<MarketPriceHistoryPoint[]>([]);

  useEffect(() => {
    if (cardId == null) {
      setPoints([]);
      return;
    }

    const safeCardId = cardId;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await getMarketCardPriceHistory(safeCardId, range);
        if (!cancelled) {
          setPoints(Array.isArray(res?.points) ? res.points : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setPoints([]);
          setError(e?.message || "Impossible de charger l’historique du prix.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [cardId, range]);

  const chart = useMemo(() => {
    const width = 640;
    const height = compact ? 180 : 220;
    const padTop = 18;
    const padRight = 18;
    const padBottom = 34;
    const padLeft = 42;

    if (!points.length) {
      return {
        width,
        height,
        path: "",
        plotted: [] as Array<{ x: number; y: number; raw: MarketPriceHistoryPoint }>,
        minPrice: 0,
        maxPrice: 0,
      };
    }

    const values = points.map((p) => Number(p.price || 0));
    const minPrice = Math.min(...values);
    const maxPrice = Math.max(...values);
    const rangePrice = Math.max(1, maxPrice - minPrice);

    const usableWidth = width - padLeft - padRight;
    const usableHeight = height - padTop - padBottom;

    const plotted = points.map((p, index) => {
      const x =
        padLeft +
        (points.length === 1 ? usableWidth / 2 : (index / (points.length - 1)) * usableWidth);

      const normalized = (Number(p.price || 0) - minPrice) / rangePrice;
      const y = padTop + (1 - normalized) * usableHeight;

      return { x, y, raw: p };
    });

    return {
      width,
      height,
      path: buildPath(plotted),
      plotted,
      minPrice,
      maxPrice,
    };
  }, [compact, points]);

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const delta =
    firstPoint && lastPoint
      ? Number(lastPoint.price || 0) - Number(firstPoint.price || 0)
      : 0;

  const deltaText =
    points.length >= 2
      ? `${delta > 0 ? "+" : ""}${delta} crédits`
      : "Pas assez de données";

  return (
    <section className={`marketPriceChart ${compact ? "marketPriceChart--compact" : ""}`}>
      <div className="marketPriceChart__head">
        <div>
          <h3>{title}</h3>
          <p>
            {points.length >= 2
              ? `Variation : ${deltaText}`
              : "Historique du prix du marché"}
          </p>
        </div>

        <div className="marketPriceChart__ranges">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={range === option.value ? "is-active" : ""}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="marketPriceChart__state">Chargement du graphique…</div>
      ) : error ? (
        <div className="marketPriceChart__state marketPriceChart__state--error">
          {error}
        </div>
      ) : !points.length ? (
        <div className="marketPriceChart__state">Aucune donnée pour cette période.</div>
      ) : (
        <>
          <div className="marketPriceChart__summary">
            <div>
              <span>Min</span>
              <strong>{chart.minPrice}</strong>
            </div>
            <div>
              <span>Max</span>
              <strong>{chart.maxPrice}</strong>
            </div>
            <div>
              <span>Dernier prix</span>
              <strong>{lastPoint?.price ?? "—"}</strong>
            </div>
          </div>

          <div className="marketPriceChart__svgWrap">
            <svg
              className="marketPriceChart__svg"
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              preserveAspectRatio="none"
              aria-label="Graphique d'évolution du prix"
            >
              <line
                x1="42"
                y1={chart.height - 34}
                x2={chart.width - 18}
                y2={chart.height - 34}
                className="marketPriceChart__axis"
              />
              <line
                x1="42"
                y1="18"
                x2="42"
                y2={chart.height - 34}
                className="marketPriceChart__axis"
              />

              <path
                d={`${chart.path} L ${chart.plotted[chart.plotted.length - 1]?.x ?? 0} ${chart.height - 34} L ${chart.plotted[0]?.x ?? 0} ${chart.height - 34} Z`}
                className="marketPriceChart__area"
              />

              <path d={chart.path} className="marketPriceChart__line" />

              {chart.plotted.map((point, index) => {
                const showLabel =
                  index === 0 ||
                  index === chart.plotted.length - 1 ||
                  index === Math.floor(chart.plotted.length / 2);

                return (
                  <g key={`${point.raw.timestamp}-${index}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      className="marketPriceChart__dot"
                    />
                    {showLabel && (
                      <text
                        x={point.x}
                        y={chart.height - 12}
                        textAnchor="middle"
                        className="marketPriceChart__label"
                      >
                        {formatDateLabel(point.raw.timestamp, range)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </section>
  );
}