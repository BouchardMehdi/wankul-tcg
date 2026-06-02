import { Repository } from 'typeorm';
import { Card } from './card.entity';
import { ListCardsQueryDto } from './dto/list-cards.query';
export declare class CardsService {
    private readonly repo;
    constructor(repo: Repository<Card>);
    list(query: ListCardsQueryDto): Promise<{
        page: number;
        limit: number;
        total: number;
        pages: number;
        items: Card[];
    }>;
    findByIdOrFail(id: number): Promise<Card>;
    findByKeyOrFail(input: string): Promise<Card>;
    getByKey(key: string): Promise<Card | null>;
    meta(): Promise<{
        seasonNumbers: number[];
        rarities: any[];
        types: any[];
        gameplayTypes: any[];
    }>;
}
