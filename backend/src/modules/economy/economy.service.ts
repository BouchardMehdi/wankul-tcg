import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEconomy } from './user-economy.entity';
import { User } from '../users/user.entity';
import { MarketPricingService } from '../market/market-pricing.service';
import { ECONOMY_RULES } from './economy.constants';
import { applyEconomyRecharge, ensureRechargeDates } from './economy.utils';
import { AntiAbuseService } from '../security/anti-abuse.service';

export type OpenKind = 'booster' | 'display';

export type CreditBreakdown = {
  base: number;
  newCardBonus: number;
  boosterMultiplierApplied?: number;
  displayMultiplierApplied?: number;
  ticketGoldJackpot?: number;
  total: number;
};

type EconomyGrantLogOptions = {
  source?: string;
  reason?: string;
  skipLog?: boolean;
  targetType?: string | null;
  targetId?: number | null;
  relatedUserId?: number | null;
  cardId?: number | null;
  metadata?: Record<string, any>;
};

@Injectable()
export class EconomyService {
  constructor(
    @InjectRepository(UserEconomy)
    private readonly economyRepo: Repository<UserEconomy>,
    private readonly marketPricingService: MarketPricingService,
    private readonly antiAbuseService: AntiAbuseService,
  ) {}

  getCosts() {
    return ECONOMY_RULES.cost;
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
        freeBoosterCharges: ECONOMY_RULES.charges.booster.cap,
        freeDisplayCharges: ECONOMY_RULES.charges.display.cap,
        boosterRechargeAt: now,
        displayRechargeAt: now,
        lastFreeOpeningsPushAt: null,
      });
    }

    ensureRechargeDates(row, new Date());
    return await this.economyRepo.save(row);
  }

  async getSnapshot(userId: number) {
    const row = await this.ensure(userId);
    applyEconomyRecharge(row);
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
    applyEconomyRecharge(row);

    const cost = ECONOMY_RULES.cost[kind];

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

    if (row.credits < cost) throw new ForbiddenException('WunkulCoins insuffisants');
    row.credits -= cost;
    await this.economyRepo.save(row);

    return { kind, usedFree: false, cost };
  }

  async computeBoosterCredits(args: {
    cards: Array<{ id: number; rarity: string }>;
    newCardIds: number[];
    gtoPresent: boolean;
    ticketOrPresent: boolean;
    ticketOrIsNew: boolean;
  }): Promise<CreditBreakdown> {
    const { cards, newCardIds, gtoPresent, ticketOrPresent, ticketOrIsNew } = args;

    const uniqueCardIds = Array.from(new Set(cards.map((card) => card.id)));
    const pricingEntries = await Promise.all(
      uniqueCardIds.map(async (cardId) => [cardId, await this.marketPricingService.getRewardQuote(cardId)] as const),
    );
    const pricingByCardId = new Map(pricingEntries);

    let duplicateTotal = 0;
    for (const card of cards) {
      const quote = pricingByCardId.get(card.id);
      if (!quote) continue;
      duplicateTotal += quote.duplicateRewardValue;
    }

    let duplicatePartToRemoveForNewCards = 0;
    let newCardsTotal = 0;

    for (const cardId of Array.from(new Set(newCardIds))) {
      const quote = pricingByCardId.get(cardId);
      if (!quote) continue;
      duplicatePartToRemoveForNewCards += quote.duplicateRewardValue;
      newCardsTotal += quote.newRewardValue;
    }

    const base = Math.max(0, duplicateTotal - duplicatePartToRemoveForNewCards);
    const newBonus = newCardsTotal;

    let subtotal = base + newBonus;

    const boosterMult = gtoPresent ? ECONOMY_RULES.multipliers.gtoBooster : 1;
    subtotal = Math.floor(subtotal * boosterMult);

    const jackpot =
      ticketOrPresent && ticketOrIsNew ? ECONOMY_RULES.jackpotTicketOr : 0;

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

    const displayMult = args.goldMultiplier
      ? ECONOMY_RULES.multipliers.goldDisplay
      : 1;
    const after = Math.floor(subtotalNoJackpot * displayMult);

    return {
      base,
      newCardBonus: newBonus,
      displayMultiplierApplied: args.goldMultiplier ? displayMult : undefined,
      ticketGoldJackpot: jackpot || undefined,
      total: after + jackpot,
    };
  }

  async addCredits(userId: number, amount: number, options: EconomyGrantLogOptions = {}) {
    if (!amount) return;
    const row = await this.ensure(userId);
    row.credits += amount;
    await this.economyRepo.save(row);

    if (!options.skipLog) {
      await this.antiAbuseService.logAction({
        userId,
        relatedUserId: options.relatedUserId ?? null,
        cardId: options.cardId ?? null,
        action:
          options.source ??
          (options.reason === 'signup_verified'
            ? 'SIGNUP_BONUS'
            : 'ECONOMY_CREDITS_ADD'),
        status: 'allowed',
        severity: 'info',
        targetType: options.targetType ?? null,
        targetId: options.targetId ?? null,
        valueCredits: amount,
        reason: options.reason ?? null,
        metadata: {
          ...(options.metadata ?? {}),
          amount,
          balanceAfter: row.credits,
        },
      });
    }
  }

  async grantSignupBonusIfNeeded(userId: number) {
    const row = await this.ensure(userId);
    const amount = ECONOMY_RULES.signupBonus;

    if (row.signupBonusGranted) {
      return {
        granted: false,
        amount,
        credits: row.credits,
      };
    }

    row.credits += amount;
    row.signupBonusGranted = 1;
    await this.economyRepo.save(row);

    await this.antiAbuseService.logAction({
      userId,
      action: 'SIGNUP_BONUS',
      status: 'allowed',
      severity: 'info',
      targetType: 'user',
      targetId: userId,
      valueCredits: amount,
      reason: 'signup_verified',
      metadata: {
        amount,
        balanceAfter: row.credits,
      },
    });

    return {
      granted: true,
      amount,
      credits: row.credits,
    };
  }

  async addFreeBoosters(userId: number, amount: number, options: EconomyGrantLogOptions = {}) {
    if (!amount) return;

    const row = await this.ensure(userId);
    row.freeBoosterCharges = Math.min(127, row.freeBoosterCharges + amount);
    await this.economyRepo.save(row);

    if (!options.skipLog) {
      await this.antiAbuseService.logAction({
        userId,
        relatedUserId: options.relatedUserId ?? null,
        cardId: options.cardId ?? null,
        action: options.source ?? 'ECONOMY_FREE_BOOSTER_ADD',
        status: 'allowed',
        severity: 'info',
        targetType: options.targetType ?? null,
        targetId: options.targetId ?? null,
        valueCredits: 0,
        reason: options.reason ?? null,
        metadata: {
          ...(options.metadata ?? {}),
          freeBoosters: amount,
          balanceAfter: row.freeBoosterCharges,
        },
      });
    }
  }
}
