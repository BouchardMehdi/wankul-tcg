export declare class ReportBugDto {
    category: string;
    page: string;
    feature: string;
    priority: string;
    description: string;
    reproductionSteps?: string;
    currentUrl?: string;
    browserInfo?: string;
    screenshotDataUrl?: string;
    screenshotFilename?: string;
}
