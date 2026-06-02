import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserCard } from './user-card.entity';
import { EconomyService } from '../economy/economy.service';
export declare class UsersService {
    private readonly usersRepo;
    private readonly userCardsRepo;
    private readonly dataSource;
    private readonly economy;
    constructor(usersRepo: Repository<User>, userCardsRepo: Repository<UserCard>, dataSource: DataSource, economy: EconomyService);
    findByIdOrFail(id: number): Promise<User>;
    findByUsername(username: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    createUser(data: Partial<User>): Promise<User>;
    getOwnedMap(userId: number, cardIds: number[]): Promise<Map<number, number>>;
    addCardsToUserBulk(userId: number, cardIds: number[], manager?: EntityManager): Promise<void>;
    addCardToUser(userId: number, cardId: number, quantity?: number): Promise<{
        ok: boolean;
    }>;
    getCollection(userId: number): Promise<{
        card: import("../cards/card.entity").Card;
        quantity: number;
    }[]>;
}
