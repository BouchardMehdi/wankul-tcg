import { BugReport } from './bug-report.entity';
export declare class BugReportStatusHistory {
    id: number;
    report: BugReport;
    reportId: number;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedBy: string;
    changedAt: Date;
}
