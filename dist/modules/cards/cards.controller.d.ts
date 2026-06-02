import { CardsService } from './cards.service';
import { ListCardsQueryDto } from './dto/list-cards.query';
export declare class CardsController {
    private readonly cards;
    constructor(cards: CardsService);
    list(query: ListCardsQueryDto): Promise<{
        page: number;
        limit: number;
        total: number;
        pages: number;
        items: import("./card.entity").Card[];
    }>;
    meta(): Promise<{
        seasonNumbers: number[];
        rarities: any[];
        types: any[];
        gameplayTypes: any[];
    }>;
    getById(id: number): Promise<import("./card.entity").Card>;
    getByKey(key: string): Promise<import("./card.entity").Card>;
}
