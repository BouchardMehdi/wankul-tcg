"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = typeOrmConfig;
function booleanEnv(value, fallback) {
    if (value === undefined)
        return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}
function typeOrmConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        type: 'mysql',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 3306),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        autoLoadEntities: true,
        synchronize: booleanEnv(process.env.DB_SYNCHRONIZE, !isProduction),
        logging: booleanEnv(process.env.DB_LOGGING, false),
        charset: 'utf8mb4',
    };
}
//# sourceMappingURL=typeorm.config.js.map