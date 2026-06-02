import { Test, TestingModule } from '@nestjs/testing';
import { BoosterService } from './booster.service';

describe('BoosterService', () => {
  let service: BoosterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoosterService],
    }).compile();

    service = module.get<BoosterService>(BoosterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
