import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { readMaintenanceStatus } from './maintenance.config';

@Injectable()
export class SystemService {
  constructor(private readonly config: ConfigService) {}

  getStatus() {
    return readMaintenanceStatus(this.config);
  }
}
