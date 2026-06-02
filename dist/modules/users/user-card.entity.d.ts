import { User } from './user.entity';
import { Card } from '../cards/card.entity';
export declare class UserCard {
    id: number;
    user: User;
    card: Card;
    quantity: number;
    quantityLocked: number;
}
