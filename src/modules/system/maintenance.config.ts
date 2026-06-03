import { ConfigService } from '@nestjs/config';

export type MaintenanceStatus = {
  maintenanceMode: boolean;
  allowAdminBypass: boolean;
  message: string;
  eta: string | null;
  sealLabel: string;
  sealText: string;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function readBoolean(value: string | undefined, fallback: boolean) {
  const normalized = (value ?? '').trim().toLowerCase();

  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return fallback;
}

export function readMaintenanceStatus(config: ConfigService): MaintenanceStatus {
  const maintenanceMode = readBoolean(config.get<string>('MAINTENANCE_MODE'), false);
  const allowAdminBypass = readBoolean(
    config.get<string>('MAINTENANCE_ALLOW_ADMIN'),
    true,
  );

  return {
    maintenanceMode,
    allowAdminBypass,
    message:
      config.get<string>('MAINTENANCE_MESSAGE')?.trim() ||
      'Wankul TCG prépare une mise à jour. Les boosters reviennent très vite.',
    eta: config.get<string>('MAINTENANCE_ETA')?.trim() || null,
    sealLabel: config.get<string>('MAINTENANCE_SEAL_LABEL')?.trim() || 'Update',
    sealText:
      config.get<string>('MAINTENANCE_SEAL_TEXT')?.trim() ||
      'Mode test admin actif',
  };
}
