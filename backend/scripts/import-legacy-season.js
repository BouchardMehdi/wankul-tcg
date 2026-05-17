const fs = require('fs');
const path = require('path');

const WANKUL_BASE_URL = 'https://wankul.fr';
const WANKULDEX_API_BASE = `${WANKUL_BASE_URL}/apps/wankul/api/wankuldex`;
const LEGACY_SET_SLUG = 'legacy';
const LEGACY_EXTENSION = 'Legacy';
const LEGACY_SEASON_NUMBER = 5;
const LEGACY_FOLDER = 'legacy';
const PAGE_LIMIT = 100;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const forceImages = args.has('--force-images');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.join(repoRoot, 'backend');
const cardsJsonPath = path.join(backendRoot, 'data', 'cards.json');
const legacyImagesDir = path.join(backendRoot, 'public', 'cards', LEGACY_FOLDER);

const rarityNameMap = new Map([
  ['Terrain', 'Terrain'],
  ['Commune', 'Commune'],
  ['Peu Commune', 'Peu commune'],
  ['Rare', 'Rare'],
  ['Ultra rare holo 1', 'Ultra Rare (U1)'],
  ['Ultra rare holo 2', 'Ultra Rare (U2)'],
  ['Légendaire Bronze', 'Légendaire bronze'],
  ['Légendaire Argent', 'Légendaire argent'],
  ['Légendaire Or', 'Légendaire dorée'],
  ['Gagnant Ticket Or', "Gagnant ticket d'or"],
  ['Starter Pack S05', 'Starter Pack'],
  ['DUO', 'Duo'],
]);

const rarityCodeMap = new Map([
  ['Terrain', 'T'],
  ['Commune', 'C'],
  ['Peu commune', 'PC'],
  ['Rare', 'R'],
  ['Ultra Rare (U1)', 'U1'],
  ['Ultra Rare (U2)', 'U2'],
  ['Légendaire bronze', 'LB'],
  ['Légendaire argent', 'LA'],
  ['Légendaire dorée', 'LO'],
  ["Gagnant ticket d'or", 'GTO'],
  ['Starter Pack', 'SP'],
  ['Duo', 'D'],
]);

const rarityOrder = [
  'Terrain',
  'Commune',
  'Peu commune',
  'Rare',
  'Ultra Rare (U1)',
  'Ultra Rare (U2)',
  'Légendaire bronze',
  'Légendaire argent',
  'Légendaire dorée',
  'Booster Gold',
  "Gagnant ticket d'or",
  "Ticket d'or",
  "ticket d'or",
  'Starter Pack',
  'Duo',
  'Carte spéciale',
];

const typeOrder = [
  'Terrain',
  'Laink',
  'Terracid',
  'Guest',
  'Random',
  'Duo',
  "Gagnant Ticket Or",
  "Ticket d'or",
];

const seasonOrder = ['Origins', 'Campus', 'Battle', 'Stellar', 'Legacy', 'Special'];

function assertInsideWorkspace(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot) {
    throw new Error(`Refusing to touch path outside workspace: ${resolved}`);
  }
  return resolved;
}

function pad3(value) {
  return String(value).padStart(3, '0');
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asAbsoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${WANKUL_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function mapRarityName(rarity) {
  const name = rarity?.name ?? '';
  return rarityNameMap.get(name) ?? name;
}

function getRarityCode(rarityName, fallback) {
  return rarityCodeMap.get(rarityName) ?? fallback ?? slugify(rarityName).toUpperCase();
}

function mapEffigyName(effigy) {
  if (!effigy?.name) return null;
  if (effigy.name === 'Gagnant Ticket Or') return "Gagnant Ticket Or";
  return effigy.name;
}

function buildLegacyCard(detail) {
  const rawNumber = String(detail.number ?? '').trim();
  const number = Number.parseInt(rawNumber, 10);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`Invalid Legacy card number for Wankuldex card #${detail.id}`);
  }

  const rarity = mapRarityName(detail.rarity);
  const rarityCode = getRarityCode(rarity, detail.rarity?.acronym);
  const kind = rarity === 'Terrain' || detail.effigy?.slug === 'terrain' ? 'terrain' : 'scoreur';
  const type = mapEffigyName(detail.effigy) ?? (kind === 'terrain' ? 'Terrain' : null);
  const cardNumberLabel = rawNumber || pad3(number);
  const filename = `Wankul_S${LEGACY_SEASON_NUMBER}_${cardNumberLabel}.png`;

  return {
    id: `${LEGACY_EXTENSION}:${rarityCode}#${cardNumberLabel}:${detail.id}`,
    name: detail.name,
    season: LEGACY_EXTENSION,
    seasonNumber: LEGACY_SEASON_NUMBER,
    extension: LEGACY_EXTENSION,
    number,
    displayNumber: cardNumberLabel,
    reference: `${rarityCode}#${cardNumberLabel}`,
    rarity,
    kind,
    type,
    artist: detail.artist?.name ?? null,
    specialEdition: false,
    releaseDate: detail.set?.releaseDate ?? null,
    imageUrl: `/cards/${LEGACY_FOLDER}/${filename}`,
    key: `S${LEGACY_SEASON_NUMBER}:${cardNumberLabel}`,
    rarityCode,
    gameplayType: kind,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'wankul-tcg-importer/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  return response.json();
}

async function fetchAllLegacyCards() {
  const list = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      set: LEGACY_SET_SLUG,
      sort: 'default',
      page: String(page),
      limit: String(PAGE_LIMIT),
    });
    const payload = await fetchJson(`${WANKULDEX_API_BASE}/cards?${params.toString()}`);
    list.push(...(payload.data ?? []));
    totalPages = Number(payload.meta?.totalPages ?? 1);
    page += 1;
  } while (page <= totalPages);

  return list;
}

async function fetchCardDetail(id) {
  const payload = await fetchJson(`${WANKULDEX_API_BASE}/cards/${id}`);
  if (!payload.data) throw new Error(`Missing detail payload for card #${id}`);
  return payload.data;
}

async function downloadImage(sourceUrl, targetPath, refererUrl) {
  const safeTarget = assertInsideWorkspace(targetPath);
  if (!sourceUrl) throw new Error(`Missing image URL for ${safeTarget}`);
  if (!forceImages && fs.existsSync(safeTarget)) return false;

  if (dryRun) return true;

  fs.mkdirSync(path.dirname(safeTarget), { recursive: true });
  const response = await fetch(sourceUrl, {
    headers: {
      accept: 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
      referer: refererUrl,
      'sec-fetch-dest': 'image',
      'sec-fetch-mode': 'no-cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'wankul-tcg-importer/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ${sourceUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(safeTarget, buffer);
  return true;
}

function countBy(cards, getKey, order = []) {
  const counts = new Map();
  for (const card of cards) {
    const key = getKey(card);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result = {};
  for (const key of order) {
    if (counts.has(key)) {
      result[key] = counts.get(key);
      counts.delete(key);
    }
  }

  for (const key of Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'fr'))) {
    result[key] = counts.get(key);
  }

  return result;
}

function recomputeStats(cards) {
  const bySeason = countBy(
    cards,
    (card) => (card.seasonNumber ? card.extension || card.season : 'Special'),
    seasonOrder,
  );
  const byRarity = countBy(cards, (card) => card.rarity, rarityOrder);
  const byType = countBy(cards, (card) => card.type, typeOrder);
  const byGameplayType = countBy(cards, (card) => card.gameplayType || card.kind, [
    'terrain',
    'scoreur',
  ]);

  return {
    total: cards.length,
    bySeason,
    byRarity,
    byType,
    byGameplayType,
  };
}

function recomputeArtists(cards) {
  const counts = countBy(cards, (card) => card.artist);
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
}

function readCardsJson() {
  const parsed = JSON.parse(fs.readFileSync(cardsJsonPath, 'utf8'));
  const cards = Array.isArray(parsed) ? parsed : parsed.cards;
  if (!Array.isArray(cards)) {
    throw new Error('backend/data/cards.json must contain a cards array');
  }
  return { parsed, cards };
}

function writeCardsJson(parsed, cards) {
  const nextPayload = Array.isArray(parsed)
    ? cards
    : {
        ...parsed,
        generatedAt: new Date().toISOString(),
        stats: recomputeStats(cards),
        artists: recomputeArtists(cards),
        cards,
      };

  if (dryRun) return;
  fs.writeFileSync(cardsJsonPath, `${JSON.stringify(nextPayload, null, 2)}\n`, 'utf8');
}

function assertNoDuplicateKeys(cards) {
  const seen = new Set();
  const duplicates = [];

  for (const card of cards) {
    if (!card.key) continue;
    if (seen.has(card.key)) duplicates.push(card.key);
    seen.add(card.key);
  }

  if (duplicates.length) {
    throw new Error(`Duplicate card keys found: ${duplicates.join(', ')}`);
  }
}

async function main() {
  assertInsideWorkspace(cardsJsonPath);
  assertInsideWorkspace(legacyImagesDir);

  const { parsed, cards } = readCardsJson();
  const sourceCards = await fetchAllLegacyCards();
  const details = [];

  for (const sourceCard of sourceCards) {
    details.push(await fetchCardDetail(sourceCard.id));
  }

  const legacyCards = details
    .map(buildLegacyCard)
    .sort((a, b) => {
      const numberDelta = Number(a.number ?? 0) - Number(b.number ?? 0);
      if (numberDelta !== 0) return numberDelta;
      return String(a.displayNumber ?? '').localeCompare(String(b.displayNumber ?? ''), 'fr');
    });

  const withoutLegacy = cards.filter((card) => Number(card.seasonNumber) !== LEGACY_SEASON_NUMBER);
  const nextCards = [...withoutLegacy, ...legacyCards];
  assertNoDuplicateKeys(nextCards);

  let downloaded = 0;
  for (const detail of details) {
    const numberLabel = String(detail.number ?? '').trim();
    const filename = `Wankul_S${LEGACY_SEASON_NUMBER}_${numberLabel}.png`;
    const targetPath = path.join(legacyImagesDir, filename);
    const didDownload = await downloadImage(
      asAbsoluteUrl(detail.imageUrl),
      targetPath,
      `${WANKUL_BASE_URL}/apps/wankul/wankuldex/card/${detail.id}`,
    );
    if (didDownload) downloaded += 1;
  }

  writeCardsJson(parsed, nextCards);

  console.log(
    [
      dryRun ? '[dry-run]' : '[write]',
      `legacy cards: ${legacyCards.length}`,
      `images ${forceImages ? 'written' : 'downloaded'}: ${downloaded}`,
      `total cards: ${nextCards.length}`,
    ].join(' | '),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
