import { User } from '../users/user.entity';
export declare class UserEconomy {
    userId: number;
    user: User;
    credits: number;
    signupBonusGranted: number;
    freeBoosterCharges: number;
    freeDisplayCharges: number;
    boosterRechargeAt: Date | null;
    displayRechargeAt: Date | null;
    lastFreeOpeningsPushAt: Date | null;
    lastFreeBoosterSoonPushForAt: Date | null;
    lastFreeDisplaySoonPushForAt: Date | null;
}
