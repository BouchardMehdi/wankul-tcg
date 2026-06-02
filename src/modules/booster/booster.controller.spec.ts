import { Test, TestingModule } from '@nestjs/testing';
import { BoosterController } from './booster.controller';

describe('BoosterController', () => {
  let controller: BoosterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoosterController],
    }).compile();

    controller = module.get<BoosterController>(BoosterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
