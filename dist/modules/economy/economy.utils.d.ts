import { UserEconomy } from './user-economy.entity';
export declare function minutesBetween(a: Date, b: Date): number;
export declare function ensureRechargeDates(row: UserEconomy, now: Date): void;
export declare function applyEconomyRecharge(row: UserEconomy, now?: Date): void;
