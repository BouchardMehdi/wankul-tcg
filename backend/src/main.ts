import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 MAIN FILE LOADED');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Middleware qui force les headers CORS sur TOUTES les réponses
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Répond au preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // (Optionnel) enableCors en plus — mais le middleware suffit à lui seul
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(3000);
  console.log('✅ Backend running on http://localhost:3000');
}

bootstrap();