/**
 * EXEMPLE D'UTILISATION DU DATABASE POOLING
 *
 * Ce fichier démontre comment utiliser:
 * - Les profils de timeout (runDbQuery)
 * - Le monitoring du pool
 * - Les alertes de saturation
 *
 * À adapter selon vos besoins.
 */

import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE } from './database.providers';
import { sql } from 'drizzle-orm';
import { runDbQuery } from '../../../db';
import {
  checkPoolHealth,
  getPoolSummary,
  getPoolMetrics,
  isPoolCritical,
  suggestTimeout,
} from '../../../utils/database-config.utils';
import { logger } from '../../../lib/logger';
import type { DrizzleDb } from './types';

/**
 * Service exemple montrant les bonnes pratiques
 */
@Injectable()
export class DatabasePoolExampleService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDb) {
    this.startPoolMonitoring();
  }

  /**
   * EXEMPLE 1: Utiliser les profils de timeout
   *
   * Les profils permettent d'adapter automatiquement le timeout
   * et le retry en fonction du type de requête
   */
  async exampleQuickQuery() {
    try {
      // Requête rapide (2s timeout, pas de retry)
      const count = await runDbQuery(
        async () => {
          const result = await this.db.execute(sql`SELECT COUNT(*) as count FROM users`);
          return result;
        },
        'quick' // ← Profil pour requêtes simples
      );

      logger.info('Quick query result', { count });
      return count;
    } catch (error) {
      logger.error('Quick query failed', { error });
      throw error;
    }
  }

  /**
   * EXEMPLE 2: Requête standard avec retry automatique
   */
  async exampleNormalQuery(userId: number) {
    try {
      // Requête standard (5s timeout, avec retry)
      const user = await runDbQuery(
        async () => {
          return this.db.execute(
            sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
          );
        },
        'normal' // ← Profil pour requêtes standards
      );

      logger.info('User retrieved', { userId, user });
      return user;
    } catch (error) {
      logger.error('Normal query failed', { error, userId });
      throw error;
    }
  }

  /**
   * EXEMPLE 3: Requête complexe (INSERT/UPDATE/DELETE)
   */
  async exampleComplexQuery(userData: any) {
    try {
      // Requête complexe (10s timeout, avec retry)
      const result = await runDbQuery(
        async () => {
          return this.db.execute(
            sql`INSERT INTO users (name, email) VALUES (${userData.name}, ${userData.email}) RETURNING *`
          );
        },
        'complex' // ← Profil pour opérations complexes
      );

      logger.info('Complex query completed', { result });
      return result;
    } catch (error) {
      logger.error('Complex query failed', { error });
      throw error;
    }
  }

  /**
   * EXEMPLE 4: Timeout adaptatif basé sur la charge du pool
   *
   * Suggestion: utiliser suggestTimeout() pour adapter automatiquement
   * le timeout en fonction de la charge
   */
  async exampleAdaptiveTimeout() {
    try {
      const baseProfile = 'normal';
      const adaptiveTimeout = suggestTimeout(baseProfile);

      logger.info('Using adaptive timeout', {
        baseProfile,
        adaptiveTimeout,
        poolSummary: getPoolSummary(),
      });

      // Utiliser le timeout adaptatif
      const result = await runDbQuery(
        async () => {
          return this.db.execute(sql`SELECT 1`);
        },
        baseProfile
      );

      return result;
    } catch (error) {
      logger.error('Adaptive timeout query failed', { error });
      throw error;
    }
  }

  /**
   * EXEMPLE 5: Monitoring et alertes du pool
   */
  async examplePoolMonitoring() {
    // Vérifier la santé du pool
    const alert = checkPoolHealth();

    if (alert) {
      logger.warn('Pool alert detected', {
        severity: alert.severity,
        message: alert.message,
        utilization: alert.utilization,
      });

      // Actions possibles selon la sévérité
      if (alert.severity === 'critical') {
        // Implémenter une logique de circuit breaker
        // ex: refuser les nouvelles requêtes, alerter les opérations
        logger.error('POOL CRITICAL - Action required', alert);
      }
    }

    // Résumé formaté du pool
    const summary = getPoolSummary();
    logger.info('Pool summary', { summary });

    // Métriques détaillées
    const metrics = getPoolMetrics();
    logger.info('Pool metrics', metrics);

    return {
      alert,
      summary,
      metrics,
    };
  }

  /**
   * EXEMPLE 6: Décision de circuit breaker basée sur le pool
   *
   * Refuser certaines requêtes si le pool est saturé
   */
  async exampleCircuitBreakerPattern() {
    // Vérifier la saturation du pool AVANT la requête
    if (isPoolCritical()) {
      logger.warn('Pool critical - rejecting request');
      throw new Error('Database pool exhausted - please retry later');
    }

    // Sinon, procéder normalement
    try {
      const result = await runDbQuery(
        async () => {
          return this.db.execute(sql`SELECT 1`);
        },
        'normal'
      );
      return result;
    } catch (error) {
      logger.error('Query failed after circuit breaker check', { error });
      throw error;
    }
  }

  /**
   * EXEMPLE 7: Middleware pour enrichir les logs avec stats du pool
   *
   * À utiliser dans un interceptor NestJS
   */
  async exampleEnrichedLogging(requestId: string) {
    const startTime = Date.now();
    const poolMetricsStart = getPoolMetrics();

    try {
      const result = await runDbQuery(
        async () => {
          return this.db.execute(sql`SELECT 1`);
        },
        'normal'
      );

      const duration = Date.now() - startTime;
      const poolMetricsEnd = getPoolMetrics();

      logger.info('Request completed', {
        requestId,
        duration,
        poolBefore: poolMetricsStart,
        poolAfter: poolMetricsEnd,
      });

      return result;
    } catch (error) {
      logger.error('Request failed', {
        requestId,
        error,
        poolMetrics: getPoolMetrics(),
      });
      throw error;
    }
  }

  /**
   * Démarrer le monitoring périodique du pool
   * À appeler une seule fois dans le constructor
   */
  private startPoolMonitoring() {
    if (process.env.NODE_ENV === 'development') {
      // En développement, logger les stats toutes les 30s
      setInterval(() => {
        const alert = checkPoolHealth();
        if (alert) {
          logger.warn('[DB] Pool monitoring', alert);
        } else {
          logger.debug('[DB] Pool stats', {
            summary: getPoolSummary(),
            metrics: getPoolMetrics(),
          });
        }
      }, 30000);
    }
  }
}

/**
 * BONNES PRATIQUES
 * ================
 *
 * ✅ FAIRE:
 * - Utiliser runDbQuery() avec les profils appropriés
 * - Vérifier la saturation du pool AVANT les opérations coûteuses
 * - Logger les metrics du pool dans les erreurs
 * - Ajouter LIMIT à toutes les requêtes
 * - Utiliser les indices appropriés
 * - Paginer les résultats volumineux
 *
 * ❌ NE PAS FAIRE:
 * - Ignorer les timeouts
 * - Ignorer les erreurs de pool exhausted
 * - Créer des connexions permanentes
 * - Garder des connexions ouvertes longtemps
 * - Fetch toutes les données sans LIMIT
 * - Ignorer les alertes de saturation du pool
 *
 * PROFILS DE TIMEOUT
 * ==================
 *
 * quick (2s):       SELECT COUNT, EXISTS, simples SELECTs
 * normal (5s):      SELECT avec JOIN, basic INSERT/UPDATE
 * complex (10s):    JOIN multiples, agrégations, batch operations
 * background (15s): Reports, exports, batch jobs asynchrones
 */
