// IMPORTANT: reflect-metadata MUST be imported first for NestJS DI to work
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { logger } from './lib/logger';
import { MinIOService } from './src/integrations/minio/minio.service';
import { startPoolMonitoring } from './utils/db-health';
import { startAutoSync } from './utils/auto-sync';
import { startTrackingAlertsGeneration } from './utils/tracking-scheduler';
import { AuthService } from './src/auth/auth.service';
import { validateEnvironment, checkExternalDependencies } from './src/config/env-validation';
import { setupGracefulShutdown, rejectDuringShutdown } from './src/config/graceful-shutdown';
import { getHelmetConfig } from './src/config/security-middleware';
import session from 'express-session';
import passport from 'passport';
import type { Express } from 'express';
// Import types for Express.User extension
import type { Admin } from '@shared/schema';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  // 1. Valider les variables d'environnement au démarrage (fail-fast)
  logger.info('======================================');
  logger.info('🚀 Démarrage de l\'application CJD80');
  logger.info('======================================');

  try {
    validateEnvironment();
  } catch (error) {
    logger.error('❌ Erreur de validation des variables d\'environnement', { error });
    process.exit(1);
  }

  try {
    checkExternalDependencies();
  } catch (error) {
    logger.error('❌ Erreur lors de la vérification des dépendances externes', { error });
    process.exit(1);
  }

  // 2. Créer l'app NestJS
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  // 3. Configurer la sécurité (helmet)
  const helmetConfig = getHelmetConfig();
  if (helmetConfig) {
    const helmet = require('helmet').default;
    expressApp.use(helmet(helmetConfig));
  }

  // 4. Configurer session + Passport
  expressApp.use(
    session({
      secret: process.env.SESSION_SECRET || 'test-secret-dev-only',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
      }
    })
  );
  expressApp.use(passport.initialize());
  expressApp.use(passport.session());

  // 5. Configurer Swagger
  const config = new DocumentBuilder()
    .setTitle('CJD80 API')
    .setDescription('API CJD80 - Club des Jeunes Dirigeants')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 6. Initialiser MinIO (optionnel)
  try {
    const minioService = app.get(MinIOService);
    if (minioService) {
      await minioService.ensureBuckets();
      logger.info('[MinIO] Buckets initialized');
    }
    // Ne pas bloquer le démarrage si MinIO échoue
  } catch (error) {
    logger.warn('[MinIO] Failed to initialize MinIO', { error });
    // Ne pas bloquer le démarrage si MinIO échoue
  }
  console.log('[DEBUG] MinIO initialization completed');

  // 6. Démarrer le serveur HTTP
  console.log('[DEBUG] Starting HTTP server on port', process.env.PORT || '5000');
  const port = parseInt(process.env.PORT || '5000', 10);
  const httpServer = await app.listen(port, '0.0.0.0');
  console.log('[DEBUG] HTTP server started successfully');

  logger.info('======================================');
  logger.info(`✅ Application démarrée avec succès`);
  logger.info(`🌐 URL: http://0.0.0.0:${port}`);
  logger.info(`📦 Environnement: ${process.env.NODE_ENV || 'development'}`);
  logger.info('======================================');

  // 7. Démarrer les services en arrière-plan
  logger.info('[Background Services] Démarrage des services en arrière-plan...');

  // Pool monitoring
  try {
    startPoolMonitoring();
  } catch (error) {
    logger.error('[Background Services] Failed to start pool monitoring', { error });
  }

  // Auto-sync
  try {
    startAutoSync();
    logger.info('[Background Services] Auto-sync started');
  } catch (error) {
    logger.error('[Background Services] Failed to start auto-sync', { error });
  }

  // Tracking alerts generation
  try {
    startTrackingAlertsGeneration();
    logger.info('[Background Services] Tracking alerts scheduler started');
  } catch (error) {
    logger.error('[Background Services] Failed to start tracking alerts scheduler', { error });
  }

  // 9. Setup graceful shutdown
  setupGracefulShutdown(app);
}

bootstrap().catch((error) => {
  logger.error('❌ Erreur fatale lors du démarrage de l\'application', { error });
  process.exit(1);
});
