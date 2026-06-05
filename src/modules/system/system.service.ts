import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { readMaintenanceStatus } from './maintenance.config';

@Injectable()
export class SystemService {
  constructor(private readonly config: ConfigService) {}

  private getVersionValue(key: string, fallback: string) {
    const value = this.config.get<string>(key)?.trim();
    return value || fallback;
  }

  getStatus() {
    const appVersion = this.getVersionValue('APP_VERSION', '1.0.0');

    return {
      ...readMaintenanceStatus(this.config),
      appVersion,
      minSupportedAppVersion: this.getVersionValue('MIN_SUPPORTED_APP_VERSION', appVersion),
      googleClientId: this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() || null,
    };
  }
}
