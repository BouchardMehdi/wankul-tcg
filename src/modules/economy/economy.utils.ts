import { UserEconomy } from './user-economy.entity';
import { ECONOMY_RULES } from './economy.constants';

export function minutesBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 60000;
}

export function ensureRechargeDates(row: UserEconomy, now: Date) {
  if (!row.boosterRechargeAt) row.boosterRechargeAt = now;
  if (!row.displayRechargeAt) row.displayRechargeAt = now;
}

export function applyEconomyRecharge(row: UserEconomy, now = new Date()) {
  ensureRechargeDates(row, now);

  if (row.freeBoosterCharges < ECONOMY_RULES.charges.booster.cap) {
    const mins = minutesBetween(row.boosterRechargeAt!, now);
    const add = Math.floor(mins / ECONOMY_RULES.charges.booster.rechargeMinutes);

    if (add > 0) {
      row.freeBoosterCharges = Math.min(
        ECONOMY_RULES.charges.booster.cap,
        row.freeBoosterCharges + add,
      );
      row.boosterRechargeAt = new Date(
        row.boosterRechargeAt!.getTime() +
          add * ECONOMY_RULES.charges.booster.rechargeMinutes * 60000,
      );
    }
  } else {
    row.boosterRechargeAt = now;
  }

  if (row.freeDisplayCharges < ECONOMY_RULES.charges.display.cap) {
    const mins = minutesBetween(row.displayRechargeAt!, now);
    const add = Math.floor(mins / ECONOMY_RULES.charges.display.rechargeMinutes);

    if (add > 0) {
      row.freeDisplayCharges = Math.min(
        ECONOMY_RULES.charges.display.cap,
        row.freeDisplayCharges + add,
      );
      row.displayRechargeAt = new Date(
        row.displayRechargeAt!.getTime() +
          add * ECONOMY_RULES.charges.display.rechargeMinutes * 60000,
      );
    }
  } else {
    row.displayRechargeAt = now;
  }
}
