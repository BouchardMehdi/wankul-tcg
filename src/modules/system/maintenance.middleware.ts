import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

import { readMaintenanceStatus } from './maintenance.config';

const ALLOWED_API_PATHS = new Set([
  '/system/status',
  '/auth/login',
  '/auth/google',
  '/auth/refresh',
  '/admin/session/login',
  '/admin/session/refresh',
]);

function getApiPath(req: Request) {
  const rawPath = (req.originalUrl || req.url || '').split('?')[0] || '/';
  const normalizedPath = rawPath.replace(/\/+$/, '') || '/';

  if (!normalizedPath.startsWith('/api')) {
    return null;
  }

  return normalizedPath.slice('/api'.length) || '/';
}

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const status = readMaintenanceStatus(this.config);

    if (!status.maintenanceMode) {
      next();
      return;
    }

    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const apiPath = getApiPath(req);

    if (!apiPath) {
      next();
      return;
    }

    if (ALLOWED_API_PATHS.has(apiPath)) {
      next();
      return;
    }

    if (status.allowAdminBypass && this.hasAdminToken(req)) {
      next();
      return;
    }

    res.status(503).json({
      statusCode: 503,
      code: 'MAINTENANCE_MODE',
      message: status.message,
      maintenance: status,
    });
  }

  private hasAdminToken(req: Request) {
    const token = getBearerToken(req);
    if (!token) return false;

    return (
      this.verifyAdminToken(token, this.config.get<string>('ADMIN_JWT_SECRET'), 'admin') ||
      this.verifyAdminToken(token, this.config.get<string>('JWT_SECRET'), 'player')
    );
  }

  private verifyAdminToken(
    token: string,
    rawSecret: string | undefined,
    expectedScope: 'admin' | 'player',
  ) {
    const secret = rawSecret?.trim();
    if (!secret) return false;

    try {
      const payload = jwt.verify(token, secret);
      if (!payload || typeof payload === 'string') return false;

      return payload.role === 'admin' && payload.scope === expectedScope;
    } catch {
      return false;
    }
  }
}
