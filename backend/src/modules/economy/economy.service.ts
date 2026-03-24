import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEconomy } from './user-economy.entity';
import { User } from '../users/user.entity';
import {
  DEFAULT_MARKET_BASE_VALUE,
  MARKET_RARITY_BASE_VALUES,
} from '../market/constants/market-rarity-values';

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

  cost: { booster: 200, display: 4800 },

  charges: {
    booster: { cap: 4, rechargeMinutes: 90 },
    display: { cap: 1, rechargeMinutes: 60 * 60 },
  },

  /**
   * Logique économique post-market :
   * - doublon = ~25% de la valeur marché
   * - nouvelle carte = ~135% de la valeur marché
   *
   * Ça garde l’ouverture intéressante sans rendre le market inutile.
   */
  rates: {
    duplicateFromMarket: 0.25,
    newFromMarket: 1.35,
  },

  multipliers: {
    gtoBooster: 1.35,
    goldDisplay: 1.15,
  },

  jackpotTicketOr: 6000,
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

  private normalizeRarity(rarity: string): string {
    switch (rarity) {
      case 'Ultra Rare (U1)':
        return 'U1';
      case 'Ultra Rare (U2)':
        return 'U2';
      case 'Légendaire dorée':
        return 'Légendaire dorée';
      default:
        return rarity;
    }
  }

  private getMarketBaseValue(rarity: string): number {
    const normalized = this.normalizeRarity(rarity);
    return MARKET_RARITY_BASE_VALUES[normalized] ?? DEFAULT_MARKET_BASE_VALUE;
  }

  private getDuplicateCreditsForRarity(rarity: string): number {
    const normalized = this.normalizeRarity(rarity);

    if (normalized === 'Terrain') return 0;
    if (normalized === "Ticket d'or") return 0;

    const marketValue = this.getMarketBaseValue(normalized);
    return Math.max(0, Math.floor(marketValue * ECON.rates.duplicateFromMarket));
  }

  private getNewCreditsForRarity(rarity: string): number {
    const normalized = this.normalizeRarity(rarity);

    if (normalized === 'Terrain') return 6;
    if (normalized === "Ticket d'or") return 0;

    const marketValue = this.getMarketBaseValue(normalized);
    return Math.max(0, Math.floor(marketValue * ECON.rates.newFromMarket));
  }

  async ensure(userId: number): Promise<UserEconomy> {
    let row = await this.economyRepo.findOne({ where: { userId } });

    if (!row) {
      const now = new Date();

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

  computeBoosterCredits(args: {
    rarities: string[];
    newCardRarities: string[];
    gtoPresent: boolean;
    ticketOrPresent: boolean;
    ticketOrIsNew: boolean;
  }): CreditBreakdown {
    const { rarities, newCardRarities, gtoPresent, ticketOrPresent, ticketOrIsNew } = args;

    let duplicateTotal = 0;
    for (const rarity of rarities) {
      duplicateTotal += this.getDuplicateCreditsForRarity(rarity);
    }

    let duplicatePartToRemoveForNewCards = 0;
    let newCardsTotal = 0;

    for (const rarity of newCardRarities) {
      duplicatePartToRemoveForNewCards += this.getDuplicateCreditsForRarity(rarity);
      newCardsTotal += this.getNewCreditsForRarity(rarity);
    }

    const base = Math.max(0, duplicateTotal - duplicatePartToRemoveForNewCards);
    const newBonus = newCardsTotal;

    let subtotal = base + newBonus;

    const boosterMult = gtoPresent ? ECON.multipliers.gtoBooster : 1;
    subtotal = Math.floor(subtotal * boosterMult);

    const jackpot = ticketOrPresent && ticketOrIsNew ? ECON.jackpotTicketOr : 0;

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