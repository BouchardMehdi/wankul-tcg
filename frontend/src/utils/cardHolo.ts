type CardHoloLike = {
  rarity?: string | null;
  type?: string | null;
  season?: string | null;
  extension?: string | null;
  seasonNumber?: number | string | null;
  key?: string | null;
  id?: string | number | null;
  specialCategory?: string | null;
  sourceRarity?: string | null;
  affiliatedSeason?: string | null;
};

export type CardHoloKey =
  | ""
  | "u1"
  | "u2"
  | "duo"
  | "legacy-duo"
  | "leg-bronze"
  | "leg-silver"
  | "leg-gold"
  | "booster-gold"
  | "gold-ticket"
  | "gold-ticket-winner"
  | "starter";

function normalizePlain(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHoloRarity(raw?: string | null): CardHoloKey {
  const s0 = String(raw ?? "");
  const m = s0.match(/\((u1|u2)\)/i);
  if (m?.[1]) return m[1].toLowerCase() as CardHoloKey;

  const s = normalizePlain(s0);

  if (s.includes("starter")) return "starter";
  if (s.includes("gagnant") && s.includes("ticket")) return "gold-ticket-winner";
  if (s.includes("ticket")) return "gold-ticket";
  if (
    s.includes("booster gold") ||
    (s.includes("booster") && s.includes("gold")) ||
    s === "gold"
  ) {
    return "booster-gold";
  }
  if (s.includes("u1") || s.includes("ultra rare u1") || s.includes("ultra rare 1")) {
    return "u1";
  }
  if (s.includes("u2") || s.includes("ultra rare u2") || s.includes("ultra rare 2")) {
    return "u2";
  }
  if (s.includes("duo")) return "duo";

  const isLegendary = s.includes("legendaire") || s.includes("legendary") || s.startsWith("leg ");
  if (isLegendary && s.includes("bronze")) return "leg-bronze";
  if (isLegendary && (s.includes("argent") || s.includes("silver"))) return "leg-silver";
  if (isLegendary && (s.includes("or") || s.includes("gold") || s.includes("doree"))) {
    return "leg-gold";
  }

  return "";
}

function getCardSearchText(card?: CardHoloLike | null) {
  return normalizePlain(
    [
      card?.season,
      card?.extension,
      card?.key,
      card?.id,
      card?.specialCategory,
      card?.sourceRarity,
      card?.affiliatedSeason,
    ].join(" "),
  );
}

export function isLegacyDuoCard(card?: CardHoloLike | null) {
  if (normalizeHoloRarity(card?.rarity) !== "duo") return false;

  const seasonNumber = Number(card?.seasonNumber);
  const text = getCardSearchText(card);

  return seasonNumber === 5 || text.includes("legacy");
}

export function isHorsSerieDuoCard(card?: CardHoloLike | null) {
  const type = normalizePlain(card?.type);
  if (!type.includes("duo")) return false;

  const text = getCardSearchText(card);
  return text.includes("hors serie") || text.includes("starter pack");
}

export function getCardHoloRarity(card?: CardHoloLike | null): CardHoloKey {
  const rarity = normalizeHoloRarity(card?.rarity);

  if (isLegacyDuoCard(card)) return "legacy-duo";

  if (rarity === "starter" || isHorsSerieDuoCard(card)) {
    return "u2";
  }

  return rarity;
}

export function isHoloRarityKey(key?: string | null) {
  return [
    "u1",
    "u2",
    "duo",
    "legacy-duo",
    "leg-bronze",
    "leg-silver",
    "leg-gold",
    "booster-gold",
    "gold-ticket",
    "gold-ticket-winner",
    "starter",
  ].includes(String(key ?? ""));
}
