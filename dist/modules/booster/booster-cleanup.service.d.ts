import { Repository } from 'typeorm';
import { BoosterOpening } from './booster-opening.entity';
export declare class BoosterCleanupService {
    private readonly repo;
    constructor(repo: Repository<BoosterOpening>);
    cleanupOldOpenings(): Promise<void>;
}
