export declare class ListCardsQueryDto {
    page?: number;
    limit?: number;
    q?: string;
    seasonNumber?: number;
    rarity?: string;
    type?: string;
    gameplayType?: string;
    specialEdition?: string;
    sort?: 'name' | 'rarity' | 'seasonNumber' | 'number';
    order?: 'ASC' | 'DESC';
}
