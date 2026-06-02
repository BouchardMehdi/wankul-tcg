import { UsersService } from './users.service';
import { EconomyService } from '../economy/economy.service';
export declare class MeController {
    private readonly users;
    private readonly economy;
    constructor(users: UsersService, economy: EconomyService);
    me(user: {
        id: number;
    }): Promise<import("./user.entity").User>;
    collection(user: {
        id: number;
    }): Promise<{
        card: import("../cards/card.entity").Card;
        quantity: number;
    }[]>;
    wallet(user: {
        id: number;
    }): Promise<{
        credits: number;
        freeBoosterCharges: number;
        freeDisplayCharges: number;
        costs: {
            readonly booster: 250;
            readonly display: 7000;
        };
    }>;
    addCard(user: {
        id: number;
    }, body: {
        cardId: number;
        quantity?: number;
    }): Promise<{
        ok: boolean;
    }>;
}
