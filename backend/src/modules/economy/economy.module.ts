import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EconomyService } from './economy.service';
import { EconomyController } from './economy.controller';
import { UserEconomy } from './user-economy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEconomy])],
  providers: [EconomyService],
  controllers: [EconomyController],
  exports: [EconomyService, TypeOrmModule],
})
export class EconomyModule {}
