import { Test, TestingModule } from '@nestjs/testing';
import { EconomyController } from './economy.controller';

describe('EconomyController', () => {
  let controller: EconomyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EconomyController],
    }).compile();

    controller = module.get<EconomyController>(EconomyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
