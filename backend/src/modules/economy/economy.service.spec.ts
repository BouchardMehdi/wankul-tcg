import { Test, TestingModule } from '@nestjs/testing';
import { EconomyService } from './economy.service';

describe('EconomyService', () => {
  let service: EconomyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EconomyService],
    }).compile();

    service = module.get<EconomyService>(EconomyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
