import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function typeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    synchronize: true,   // dev
    logging: false,
    charset: 'utf8mb4',
  };
}

