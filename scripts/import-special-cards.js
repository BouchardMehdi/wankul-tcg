const fs = require('fs');
const path = require('path');

const WANKUL_BASE_URL = 'https://wankul.fr';
const WANKULDEX_API_BASE = `${WANKUL_BASE_URL}/apps/wankul/api/wankuldex`;
const SPECIAL_SET_SLUG = 'hors-serie';
const SPECIAL_EXTENSION = 'Hors Série';
const SPECIAL_FOLDER = 'hors-serie';
const PAGE_LIMIT = 200;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const forceImages = args.has('--force-images');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.join(repoRoot, 'backend');
const cardsJsonPath = path.join(backendRoot, 'data', 'cards.json');
const specialImagesDir = path.join(backendRoot, 'public', 'cards', SPECIAL_FOLDER);

const seasonByNumber = new Map([
  [1, 'Origins'],
  [2, 'Campus'],
  [3, 'Battle'],
  [4, 'Stellar'],
  [5, 'Legacy'],
]);

const rarityBySourceSlug = new Map([
  ['edition-gold', 'Booster Gold'],
  ['gagnant-ticket-or', "Gagnant ticket d'or"],
  ['starter-pack-s05', 'Starter Pack'],
  ['starter-pack-civilisations', 'Starter Pack'],
  ['starter-pack-legendes', 'Starter Pack'],
  ['starter-pack-carrieres', 'Starter Pack'],
  ['starter-pack-pop-culture', 'Starter Pack'],
  ['starter-pack-tv', 'Starter Pack'],
  ['starter-pack-jeux-video', 'Starter Pack'],
  ['starter-pack-showtime', 'Starter Pack'],
  ['starter-pack-apocalypse', 'Starter Pack'],
  ['pgw-2025', 'Carte spéciale'],
  ['pgw-2024', 'Carte spéciale'],
  ['pgw-2023', 'Carte spéciale'],
  ['noel-2023', 'Carte spéciale'],
  ['gemmes-pack', 'Carte spéciale'],
  ['edition-speciale', 'Carte spéciale'],
]);

const categoryBySourceSlug = new Map([
  ['edition-gold', 'Booster Gold'],
  ['gagnant-ticket-or', "Gagnant ticket d'or"],
  ['starter-pack-s05', 'Starter Pack S05'],
  ['starter-pack-civilisations', 'Starter Pack Civilisations'],
  ['starter-pack-legendes', 'Starter Pack Légendes'],
  ['starter-pack-carrieres', 'Starter Pack Carrières'],
  ['starter-pack-pop-culture', 'Starter Pack Pop-Culture'],
  ['starter-pack-tv', 'Starter Pack TV'],
  ['starter-pack-jeux-video', 'Starter Pack Jeux Vidéo'],
  ['starter-pack-showtime', 'Starter Pack Showtime'],
  ['starter-pack-apocalypse', 'Starter Pack Apocalypse'],
  ['pgw-2025', 'PGW 2025'],
  ['pgw-2024', 'PGW 2024'],
  ['pgw-2023', 'PGW 2023'],
  ['noel-2023', 'Noël 2023'],
  ['gemmes-pack', 'Gemmes Pack'],
  ['edition-speciale', 'Édition spéciale'],
]);

const sourceSlugToAffiliatedSeason = new Map([
  ['starter-pack-carrieres', 1],
  ['starter-pack-pop-culture', 1],
  ['starter-pack-civilisations', 2],
  ['starter-pack-legendes', 2],
  ['starter-pack-tv', 3],
  ['starter-pack-jeux-video', 3],
  ['starter-pack-showtime', 4],
  ['starter-pack-apocalypse', 4],
  ['starter-pack-s05', 5],
  ['gemmes-pack', 2],
  ['noel-2023', 2],
]);

const editionSpecialeAffiliations = new Map([
  [342, 1],
  [345, 1],
  [370, 2],
]);

const legacyGoldNumbers = new Set(['33', '34', '72', '73', '95', '96', '109', '110']);

const oldStarterPackKeys = new Map([
  ['starter-pack-civilisations', 'special:ur2-s161-starter-pack-civilisations'],
  ['starter-pack-legendes', 'special:ur2-s162-starter-pack-legendes'],
  ['starter-pack-carrieres', 'special:ur2-s182-starter-pack-carriere'],
  ['starter-pack-pop-culture', 'special:ur2-s181-starter-pack-pop-culture'],
  ['starter-pack-tv', 'special:ur2-s181-starter-pack-tv'],
  ['starter-pack-jeux-video', 'special:ur2-s182-starter-pack-jeux-video'],
  ['starter-pack-showtime', 'special:ur2-s181-starter-pack-showtime'],
  ['starter-pack-apocalypse', 'special:ur2-s182-starter-pack-apocalypse'],
]);

const oldEditionSpecialeKeys = new Map([
  [342, 'special:s1-131-gala-tcg-2024'],
  [345, 'special:s1-132-gala-tcg-2024'],
  [370, 'special:s2-67-edition-speciale-japan-expo-2025'],
]);

const oldGoldSeasonByNumber = new Map([
  ['115', 1],
  ['121', 1],
  ['47', 2],
  ['48', 2],
  ['88', 2],
  ['89', 2],
  ['103', 2],
  ['104', 2],
  ['38', 3],
  ['131', 3],
  ['133', 3],
  ['35', 4],
  ['40', 4],
  ['69', 4],
  ['132', 4],
  ['140', 4],
]);

const seasonSlugByNumber = new Map([
  [1, 'origins'],
  [2, 'campus'],
  [3, 'battle'],
  [4, 'stellar'],
  [5, 'legacy'],
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
  ['Booster Gold', 'BG'],
  ["Gagnant ticket d'or", 'GTO'],
  ["Ticket d'or", 'TO'],
  ['Starter Pack', 'SP'],
  ['Duo', 'D'],
  ['Carte spéciale', 'HS'],
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

function getSourceSlug(detail) {
  return detail.rarity?.slug ?? slugify(detail.rarity?.name);
}

function getRarity(detail) {
  return rarityBySourceSlug.get(getSourceSlug(detail)) ?? 'Carte spéciale';
}

function getSpecialCategory(detail) {
  return categoryBySourceSlug.get(getSourceSlug(detail)) ?? detail.rarity?.name ?? 'Hors Série';
}

function getRarityCode(rarity, detail) {
  return rarityCodeMap.get(rarity) ?? detail.rarity?.acronym ?? slugify(rarity).toUpperCase();
}

function mapEffigyName(detail, rarity) {
  const effigyName = detail.effigy?.name ?? null;
  if (rarity === "Gagnant ticket d'or") return "Ticket d'or";
  if (effigyName === 'Gagnant Ticket Or') return "Ticket d'or";
  return effigyName;
}

function detectSeasonFromImagePath(detail) {
  const imagePath = detail.imageUrl ?? '';
  const match = imagePath.match(/\/saison\/0?(\d+)-/i);
  if (!match) return null;

  const seasonNumber = Number(match[1]);
  return seasonByNumber.has(seasonNumber) ? seasonNumber : null;
}

function detectSeasonFromText(detail) {
  const text = normalizeText(`${detail.name ?? ''} ${detail.number ?? ''}`).toLowerCase();

  if (/\bcampus\b/.test(text)) return 2;
  if (/\bbattle\b/.test(text)) return 3;
  if (/\bstellar\b/.test(text)) return 4;
  if (/\blegacy\b/.test(text)) return 5;

  const gtoMatch = String(detail.number ?? '').match(/^([1-5])[A-Z]$/i);
  if (gtoMatch) return Number(gtoMatch[1]);

  return null;
}

function getAffiliatedSeasonNumber(detail) {
  const sourceSlug = getSourceSlug(detail);

  if (sourceSlugToAffiliatedSeason.has(sourceSlug)) {
    return sourceSlugToAffiliatedSeason.get(sourceSlug);
  }

  if (sourceSlug === 'edition-speciale' && editionSpecialeAffiliations.has(detail.id)) {
    return editionSpecialeAffiliations.get(detail.id);
  }

  if (sourceSlug === 'edition-gold') {
    const fromText = detectSeasonFromText(detail);
    if (fromText) return fromText;

    const numberLabel = String(detail.number ?? '').trim();
    if (legacyGoldNumbers.has(numberLabel)) return 5;
  }

  return detectSeasonFromImagePath(detail) ?? detectSeasonFromText(detail);
}

function getImageExtension(sourceUrl) {
  const pathname = new URL(sourceUrl, WANKUL_BASE_URL).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  return '.jpg';
}

function getImageFilename(detail) {
  const sourceUrl = asAbsoluteUrl(detail.imageUrl);
  const ext = getImageExtension(sourceUrl);
  const categorySlug = slugify(getSpecialCategory(detail)) || 'hors-serie';
  const numberSlug = slugify(detail.number) || 'carte';
  const nameSlug = slugify(detail.name).slice(0, 48) || 'carte';
  return `Wankul_HS_${categorySlug}_${numberSlug}_${nameSlug}_${detail.id}${ext}`;
}

function getCleanName(detail) {
  const sourceSlug = getSourceSlug(detail);
  let name = String(detail.name ?? '').trim();

  if (sourceSlug.startsWith('pgw-')) {
    name = name.replace(/\s*-\s*PGW\s+\d{4}$/i, '');
  }

  if (sourceSlug === 'edition-gold') {
    name = name.replace(/\s*-\s*Booster Gold\s+\w+$/i, '');
  }

  if (sourceSlug === 'gagnant-ticket-or') {
    name = name.replace(/\s*-\s*Gagnant\s+T[Ii]cket\s+Or\s+\w+$/i, '');
  }

  if (sourceSlug.startsWith('starter-pack-')) {
    name = name.replace(/\s*-\s*Starter Pack\s+.+$/i, '');
  }

  if (sourceSlug === 'gemmes-pack') {
    name = name.replace(/\s*-\s*Gemmes Pack$/i, '');
  }

  if (sourceSlug === 'edition-speciale') {
    name = name
      .replace(/\s*-\s*Gala TCG\s+\d{4}$/i, '')
      .replace(/\s*-\s*Japan Expo\s+\d{4}$/i, '');
  }

  return name.trim() || detail.name;
}

function getCardKey(detail, affiliatedSeasonNumber) {
  const sourceSlug = getSourceSlug(detail);
  const displayNumber = String(detail.number ?? '').trim();
  const numberSlug = displayNumber ? slugify(displayNumber) : 'card';

  if (sourceSlug === 'pgw-2023' || sourceSlug === 'pgw-2024') {
    return `special:${sourceSlug.replace('-', '')}-special-${numberSlug}`;
  }

  if (sourceSlug === 'gagnant-ticket-or') {
    const letter = displayNumber.replace(/^\d/i, '').toLowerCase();
    const seasonSlug = seasonSlugByNumber.get(affiliatedSeasonNumber);
    if (seasonSlug && letter) return `special:gto-${seasonSlug}-${letter}`;
  }

  if (oldStarterPackKeys.has(sourceSlug)) {
    return oldStarterPackKeys.get(sourceSlug);
  }

  if (sourceSlug === 'gemmes-pack') {
    return 'special:s2-28-gemmes-pack';
  }

  if (sourceSlug === 'edition-speciale' && oldEditionSpecialeKeys.has(detail.id)) {
    return oldEditionSpecialeKeys.get(detail.id);
  }

  if (sourceSlug === 'edition-gold' && oldGoldSeasonByNumber.has(displayNumber)) {
    return `special:s${oldGoldSeasonByNumber.get(displayNumber)}-${displayNumber}-edition-gold`;
  }

  return `special:${sourceSlug}:${numberSlug}:${detail.id}`;
}

function buildSpecialCard(detail) {
  const sourceSlug = getSourceSlug(detail);
  const rarity = getRarity(detail);
  const rarityCode = getRarityCode(rarity, detail);
  const specialCategory = getSpecialCategory(detail);
  const displayNumber = String(detail.number ?? '').trim();
  const affiliatedSeasonNumber = getAffiliatedSeasonNumber(detail) ?? null;
  const kind = detail.effigy?.slug === 'terrain' ? 'terrain' : 'scoreur';
  const type = mapEffigyName(detail, rarity) ?? (kind === 'terrain' ? 'Terrain' : null);
  const filename = getImageFilename(detail);
  const key = getCardKey(detail, affiliatedSeasonNumber);
  const referenceParts = [detail.rarity?.acronym ?? rarityCode, displayNumber].filter(Boolean);

  return {
    id: `${SPECIAL_EXTENSION}:${detail.rarity?.acronym ?? rarityCode}#${displayNumber || detail.id}:${detail.id}`,
    name: getCleanName(detail),
    season: null,
    seasonNumber: null,
    extension: SPECIAL_EXTENSION,
    number: null,
    displayNumber: displayNumber || null,
    reference: referenceParts.join('#'),
    rarity,
    kind,
    type,
    artist: detail.artist?.name ?? null,
    specialEdition: true,
    releaseDate: detail.set?.releaseDate ?? null,
    imageUrl: `/cards/${SPECIAL_FOLDER}/${filename}`,
    key,
    rarityCode,
    gameplayType: kind,
    specialCategory,
    affiliatedSeason: affiliatedSeasonNumber ? seasonByNumber.get(affiliatedSeasonNumber) : null,
    affiliatedSeasonNumber,
    sourceSet: detail.set?.name ?? null,
    sourceRarity: detail.rarity?.name ?? null,
    sourceRaritySlug: sourceSlug,
    wankuldexId: detail.id,
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

async function fetchAllSpecialCards() {
  const list = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      set: SPECIAL_SET_SLUG,
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

function clearSpecialImagesDir() {
  const safeDir = assertInsideWorkspace(specialImagesDir);
  if (dryRun || !forceImages) return;

  fs.rmSync(safeDir, { recursive: true, force: true });
  fs.mkdirSync(safeDir, { recursive: true });
}

function isImportedSpecialCard(card) {
  if (card.key === 'special:ticket-or') return false;
  if (card.wankuldexId && card.extension === SPECIAL_EXTENSION) return true;
  if (card.seasonNumber == null && card.extension === SPECIAL_EXTENSION) return true;
  if (card.seasonNumber == null && card.extension === 'Hors Serie') return true;
  if (card.seasonNumber == null && String(card.key ?? '').startsWith('special:')) return true;
  if (card.seasonNumber == null && ['Booster Gold', "Gagnant ticket d'or", 'Starter Pack', 'Carte spéciale'].includes(card.rarity)) {
    return true;
  }
  return false;
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
  assertInsideWorkspace(specialImagesDir);

  const { parsed, cards } = readCardsJson();
  const sourceCards = await fetchAllSpecialCards();
  const details = [];

  for (const sourceCard of sourceCards) {
    details.push(await fetchCardDetail(sourceCard.id));
  }

  const specialCards = details.map(buildSpecialCard);
  const keptCards = cards.filter((card) => !isImportedSpecialCard(card));
  const nextCards = [...keptCards, ...specialCards];
  assertNoDuplicateKeys(nextCards);

  clearSpecialImagesDir();

  let downloaded = 0;
  for (const detail of details) {
    const targetPath = path.join(specialImagesDir, getImageFilename(detail));
    const didDownload = await downloadImage(
      asAbsoluteUrl(detail.imageUrl),
      targetPath,
      `${WANKUL_BASE_URL}/apps/wankul/wankuldex/card/${detail.id}`,
    );
    if (didDownload) downloaded += 1;
  }

  writeCardsJson(parsed, nextCards);

  const categories = countBy(specialCards, (card) => card.specialCategory);

  console.log(
    [
      dryRun ? '[dry-run]' : '[write]',
      `special cards: ${specialCards.length}`,
      `images ${forceImages ? 'written' : 'downloaded'}: ${downloaded}`,
      `total cards: ${nextCards.length}`,
      `categories: ${Object.entries(categories)
        .map(([name, count]) => `${name}=${count}`)
        .join(', ')}`,
    ].join(' | '),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
