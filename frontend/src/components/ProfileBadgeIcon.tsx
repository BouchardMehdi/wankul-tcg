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

function binderLevel(code: string) {
  if (code.includes("COMPLETE")) return 4;
  if (code.includes("75")) return 3;
  if (code.includes("50") || code.includes("HALF")) return 2;
  return 1;
}

function BadgeSvg({ code, kind }: { code: string; kind: string }) {
  if (kind === "binder") {
    const level = binderLevel(code);

    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect className="badgeIcon__shadow" x="13" y="9" width="40" height="48" rx="8" />
        <path className="badgeIcon__main" d="M18 8h28a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8Z" />
        <path className="badgeIcon__dark" d="M18 8h8v50h-8a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8Z" />
        <path className="badgeIcon__shine" d="M31 16h14M31 25h12M31 34h9" />
        <path className="badgeIcon__line" d="M24 11v44" />
        {[0, 1, 2, 3].map((index) => (
          <rect
            key={index}
            className={index < level ? "badgeIcon__slot is-filled" : "badgeIcon__slot"}
            x={31 + index * 4}
            y="44"
            width="3"
            height="8"
            rx="1.5"
          />
        ))}
        {level >= 4 ? <path className="badgeIcon__mark" d="m32 31 5 5 10-13" /> : null}
      </svg>
    );
  }

  if (kind === "booster") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="badgeIcon__shadow" d="M19 8h27l5 8-7 40H17l-6-40 8-8Z" />
        <path className="badgeIcon__main" d="M17 7h28l5 9-7 41H16L9 16l8-9Z" />
        <path className="badgeIcon__dark" d="M13 17h34l-2 10H15l-2-10Z" />
        <path className="badgeIcon__shine" d="M18 33h20M20 41h16" />
        <path className="badgeIcon__mark" d="m32 28 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />
        <path className="badgeIcon__line" d="m14 15 7-6M49 15l-7-6" />
      </svg>
    );
  }

  if (kind === "display") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="badgeIcon__shadow" d="M12 28h40l5 24H7l5-24Z" />
        <path className="badgeIcon__main" d="M11 27h42l4 25H7l4-25Z" />
        <path className="badgeIcon__dark" d="M16 15h32l5 12H11l5-12Z" />
        <rect className="badgeIcon__card" x="17" y="10" width="9" height="20" rx="2" />
        <rect className="badgeIcon__card" x="28" y="8" width="9" height="22" rx="2" />
        <rect className="badgeIcon__card" x="39" y="10" width="9" height="20" rx="2" />
        <path className="badgeIcon__shine" d="M18 39h28M20 46h18" />
      </svg>
    );
  }

  if (kind === "hit") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="badgeIcon__main" d="m32 6 7 16 17 2-12 12 3 17-15-8-15 8 3-17L8 24l17-2 7-16Z" />
        <path className="badgeIcon__dark" d="m32 18 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9Z" />
        <path className="badgeIcon__shine" d="M48 8v8M52 12h-8M14 43v7M18 47h-8" />
        <path className="badgeIcon__mark" d="M28 29h9l-5 12h9" />
      </svg>
    );
  }

  if (kind === "stack") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect className="badgeIcon__shadow" x="13" y="18" width="34" height="38" rx="6" transform="rotate(-8 30 37)" />
        <rect className="badgeIcon__dark" x="18" y="12" width="34" height="38" rx="6" transform="rotate(7 35 31)" />
        <rect className="badgeIcon__main" x="16" y="15" width="34" height="38" rx="6" />
        <path className="badgeIcon__shine" d="M23 25h20M23 34h15" />
        <path className="badgeIcon__mark" d="M29 42h12M35 36v12" />
      </svg>
    );
  }

  if (kind === "market") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="badgeIcon__main" d="M12 19h40a4 4 0 0 1 4 4v25a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V23a4 4 0 0 1 4-4Z" />
        <path className="badgeIcon__dark" d="m15 19 5-10h24l5 10H15Z" />
        <circle className="badgeIcon__coin" cx="25" cy="39" r="9" />
        <circle className="badgeIcon__coin" cx="40" cy="39" r="9" />
        <path className="badgeIcon__mark" d="M32 31v16M25 39h14" />
        <path className="badgeIcon__line" d="M19 19v9M32 19v9M45 19v9" />
      </svg>
    );
  }

  if (kind === "avatar") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect className="badgeIcon__main" x="10" y="9" width="44" height="46" rx="14" />
        <circle className="badgeIcon__dark" cx="32" cy="27" r="10" />
        <path className="badgeIcon__dark" d="M18 50c3-10 10-15 14-15s11 5 14 15H18Z" />
        <path className="badgeIcon__shine" d="M19 18h10M18 23h6" />
        <path className="badgeIcon__mark" d="m42 17 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1 2-5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle className="badgeIcon__main" cx="32" cy="32" r="24" />
      <path className="badgeIcon__dark" d="m32 17 4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1 4-10Z" />
      <path className="badgeIcon__shine" d="M23 20c4-3 9-4 14-3" />
    </svg>
  );
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
      <BadgeSvg code={code} kind={kind} />
    </span>
  );
}
