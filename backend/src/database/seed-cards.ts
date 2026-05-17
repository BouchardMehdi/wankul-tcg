import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Card } from '../modules/cards/card.entity';
import * as fs from 'fs';
import * as path from 'path';

type RawCard = {
  key?: string;
  name?: string;
  season?: string | null;
  seasonNumber?: number | null;
  extension?: string | null;
  number?: number | null;
  rarity?: string;
  type?: string | null;
  gameplayType?: string | null;
  specialEdition?: boolean;
  artist?: string | null;
  imageUrl?: string | null;
};

function pad3(n: number) {
  return String(n).padStart(3, '0');
}

const EXTENSION_FOLDERS: Record<string, string> = {
  Origins: 'origins',
  Campus: 'campus',
  Battle: 'battle',
  Stellar: 'stellar',
  Legacy: 'legacy',
  Special: 'special',
  'Hors Série': 'hors-serie',
  'Hors Serie': 'hors-serie',
};

const SEASON_FOLDERS: Record<number, string> = {
  1: 'origins',
  2: 'campus',
  3: 'battle',
  4: 'stellar',
  5: 'legacy',
};

const SPECIAL_IMAGE_BY_KEY: Record<string, string> = {
  'special:s1-131-gala-tcg-2024': 'Wankul_Edition_Special_01.webp',
  'special:s1-132-gala-tcg-2024': 'Wankul_Edition_Special_02.webp',
  'special:s2-28-gemmes-pack': 'Wankul_GP_S2_028.webp',
  'special:s2-67-edition-speciale-japan-expo-2025': 'Wankul_ED_JE2025.webp',
};

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function slugify(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function folderForCard(card: RawCard) {
  if (card.extension && EXTENSION_FOLDERS[card.extension]) {
    return EXTENSION_FOLDERS[card.extension];
  }

  if (card.season && EXTENSION_FOLDERS[card.season]) {
    return EXTENSION_FOLDERS[card.season];
  }

  if (card.seasonNumber && SEASON_FOLDERS[card.seasonNumber]) {
    return SEASON_FOLDERS[card.seasonNumber];
  }

  return slugify(card.extension || card.season || 'special') || 'special';
}

function imagePath(card: RawCard, filename: string, folder?: string) {
  return `/cards/${folder ?? folderForCard(card)}/${filename}`;
}

// Garde ton resolver si tu en as déjà un ailleurs.
// Ici: fallback simple + mapping specials (PGW/Gold/Sx)
function resolveImageUrl(card: RawCard): string | null {
  if (card.imageUrl) return card.imageUrl;

  const key: string = card.key ?? '';

  const explicitSpecialImage = SPECIAL_IMAGE_BY_KEY[key];
  if (explicitSpecialImage) return imagePath(card, explicitSpecialImage, 'hors-serie');

  // PGW: special:pgw2023-special-1 -> /cards/hors-serie/Wankul_PGW_1.webp
  const mPgw = key.match(/^special:pgw(\d{4})-special-(\d+)$/);
  if (mPgw) {
    const year = mPgw[1];
    const num = Number(mPgw[2]);
    if (year === '2023') return imagePath(card, `Wankul_PGW_${num}.webp`, 'hors-serie');
    if (year === '2024') return imagePath(card, `Wankul_PGW2024_${num}.webp`, 'hors-serie');
    return imagePath(card, `Wankul_PGW${year}_${num}.webp`, 'hors-serie');
  }

  // Gold: special:s2-47-edition-gold -> /cards/hors-serie/Wankul_ED_S2_047.webp
  const mGold = key.match(/^special:s(\d+)-(\d+)-edition-gold$/);
  if (mGold) {
    const s = Number(mGold[1]);
    const n = Number(mGold[2]);
    return imagePath(card, `Wankul_ED_S${s}_${pad3(n)}.webp`, 'hors-serie');
  }

  // Special basé saison: special:s1-131-xxxx -> /cards/origins/Wankul_S1_131.webp
  const mSeason = key.match(/^special:s(\d+)-(\d+)-/);
  if (mSeason) {
    const s = Number(mSeason[1]);
    const n = Number(mSeason[2]);
    return imagePath(card, `Wankul_S${s}_${pad3(n)}.webp`, SEASON_FOLDERS[s]);
  }

  return null;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const dataSource = app.get(DataSource);

  // ✅ Chemin JSON (chez toi: backend/data/cards.json)
  const filePath = path.join(process.cwd(), 'data', 'cards.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`cards.json introuvable: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  const cards: RawCard[] = Array.isArray(parsed) ? parsed : parsed.cards ?? [];
  if (!cards.length) throw new Error('Aucune carte trouvée dans cards.json');

  // On prépare toutes les rows à insérer
  const rows = cards
    .map((c): Partial<Card> | null => {
      const key = (c.key ?? '').trim();
      const name = (c.name ?? '').trim();
      const rarity = (c.rarity ?? '').trim();

      if (!key || !name || !rarity) return null;

      const imageUrl = resolveImageUrl(c);
      // Si vraiment aucune image, on met un placeholder (évite crash)
      const finalImageUrl = imageUrl ?? '/cards/placeholder.webp';

      return {
        key,
        name,
        season: c.season ?? null,
        seasonNumber: c.seasonNumber ?? null,
        extension: c.extension ?? null,
        number: c.number ?? null,
        rarity,
        type: c.type ?? null,
        gameplayType: c.gameplayType ?? null,
        specialEdition: Boolean(c.specialEdition ?? false),
        artist: c.artist ?? null,
        imageUrl: finalImageUrl,
      };
    })
    .filter((x): x is Partial<Card> => Boolean(x));

  console.log(`📦 Seed cards: ${rows.length} lignes prêtes`);


  await dataSource.transaction(async (trx) => {
    const repo = trx.getRepository(Card);
    const existingCards = await repo.find({ select: ['id', 'key'] });
    const existingIdByKey = new Map(
      existingCards.map((card) => [card.key, card.id]),
    );
    const rowsToInsert: Partial<Card>[] = [];
    const rowsToUpdate: Array<Partial<Card> & { id: number }> = [];

    for (const row of rows) {
      const key = row.key;
      if (!key) continue;

      const existingId = existingIdByKey.get(key);
      if (existingId) {
        rowsToUpdate.push({ ...row, id: existingId });
      } else {
        rowsToInsert.push(row);
      }
    }

    const insertChunks = chunk(rowsToInsert, 500);
    let done = 0;

    for (const part of insertChunks) {
      if (part.length) {
        await repo.insert(part);
      }
      done += part.length;
      console.log(`✅ Nouvelles cartes insérées: ${done}/${rowsToInsert.length}`);
    }

    let updated = 0;
    for (const row of rowsToUpdate) {
      const { id, ...values } = row;
      await repo.update(id, values);
      updated += 1;

      if (updated % 250 === 0 || updated === rowsToUpdate.length) {
        console.log(`🔁 Cartes mises à jour: ${updated}/${rowsToUpdate.length}`);
      }
    }
  });

  console.log('🎉 Seed terminé');

  // ✅ Ferme tout proprement (sinon ça “reste infini”)
  await app.close();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('❌ Seed error:', e);
  // tente de sortir proprement
  process.exit(1);
});
