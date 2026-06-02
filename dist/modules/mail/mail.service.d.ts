type SendBugReportInput = {
    reportId: number;
    username: string;
    email: string;
    category: string;
    page: string;
    feature: string;
    priority: string;
    description: string;
    reproductionSteps?: string;
    currentUrl?: string;
    browserInfo?: string;
    screenshotUrl?: string;
    reportedAt: Date;
};
export declare class MailService {
    private transporter;
    private getFrom;
    private getAppUrl;
    private escapeHtml;
    private resolveLogoPath;
    private getLogoAttachments;
    private buildAuthText;
    private buildLogoHtml;
    private buildAuthHtml;
    private buildAuthMail;
    sendVerificationCode(email: string, username: string, code: string): Promise<void>;
    sendPasswordResetCode(email: string, username: string, code: string): Promise<void>;
    sendBugReport(input: SendBugReportInput): Promise<void>;
}
export {};
