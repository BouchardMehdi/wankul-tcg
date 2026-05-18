import "../styles/ProfileBadgeIcon.css";

type BadgeTier = "bronze" | "silver" | "gold" | "rainbow";
type BadgeIconSize = "sm" | "md";

type ProfileBadgeIconProps = {
  code: string;
  title: string;
  tier: BadgeTier;
  unlocked?: boolean;
  size?: BadgeIconSize;
  className?: string;
};

function iconKind(code: string) {
  if (code.startsWith("COLLECTION") || code.startsWith("SEASON")) return "binder";
  if (code.startsWith("BOOSTER")) return "booster";
  if (code.startsWith("DISPLAY")) return "display";
  if (code.includes("BIG_HIT")) return "hit";
  if (code.includes("DUPLICATE")) return "stack";
  if (code.includes("SALE") || code.includes("MARKET")) return "market";
  if (code.includes("AVATAR")) return "avatar";
  return "medal";
}

function badgeEmoji(code: string) {
  const icons: Record<string, string> = {
    FIRST_BOOSTER: "🎴",
    BOOSTER_10: "🔥",
    BOOSTER_50: "✨",
    FIRST_DISPLAY: "🗃️",
    DISPLAY_5: "💎",
    COLLECTION_25: "📘",
    COLLECTION_50: "📗",
    COLLECTION_75: "🌟",
    SEASON_HALF: "🏆",
    SEASON_COMPLETE: "🌈",
    FIRST_BIG_HIT: "💥",
    DUPLICATE_100: "🪙",
    FIRST_SALE: "💸",
    MARKET_25_SALES: "🏪",
    CUSTOM_AVATAR: "👤",
  };

  return icons[code] ?? "🏅";
}

export default function ProfileBadgeIcon({
  code,
  title,
  tier,
  unlocked = true,
  size = "md",
  className = "",
}: ProfileBadgeIconProps) {
  const kind = iconKind(code);

  return (
    <span
      className={[
        "profileBadgeIcon",
        `profileBadgeIcon--${tier}`,
        `profileBadgeIcon--${kind}`,
        `profileBadgeIcon--${size}`,
        unlocked ? "is-unlocked" : "is-locked",
        className,
      ].join(" ")}
      title={title}
      aria-label={title}
    >
      <span className="profileBadgeIcon__emoji" aria-hidden="true">
        {badgeEmoji(code)}
      </span>
    </span>
  );
}
