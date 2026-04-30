const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.join(repoRoot, 'backend');
const cardsJsonPath = path.join(backendRoot, 'data', 'cards.json');
const cardsPublicDir = path.join(backendRoot, 'public', 'cards');

const extensionFolders = new Map([
  ['Origins', 'origins'],
  ['Campus', 'campus'],
  ['Battle', 'battle'],
  ['Stellar', 'stellar'],
  ['Hors Série', 'hors-serie'],
  ['Hors Serie', 'hors-serie'],
  ['Special', 'special'],
]);

const seasonFolders = new Map([
  [1, 'origins'],
  [2, 'campus'],
  [3, 'battle'],
  [4, 'stellar'],
]);

const explicitSpecialImages = new Map([
  ['special:s1-131-gala-tcg-2024', 'Wankul_Edition_Special_01.webp'],
  ['special:s1-132-gala-tcg-2024', 'Wankul_Edition_Special_02.webp'],
  ['special:s2-28-gemmes-pack', 'Wankul_GP_S2_028.webp'],
  ['special:s2-67-edition-speciale-japan-expo-2025', 'Wankul_ED_JE2025.webp'],
]);

function assertInsideWorkspace(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(repoRoot + path.sep)) {
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

function folderForCard(card) {
  if (card.extension && extensionFolders.has(card.extension)) {
    return extensionFolders.get(card.extension);
  }

  if (card.season && extensionFolders.has(card.season)) {
    return extensionFolders.get(card.season);
  }

  if (card.seasonNumber && seasonFolders.has(card.seasonNumber)) {
    return seasonFolders.get(card.seasonNumber);
  }

  return slugify(card.extension || card.season || 'special') || 'special';
}

function folderForFilename(filename) {
  if (/^Wankul_S1_/i.test(filename)) return 'origins';
  if (/^Wankul_S2_/i.test(filename)) return 'campus';
  if (/^Wankul_S3_/i.test(filename)) return 'battle';
  if (/^Wankul_S4_/i.test(filename)) return 'stellar';
  if (/^ticket_or/i.test(filename)) return 'special';
  return 'hors-serie';
}

function basenameFromUrl(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl.split('/').filter(Boolean).pop() || null;
}

function folderFromUrl(imageUrl) {
  if (!imageUrl) return null;
  const parts = imageUrl.split('/').filter(Boolean);
  return parts[0] === 'cards' && parts.length >= 3 ? parts[1] : null;
}

function nestedUrl(folder, filename) {
  return `/cards/${folder}/${filename}`;
}

function pad3(value) {
  return String(value).padStart(3, '0');
}

function fallbackFilenameForCard(card) {
  const key = card.key || '';

  if (explicitSpecialImages.has(key)) {
    return {
      folder: 'hors-serie',
      filename: explicitSpecialImages.get(key),
    };
  }

  const pgwMatch = key.match(/^special:pgw(\d{4})-special-(\d+)$/);
  if (pgwMatch) {
    const year = pgwMatch[1];
    const number = Number(pgwMatch[2]);
    const prefix = year === '2023' ? 'Wankul_PGW' : `Wankul_PGW${year}`;
    return {
      folder: 'hors-serie',
      filename: `${prefix}_${number}.webp`,
    };
  }

  const goldMatch = key.match(/^special:s(\d+)-(\d+)-edition-gold$/);
  if (goldMatch) {
    return {
      folder: 'hors-serie',
      filename: `Wankul_ED_S${Number(goldMatch[1])}_${pad3(Number(goldMatch[2]))}.webp`,
    };
  }

  const seasonMatch = key.match(/^special:s(\d+)-(\d+)-/);
  if (seasonMatch) {
    const seasonNumber = Number(seasonMatch[1]);
    return {
      folder: seasonFolders.get(seasonNumber) || folderForCard(card),
      filename: `Wankul_S${seasonNumber}_${pad3(Number(seasonMatch[2]))}.webp`,
    };
  }

  return null;
}

function readCardsData() {
  const parsed = JSON.parse(fs.readFileSync(cardsJsonPath, 'utf8'));
  const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];
  if (!cards.length) throw new Error('No cards found in backend/data/cards.json');
  return { parsed, cards };
}

function ensureDir(dirPath) {
  const safePath = assertInsideWorkspace(dirPath);
  if (!dryRun) fs.mkdirSync(safePath, { recursive: true });
}

function moveImage(sourcePath, targetPath) {
  const safeSource = assertInsideWorkspace(sourcePath);
  const safeTarget = assertInsideWorkspace(targetPath);

  if (!fs.existsSync(safeSource)) return false;
  if (safeSource === safeTarget) return false;

  ensureDir(path.dirname(safeTarget));

  if (fs.existsSync(safeTarget)) {
    throw new Error(`Target already exists, refusing overwrite: ${safeTarget}`);
  }

  if (!dryRun) fs.renameSync(safeSource, safeTarget);
  return true;
}

function main() {
  assertInsideWorkspace(cardsJsonPath);
  assertInsideWorkspace(cardsPublicDir);

  const { parsed, cards } = readCardsData();
  const plannedTargets = new Map();
  let updatedCards = 0;
  let filledMissingUrls = 0;

  for (const card of cards) {
    let filename = basenameFromUrl(card.imageUrl);
    let folder = folderFromUrl(card.imageUrl) || folderForCard(card);

    if (!filename) {
      const fallback = fallbackFilenameForCard(card);
      if (!fallback) continue;
      filename = fallback.filename;
      folder = fallback.folder;
      filledMissingUrls += 1;
    }

    const newUrl = nestedUrl(folder, filename);
    if (card.imageUrl !== newUrl) {
      card.imageUrl = newUrl;
      updatedCards += 1;
    }

    if (!plannedTargets.has(filename)) {
      plannedTargets.set(filename, folder);
    }
  }

  const flatFiles = fs
    .readdirSync(cardsPublicDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  let movedFiles = 0;
  for (const filename of flatFiles) {
    const folder = plannedTargets.get(filename) || folderForFilename(filename);
    const sourcePath = path.join(cardsPublicDir, filename);
    const targetPath = path.join(cardsPublicDir, folder, filename);
    if (moveImage(sourcePath, targetPath)) movedFiles += 1;
  }

  const missingFiles = [];
  for (const card of cards) {
    if (!card.imageUrl) continue;
    const targetPath = path.join(backendRoot, 'public', card.imageUrl.replace(/^\//, ''));
    if (!fs.existsSync(targetPath) && !dryRun) missingFiles.push(card.imageUrl);
  }

  if (missingFiles.length) {
    throw new Error(`Some imageUrl files are missing after organization:\n${missingFiles.join('\n')}`);
  }

  if (!dryRun) {
    fs.writeFileSync(cardsJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        cards: cards.length,
        updatedCards,
        filledMissingUrls,
        movedFiles,
        folders: [...new Set([...plannedTargets.values(), ...flatFiles.map(folderForFilename)])].sort(),
      },
      null,
      2,
    ),
  );
}

main();
