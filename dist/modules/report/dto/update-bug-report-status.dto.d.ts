export declare class UpdateBugReportStatusDto {
    status: 'open' | 'investigating' | 'planned' | 'fixed' | 'closed' | 'rejected';
    note?: string;
    changedBy?: string;
}
