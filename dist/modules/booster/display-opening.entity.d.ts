import { User } from '../users/user.entity';
export declare class DisplayOpening {
    id: number;
    user: User;
    openedAt: Date;
    seasonNumber: number | null;
    season: string | null;
    boosterCount: number;
    resultJson: any;
}
