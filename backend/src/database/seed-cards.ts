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

// Garde ton resolver si tu en as déjà un ailleurs.
// Ici: fallback simple + mapping specials (PGW/Gold/Sx)
function resolveImageUrl(card: any): string | null {
  if (card.imageUrl) return card.imageUrl;

  const key: string = card.key ?? '';

  // PGW: special:pgw2023-special-1 -> /cards/Wankul_PGW_1.webp
  const mPgw = key.match(/^special:pgw(\d{4})-special-(\d+)$/);
  if (mPgw) {
    const year = mPgw[1];
    const num = Number(mPgw[2]);
    if (year === '2023') return `/cards/Wankul_PGW_${num}.webp`;
    if (year === '2024') return `/cards/Wankul_PGW2024_${num}.webp`;
    return `/cards/Wankul_PGW${year}_${num}.webp`;
  }

  // Gold: special:s2-47-edition-gold -> /cards/Wankul_ED_S2_047.webp
  const mGold = key.match(/^special:s(\d+)-(\d+)-edition-gold$/);
  if (mGold) {
    const s = Number(mGold[1]);
    const n = Number(mGold[2]);
    return `/cards/Wankul_ED_S${s}_${pad3(n)}.webp`;
  }

  // Special basé saison: special:s1-131-xxxx -> /cards/Wankul_S1_131.webp
  const mSeason = key.match(/^special:s(\d+)-(\d+)-/);
  if (mSeason) {
    const s = Number(mSeason[1]);
    const n = Number(mSeason[2]);
    return `/cards/Wankul_S${s}_${pad3(n)}.webp`;
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
  const repo = dataSource.getRepository(Card);

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


  // ✅ Bulk insert par chunks (évite packet trop gros)
  const chunks = chunk(rows, 500);

  await dataSource.transaction(async (trx) => {
    const qb = trx.createQueryBuilder();
    let done = 0;

    for (const part of chunks) {
      await qb.insert().into(Card).values(part).execute();
      done += part.length;
      console.log(`✅ Inséré: ${done}/${rows.length}`);
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
