import { User } from '../users/user.entity';
export declare class BoosterOpening {
    id: number;
    user: User;
    openedAt: Date;
    seasonNumber: number | null;
    seasonLabel: string | null;
    cardIds: number[];
    boosterCount: number;
    resultJson: any;
}
