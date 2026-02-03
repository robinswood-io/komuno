import { INestApplication } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger';
import { db, pool } from '../../db';

/**
 * Configuration du graceful shutdown pour l'application
 * Gère proprement l'arrêt de l'application lors de signaux système
 */
export function setupGracefulShutdown(app: INestApplication) {
  let isShuttingDown = false;
  
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`[Graceful Shutdown] Déjà en cours d'arrêt, signal ${signal} ignoré`);
      return;
    }
    
    isShuttingDown = true;
    logger.info(`[Graceful Shutdown] Signal ${signal} reçu, début de l'arrêt gracieux...`);
    
    // Marquer l'application comme "not ready" pour les health checks
    process.env.APP_SHUTTING_DOWN = 'true';
    
    try {
      // 1. Arrêter d'accepter de nouvelles connexions
      logger.info('[Graceful Shutdown] Arrêt des nouvelles connexions...');
      
      // 2. Attendre que les requêtes en cours se terminent (max 10s)
      logger.info('[Graceful Shutdown] Attente de la fin des requêtes en cours (max 10s)...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // 3. Fermer l'application NestJS
      logger.info('[Graceful Shutdown] Fermeture de l\'application NestJS...');
      await app.close();
      
      // 4. Fermer le pool de connexions PostgreSQL
      logger.info('[Graceful Shutdown] Fermeture du pool PostgreSQL...');
      try {
        await pool.end();
        logger.info('[Graceful Shutdown] ✅ Pool PostgreSQL fermé');
      } catch (error) {
        logger.error('[Graceful Shutdown] ❌ Erreur lors de la fermeture du pool', { error });
      }
      
      // 5. Autres nettoyages si nécessaire
      logger.info('[Graceful Shutdown] Nettoyages finaux...');
      
      logger.info('[Graceful Shutdown] ✅ Arrêt gracieux terminé avec succès');
      process.exit(0);
    } catch (error) {
      logger.error('[Graceful Shutdown] ❌ Erreur lors de l\'arrêt gracieux', { error });
      process.exit(1);
    }
  };
  
  // Écouter les signaux système
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Gérer les erreurs non catchées
  process.on('uncaughtException', (error) => {
    logger.error('[Uncaught Exception] Erreur non gérée détectée', { error });
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[Unhandled Rejection] Promise rejetée non gérée', {
      reason,
      promise,
    });
    // Ne pas arrêter l'application pour une rejection non gérée en production
    if (process.env.NODE_ENV !== 'production') {
      shutdown('UNHANDLED_REJECTION');
    }
  });
  
  logger.info('[Graceful Shutdown] ✅ Gestionnaire d\'arrêt gracieux configuré');
}

/**
 * Middleware pour rejeter les requêtes pendant le shutdown
 */
export function rejectDuringShutdown() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.APP_SHUTTING_DOWN === 'true') {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Server is shutting down',
      });
    } else {
      next();
    }
  };
}
