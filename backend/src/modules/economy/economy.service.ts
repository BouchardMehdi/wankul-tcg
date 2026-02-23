import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEconomy } from './user-economy.entity';

export type OpenKind = 'booster' | 'display';

export type CreditBreakdown = {
  base: number;
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
    display: { cap: 1, rechargeMinutes: 60 * 60 },
  },

  baseByRarity: {
    Terrain: 1,
    Commune: 6,
    'Peu commune': 12,
    Rare: 28,
    'Ultra Rare (U1)': 90,
    'Ultra Rare (U2)': 125,
    'Légendaire bronze': 300,
    'Légendaire argent': 750,
    'Légendaire dorée': 2200,
    'Booster Gold': 130,
    "Gagnant ticket d'or": 25,
    "Ticket d'or": 0,
  } as Record<string, number>,

  newBonusByRarity: {
    Terrain: 10,
    Commune: 15,
    'Peu commune': 30,
    Rare: 80,
    'Ultra Rare (U1)': 220,
    'Ultra Rare (U2)': 320,
    'Légendaire bronze': 750,
    'Légendaire argent': 1800,
    'Légendaire dorée': 6000,
    'Booster Gold': 500,
    "Gagnant ticket d'or": 0,
    "Ticket d'or": 0,
  } as Record<string, number>,

  multipliers: { gtoBooster: 1.5, goldDisplay: 1.25 },
  jackpotTicketOr: 30000,
};

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}
function diffMinutes(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 60_000);
}

@Injectable()
export class EconomyService {
  constructor(
    @InjectRepository(UserEconomy)
    private readonly economyRepo: Repository<UserEconomy>,
  ) {}

  async ensure(userId: number) {
    let row = await this.economyRepo.findOne({ where: { userId } });
    if (!row) {
      row = this.economyRepo.create({
        userId,
        credits: 0,
        signupBonusGranted: 0,
        freeBoosterCharges: ECON.charges.booster.cap,
        freeDisplayCharges: ECON.charges.display.cap,
        boosterRechargeAt: new Date(),
        displayRechargeAt: new Date(),
      });
      row = await this.economyRepo.save(row);
    }
    return row;
  }

  // ✅ Bonus de départ — à appeler lors de la validation email
  async grantSignupBonusIfNeeded(userId: number) {
    const row = await this.ensure(userId);
    if (row.signupBonusGranted) {
      return { granted: false, amount: 0, credits: row.credits };
    }
    row.credits += ECON.SIGNUP_BONUS;
    row.signupBonusGranted = 1;
    await this.economyRepo.save(row);
    return { granted: true, amount: ECON.SIGNUP_BONUS, credits: row.credits };
  }

  private applyRecharge(now: Date, row: UserEconomy) {
    // BOOSTER
    {
      const cap = ECON.charges.booster.cap;
      const step = ECON.charges.booster.rechargeMinutes;
      const last = row.boosterRechargeAt ?? now;
      const elapsed = diffMinutes(now, last);

      if (elapsed > 0 && row.freeBoosterCharges < cap) {
        const gained = Math.floor(elapsed / step);
        if (gained > 0) {
          row.freeBoosterCharges = Math.min(cap, row.freeBoosterCharges + gained);
          row.boosterRechargeAt = addMinutes(last, gained * step);
        }
      }
      if (row.freeBoosterCharges >= cap) row.boosterRechargeAt = now;
    }

    // DISPLAY
    {
      const cap = ECON.charges.display.cap;
      const step = ECON.charges.display.rechargeMinutes;
      const last = row.displayRechargeAt ?? now;
      const elapsed = diffMinutes(now, last);

      if (elapsed > 0 && row.freeDisplayCharges < cap) {
        const gained = Math.floor(elapsed / step);
        if (gained > 0) {
          row.freeDisplayCharges = Math.min(cap, row.freeDisplayCharges + gained);
          row.displayRechargeAt = addMinutes(last, gained * step);
        }
      }
      if (row.freeDisplayCharges >= cap) row.displayRechargeAt = now;
    }
  }

  async getSnapshot(userId: number) {
    const row = await this.ensure(userId);
    const now = new Date();
    this.applyRecharge(now, row);
    await this.economyRepo.save(row);

    return {
      credits: row.credits,
      freeBoosterCharges: row.freeBoosterCharges,
      freeDisplayCharges: row.freeDisplayCharges,
      signupBonusGranted: Boolean(row.signupBonusGranted),
      signupBonusAmount: ECON.SIGNUP_BONUS,
      nextBoosterChargeAt:
        row.freeBoosterCharges >= ECON.charges.booster.cap
          ? null
          : addMinutes(row.boosterRechargeAt ?? now, ECON.charges.booster.rechargeMinutes).toISOString(),
      nextDisplayChargeAt:
        row.freeDisplayCharges >= ECON.charges.display.cap
          ? null
          : addMinutes(row.displayRechargeAt ?? now, ECON.charges.display.rechargeMinutes).toISOString(),
      costs: ECON.cost,
    };
  }

  async consumeOpen(userId: number, kind: OpenKind) {
    const row = await this.ensure(userId);
    const now = new Date();
    this.applyRecharge(now, row);

    if (kind === 'booster') {
      if (row.freeBoosterCharges > 0) {
        row.freeBoosterCharges -= 1;
        await this.economyRepo.save(row);
        return { paid: false, cost: 0 };
      }
      const cost = ECON.cost.booster;
      if (row.credits < cost) throw new Error(`Not enough credits. Need ${cost}, have ${row.credits}`);
      row.credits -= cost;
      await this.economyRepo.save(row);
      return { paid: true, cost };
    }

    // display
    if (row.freeDisplayCharges > 0) {
      row.freeDisplayCharges -= 1;
      await this.economyRepo.save(row);
      return { paid: false, cost: 0 };
    }
    const cost = ECON.cost.display;
    if (row.credits < cost) throw new Error(`Not enough credits. Need ${cost}, have ${row.credits}`);
    row.credits -= cost;
    await this.economyRepo.save(row);
    return { paid: true, cost };
  }

  computeBoosterCredits(args: {
    rarities: string[];
    newCardRarities: string[];
    gtoPresent: boolean;
    ticketOrPresent: boolean;
  }): CreditBreakdown {
    const { rarities, newCardRarities, gtoPresent, ticketOrPresent } = args;

    let base = 0;
    for (const r of rarities) base += ECON.baseByRarity[r] ?? 0;

    let newBonus = 0;
    for (const r of newCardRarities) newBonus += ECON.newBonusByRarity[r] ?? 0;

    let subtotal = base + newBonus;

    const boosterMult = gtoPresent ? ECON.multipliers.gtoBooster : 1;
    subtotal = Math.floor(subtotal * boosterMult);

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
