import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bar Depot Management API')
    .setDescription('API for managing bar and depot operations in Cameroon')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  const rawFrontend = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  // Browsers send Origin without a trailing slash; env often has one — normalize so CORS matches.
  const frontendUrl = rawFrontend.trim().replace(/\/+$/, '') || 'http://localhost:3000';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  const productUploads = join(process.cwd(), 'uploads', 'products');
  if (!existsSync(productUploads)) mkdirSync(productUploads, { recursive: true });
  app.useStaticAssets(productUploads, { prefix: '/api/uploads/products/' });

  // Root URL (e.g. opening Railway domain in browser) — all JSON routes are under /api
  const expressApp = app.getHttpAdapter().getInstance() as {
    get: (path: string, handler: (req: unknown, res: { json: (b: unknown) => void }) => void) => void;
  };
  expressApp.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'bar-depot-api',
      message: 'API is running. JSON endpoints are under /api.',
      health: '/api/health',
      docs: '/api/docs',
    });
  });

  await app.listen(port, '0.0.0.0');
  const env = process.env.NODE_ENV ?? 'development';
  console.log(`API listening on port ${port} (${env})`);
  if (env === 'development') {
    console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
