export type EconomicActionStatus = 'allowed' | 'flagged' | 'blocked';
export type EconomicActionSeverity = 'info' | 'watch' | 'danger';
export declare class EconomicActionLog {
    id: number;
    userId: number | null;
    relatedUserId: number | null;
    cardId: number | null;
    action: string;
    status: EconomicActionStatus;
    severity: EconomicActionSeverity;
    targetType: string | null;
    targetId: number | null;
    valueCredits: number;
    reason: string | null;
    metadata: Record<string, any> | null;
    createdAt: Date;
}
