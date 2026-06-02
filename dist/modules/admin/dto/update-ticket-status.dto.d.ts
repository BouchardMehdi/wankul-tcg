export declare class UpdateTicketStatusDto {
    status: 'open' | 'investigating' | 'planned' | 'fixed' | 'closed' | 'rejected';
    note?: string;
}
