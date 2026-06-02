import { Card } from '../cards/card.entity';
export declare class MarketPriceHistory {
    id: number;
    cardId: number;
    card: Card;
    price: number;
    sourceLabel: string;
    recordedAt: Date;
    createdAt: Date;
}
