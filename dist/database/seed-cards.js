"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const typeorm_1 = require("typeorm");
const card_entity_1 = require("../modules/cards/card.entity");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function pad3(n) {
    return String(n).padStart(3, '0');
}
const EXTENSION_FOLDERS = {
    Origins: 'origins',
    Campus: 'campus',
    Battle: 'battle',
    Stellar: 'stellar',
    Legacy: 'legacy',
    Special: 'special',
    'Hors Série': 'hors-serie',
    'Hors Serie': 'hors-serie',
};
const SEASON_FOLDERS = {
    1: 'origins',
    2: 'campus',
    3: 'battle',
    4: 'stellar',
    5: 'legacy',
};
const SPECIAL_IMAGE_BY_KEY = {
    'special:s1-131-gala-tcg-2024': 'Wankul_Edition_Special_01.webp',
    'special:s1-132-gala-tcg-2024': 'Wankul_Edition_Special_02.webp',
    'special:s2-28-gemmes-pack': 'Wankul_GP_S2_028.webp',
    'special:s2-67-edition-speciale-japan-expo-2025': 'Wankul_ED_JE2025.webp',
};
function normalizeText(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function slugify(value) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function folderForCard(card) {
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
function imagePath(card, filename, folder) {
    return `/cards/${folder ?? folderForCard(card)}/${filename}`;
}
function resolveImageUrl(card) {
    if (card.imageUrl)
        return card.imageUrl;
    const key = card.key ?? '';
    const explicitSpecialImage = SPECIAL_IMAGE_BY_KEY[key];
    if (explicitSpecialImage)
        return imagePath(card, explicitSpecialImage, 'hors-serie');
    const mPgw = key.match(/^special:pgw(\d{4})-special-(\d+)$/);
    if (mPgw) {
        const year = mPgw[1];
        const num = Number(mPgw[2]);
        if (year === '2023')
            return imagePath(card, `Wankul_PGW_${num}.webp`, 'hors-serie');
        if (year === '2024')
            return imagePath(card, `Wankul_PGW2024_${num}.webp`, 'hors-serie');
        return imagePath(card, `Wankul_PGW${year}_${num}.webp`, 'hors-serie');
    }
    const mGold = key.match(/^special:s(\d+)-(\d+)-edition-gold$/);
    if (mGold) {
        const s = Number(mGold[1]);
        const n = Number(mGold[2]);
        return imagePath(card, `Wankul_ED_S${s}_${pad3(n)}.webp`, 'hors-serie');
    }
    const mSeason = key.match(/^special:s(\d+)-(\d+)-/);
    if (mSeason) {
        const s = Number(mSeason[1]);
        const n = Number(mSeason[2]);
        return imagePath(card, `Wankul_S${s}_${pad3(n)}.webp`, SEASON_FOLDERS[s]);
    }
    return null;
}
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn'],
    });
    const dataSource = app.get(typeorm_1.DataSource);
    const filePath = path.join(process.cwd(), 'data', 'cards.json');
    if (!fs.existsSync(filePath)) {
        throw new Error(`cards.json introuvable: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const cards = Array.isArray(parsed) ? parsed : parsed.cards ?? [];
    if (!cards.length)
        throw new Error('Aucune carte trouvée dans cards.json');
    const rows = cards
        .map((c) => {
        const key = (c.key ?? '').trim();
        const name = (c.name ?? '').trim();
        const rarity = (c.rarity ?? '').trim();
        if (!key || !name || !rarity)
            return null;
        const imageUrl = resolveImageUrl(c);
        const finalImageUrl = imageUrl ?? '/cards/placeholder.webp';
        return {
            key,
            name,
            season: c.season ?? null,
            seasonNumber: c.seasonNumber ?? null,
            extension: c.extension ?? null,
            number: c.number ?? null,
            displayNumber: c.displayNumber ?? (c.number != null ? String(c.number) : null),
            rarity,
            type: c.type ?? null,
            gameplayType: c.gameplayType ?? null,
            specialEdition: Boolean(c.specialEdition ?? false),
            artist: c.artist ?? null,
            imageUrl: finalImageUrl,
            specialCategory: c.specialCategory ?? null,
            affiliatedSeason: c.affiliatedSeason ?? null,
            affiliatedSeasonNumber: c.affiliatedSeasonNumber ?? null,
            sourceRarity: c.sourceRarity ?? null,
            sourceRaritySlug: c.sourceRaritySlug ?? null,
        };
    })
        .filter((x) => Boolean(x));
    console.log(`📦 Seed cards: ${rows.length} lignes prêtes`);
    await dataSource.transaction(async (trx) => {
        const repo = trx.getRepository(card_entity_1.Card);
        const existingCards = await repo.find({ select: ['id', 'key'] });
        const existingIdByKey = new Map(existingCards.map((card) => [card.key, card.id]));
        const rowsToInsert = [];
        const rowsToUpdate = [];
        for (const row of rows) {
            const key = row.key;
            if (!key)
                continue;
            const existingId = existingIdByKey.get(key);
            if (existingId) {
                rowsToUpdate.push({ ...row, id: existingId });
            }
            else {
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
    await app.close();
    process.exit(0);
}
main().catch(async (e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
});
//# sourceMappingURL=seed-cards.js.map