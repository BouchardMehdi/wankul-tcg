import type { ReactNode } from "react";

import wankulCoinSrc from "../assets/wankulcoins.webp";

type CurrencyAmountProps = {
  value?: number | string | null;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  compact?: boolean;
  signed?: boolean;
  title?: string;
};

export function formatCurrencyText(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("fr-FR");
  }
  return String(value);
}

export function CurrencyIcon({ className = "" }: { className?: string }) {
  return (
    <img
      className={["currencyIcon", className].filter(Boolean).join(" ")}
      src={wankulCoinSrc}
      alt="WunkulCoins"
      loading="lazy"
      decoding="async"
    />
  );
}

export default function CurrencyAmount({
  value,
  prefix,
  suffix,
  className = "",
  compact = false,
  signed = false,
  title,
}: CurrencyAmountProps) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const formattedValue = formatCurrencyText(value);
  const sign =
    signed && typeof value === "number" && Number.isFinite(value) && value > 0
      ? "+"
      : "";

  return (
    <span
      className={["currencyAmount", compact ? "currencyAmount--compact" : "", className]
        .filter(Boolean)
        .join(" ")}
      title={title ?? (hasValue ? `${sign}${formattedValue} WunkulCoins` : "WunkulCoins")}
    >
      {prefix}
      <span className="currencyAmount__value">{sign}{formattedValue}</span>
      {hasValue ? <CurrencyIcon /> : null}
      {suffix ? <span className="currencyAmount__suffix">{suffix}</span> : null}
    </span>
  );
}

export function CurrencyName({ className = "" }: { className?: string }) {
  return (
    <span className={["currencyName", className].filter(Boolean).join(" ")}>
      <CurrencyIcon />
    </span>
  );
}
