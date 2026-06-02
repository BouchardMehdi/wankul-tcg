import { PushService } from './push.service';
export declare class PushScheduler {
    private readonly pushService;
    private readonly logger;
    constructor(pushService: PushService);
    handleRealtimeNotificationCron(): Promise<void>;
    handleDailyRecapCron(): Promise<void>;
}
