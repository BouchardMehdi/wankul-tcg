import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
declare const AdminJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class AdminJwtStrategy extends AdminJwtStrategy_base {
    private readonly config;
    private readonly usersRepo;
    constructor(config: ConfigService, usersRepo: Repository<User>);
    validate(payload: any): Promise<{
        id: number;
        username: string;
        role: import("../users/user.entity").UserRole;
        scope: any;
    }>;
}
export {};
