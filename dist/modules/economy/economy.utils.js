"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minutesBetween = minutesBetween;
exports.ensureRechargeDates = ensureRechargeDates;
exports.applyEconomyRecharge = applyEconomyRecharge;
const economy_constants_1 = require("./economy.constants");
function minutesBetween(a, b) {
    return (b.getTime() - a.getTime()) / 60000;
}
function ensureRechargeDates(row, now) {
    if (!row.boosterRechargeAt)
        row.boosterRechargeAt = now;
    if (!row.displayRechargeAt)
        row.displayRechargeAt = now;
}
function applyEconomyRecharge(row, now = new Date()) {
    ensureRechargeDates(row, now);
    if (row.freeBoosterCharges < economy_constants_1.ECONOMY_RULES.charges.booster.cap) {
        const mins = minutesBetween(row.boosterRechargeAt, now);
        const add = Math.floor(mins / economy_constants_1.ECONOMY_RULES.charges.booster.rechargeMinutes);
        if (add > 0) {
            row.freeBoosterCharges = Math.min(economy_constants_1.ECONOMY_RULES.charges.booster.cap, row.freeBoosterCharges + add);
            row.boosterRechargeAt = new Date(row.boosterRechargeAt.getTime() +
                add * economy_constants_1.ECONOMY_RULES.charges.booster.rechargeMinutes * 60000);
        }
    }
    else {
        row.boosterRechargeAt = now;
    }
    if (row.freeDisplayCharges < economy_constants_1.ECONOMY_RULES.charges.display.cap) {
        const mins = minutesBetween(row.displayRechargeAt, now);
        const add = Math.floor(mins / economy_constants_1.ECONOMY_RULES.charges.display.rechargeMinutes);
        if (add > 0) {
            row.freeDisplayCharges = Math.min(economy_constants_1.ECONOMY_RULES.charges.display.cap, row.freeDisplayCharges + add);
            row.displayRechargeAt = new Date(row.displayRechargeAt.getTime() +
                add * economy_constants_1.ECONOMY_RULES.charges.display.rechargeMinutes * 60000);
        }
    }
    else {
        row.displayRechargeAt = now;
    }
}
//# sourceMappingURL=economy.utils.js.map