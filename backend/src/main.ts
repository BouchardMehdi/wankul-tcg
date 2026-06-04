import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';

function getCorsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? 'http://localhost:5173';

  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function shouldServeSpa(req: Request) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  const path = (req.path || '/').replace(/\/+$/, '') || '/';
  if (path.startsWith('/api') || path.startsWith('/uploads')) return false;

  // Static files keep their own 404 instead of being transformed into React routes.
  return !/\.[a-z0-9]+$/i.test(path);
}

function createSpaFallback() {
  const indexPath = join(__dirname, '..', 'public', 'index.html');

  return (req: Request, res: Response, next: NextFunction) => {
    if (!shouldServeSpa(req)) {
      next();
      return;
    }

    if (!existsSync(indexPath)) {
      next();
      return;
    }

    res.sendFile(indexPath, (error) => {
      if (error) next(error);
    });
  };
}

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: getCorsOrigins(),
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    },
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.setGlobalPrefix('api');

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use(createSpaFallback());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  console.log(`Wankul TCG API running on port ${port}`);
}

bootstrap();
