export declare class PushDeliveryLogEntity {
    id: number;
    userId: number | null;
    subscriptionId: number | null;
    endpointHash: string | null;
    kind: string;
    tag: string | null;
    title: string | null;
    url: string | null;
    status: 'sent' | 'failed';
    statusCode: number | null;
    errorMessage: string | null;
    createdAt: Date;
}
