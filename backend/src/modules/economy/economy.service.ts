import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEconomy } from './user-economy.entity';
import { User } from '../users/user.entity';

export type OpenKind = 'booster' | 'display';

export type CreditBreakdown = {
  // ✅ valeur des cartes déjà possédées (base)
  base: number;

  // ✅ valeur des cartes nouvellement débloquées (REMPLACE la base)
  newCardBonus: number;

  boosterMultiplierApplied?: number;
  displayMultiplierApplied?: number;
  ticketGoldJackpot?: number;

  total: number;
};

const ECON = {
  SIGNUP_BONUS: 1500,

  cost: { booster: 180, display: 4200 },

  charges: {
    booster: { cap: 4, rechargeMinutes: 90 },
    display: { cap: 1, rechargeMinutes: 60 * 60 }, // 3600 min = 60h (comme ton fichier)
  },

  baseByRarity: {
    Terrain: 0,
    Commune: 2,
    'Peu commune': 4,
    Rare: 10,
    'Ultra Rare (U1)': 36,
    'Ultra Rare (U2)': 56,
    'Légendaire bronze': 120,
    'Légendaire argent': 280,
    'Légendaire dorée': 560,
    'Booster Gold': 56,
    "Gagnant ticket d'or": 10,
    "Ticket d'or": 0,
  } as Record<string, number>,

  // ✅ new = valeur de remplacement (pas un bonus qui s’additionne)
  newBonusByRarity: {
    Terrain: 10,
    Commune: 12,
    'Peu commune': 20,
    Rare: 40,
    'Ultra Rare (U1)': 140,
    'Ultra Rare (U2)': 220,
    'Légendaire bronze': 440,
    'Légendaire argent': 1000,
    'Légendaire dorée': 2800,
    'Booster Gold': 220,
    "Gagnant ticket d'or": 25,
    "Ticket d'or": 0,
  } as Record<string, number>,

  multipliers: {
    gtoBooster: 1.5,
    goldDisplay: 1.25,
  },

  jackpotTicketOr: 30000,
};

@Injectable()
export class EconomyService {
  constructor(
    @InjectRepository(UserEconomy)
    private readonly economyRepo: Repository<UserEconomy>,
  ) {}

  getCosts() {
    return ECON.cost;
  }

  private minutesBetween(a: Date, b: Date) {
    return (b.getTime() - a.getTime()) / 60000;
  }

  private ensureRechargeDates(row: UserEconomy, now: Date) {
    if (!row.boosterRechargeAt) row.boosterRechargeAt = now;
    if (!row.displayRechargeAt) row.displayRechargeAt = now;
  }

  private applyRecharge(row: UserEconomy, now = new Date()) {
    this.ensureRechargeDates(row, now);

    // Booster recharge
    if (row.freeBoosterCharges < ECON.charges.booster.cap) {
      const mins = this.minutesBetween(row.boosterRechargeAt!, now);
      const add = Math.floor(mins / ECON.charges.booster.rechargeMinutes);

      if (add > 0) {
        row.freeBoosterCharges = Math.min(ECON.charges.booster.cap, row.freeBoosterCharges + add);
        row.boosterRechargeAt = new Date(
          row.boosterRechargeAt!.getTime() + add * ECON.charges.booster.rechargeMinutes * 60000,
        );
      }
    } else {
      row.boosterRechargeAt = now;
    }

    // Display recharge
    if (row.freeDisplayCharges < ECON.charges.display.cap) {
      const mins = this.minutesBetween(row.displayRechargeAt!, now);
      const add = Math.floor(mins / ECON.charges.display.rechargeMinutes);

      if (add > 0) {
        row.freeDisplayCharges = Math.min(ECON.charges.display.cap, row.freeDisplayCharges + add);
        row.displayRechargeAt = new Date(
          row.displayRechargeAt!.getTime() + add * ECON.charges.display.rechargeMinutes * 60000,
        );
      }
    } else {
      row.displayRechargeAt = now;
    }
  }

  /**
   * ✅ Crée la ligne économie si absente.
   * ✅ Retourne toujours un UserEconomy (jamais null, jamais array)
   * ✅ Aligné à ton entity (userId + relation user)
   */
  async ensure(userId: number): Promise<UserEconomy> {
    let row = await this.economyRepo.findOne({ where: { userId } });

    if (!row) {
      const now = new Date();

      // On set userId (PK) + relation user (JoinColumn sur user_id)
      row = this.economyRepo.create({
        userId,
        user: { id: userId } as User,
        credits: 0,
        signupBonusGranted: 0,
        freeBoosterCharges: ECON.charges.booster.cap,
        freeDisplayCharges: ECON.charges.display.cap,
        boosterRechargeAt: now,
        displayRechargeAt: now,
      });
    }

    // sécurise si DB contient null
    this.ensureRechargeDates(row, new Date());

    return await this.economyRepo.save(row);
  }

  async getSnapshot(userId: number) {
    const row = await this.ensure(userId);
    this.applyRecharge(row);
    await this.economyRepo.save(row);

    return {
      credits: row.credits,
      freeBoosterCharges: row.freeBoosterCharges,
      freeDisplayCharges: row.freeDisplayCharges,
      costs: this.getCosts(),
    };
  }

  async consumeOpen(userId: number, kind: OpenKind) {
    const row = await this.ensure(userId);
    this.applyRecharge(row);

    const cost = ECON.cost[kind];

    if (kind === 'booster') {
      if (row.freeBoosterCharges > 0) {
        row.freeBoosterCharges -= 1;
        await this.economyRepo.save(row);
        return { kind, usedFree: true, cost: 0 };
      }
    } else {
      if (row.freeDisplayCharges > 0) {
        row.freeDisplayCharges -= 1;
        await this.economyRepo.save(row);
        return { kind, usedFree: true, cost: 0 };
      }
    }

    if (row.credits < cost) throw new ForbiddenException('Crédits insuffisants');
    row.credits -= cost;
    await this.economyRepo.save(row);

    return { kind, usedFree: false, cost };
  }

  /**
   * ✅ Nouvelle carte = valeur new (remplace base)
   * newCardRarities = rarités des cartes dont la QUANTITÉ était 0 avant (carte ID jamais obtenue)
   */
  computeBoosterCredits(args: {
    rarities: string[];
    newCardRarities: string[];
    gtoPresent: boolean;
    ticketOrPresent: boolean;
  }): CreditBreakdown {
    const { rarities, newCardRarities, gtoPresent, ticketOrPresent } = args;

    // baseAll = somme des bases de toutes les cartes
    let baseAll = 0;
    for (const r of rarities) baseAll += ECON.baseByRarity[r] ?? 0;

    // baseNew = somme des bases des cartes nouvelles (à retirer)
    // newValue = somme des valeurs new des cartes nouvelles (à mettre à la place)
    let baseNew = 0;
    let newValue = 0;
    for (const r of newCardRarities) {
      baseNew += ECON.baseByRarity[r] ?? 0;
      newValue += ECON.newBonusByRarity[r] ?? 0;
    }

    const base = baseAll - baseNew; // cartes déjà possédées
    const newBonus = newValue;      // cartes nouvelles (valeur de remplacement)

    let subtotal = base + newBonus;

    // booster multiplier si GTO présent
    const boosterMult = gtoPresent ? ECON.multipliers.gtoBooster : 1;
    subtotal = Math.floor(subtotal * boosterMult);

    // jackpot Ticket d’or (non multiplié)
    const jackpot = ticketOrPresent ? ECON.jackpotTicketOr : 0;

    return {
      base,
      newCardBonus: newBonus,
      boosterMultiplierApplied: gtoPresent ? boosterMult : undefined,
      ticketGoldJackpot: jackpot || undefined,
      total: subtotal + jackpot,
    };
  }

  computeDisplayCredits(args: { boosterBreakdowns: CreditBreakdown[]; goldMultiplier: boolean }): CreditBreakdown {
    let base = 0;
    let newBonus = 0;
    let jackpot = 0;

    let subtotalNoJackpot = 0;
    for (const b of args.boosterBreakdowns) {
      base += b.base;
      newBonus += b.newCardBonus;
      jackpot += b.ticketGoldJackpot ?? 0;
      subtotalNoJackpot += b.total - (b.ticketGoldJackpot ?? 0);
    }

    // display multiplier si display gold
    const displayMult = args.goldMultiplier ? ECON.multipliers.goldDisplay : 1;
    const after = Math.floor(subtotalNoJackpot * displayMult);

    return {
      base,
      newCardBonus: newBonus,
      displayMultiplierApplied: args.goldMultiplier ? displayMult : undefined,
      ticketGoldJackpot: jackpot || undefined,
      total: after + jackpot,
    };
  }

  async addCredits(userId: number, amount: number) {
    if (!amount) return;
    const row = await this.ensure(userId);
    row.credits += amount;
    await this.economyRepo.save(row);
  }
}