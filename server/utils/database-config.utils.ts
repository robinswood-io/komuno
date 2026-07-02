/**
 * Utilitaires pour la gestion de la configuration database
 * Facilite l'accès et l'utilisation de la configuration centralisée
 */

import { logger } from '../lib/logger';
import { getPoolStats } from '../db';

/**
 * Vérifie l'état du pool et log les alertes si nécessaire
 *
 * @example
 * const alert = checkPoolHealth();
 * if (alert) {
 *   logger.warn('Pool saturation detected', { alert });
 * }
 */
export function checkPoolHealth() {
  const stats = getPoolStats();

  if (stats.critical.breached) {
    const alert = {
      severity: 'critical' as const,
      message: `Pool SATURÉ: ${stats.utilization.percent}% utilisé (seuil critique: 90%)`,
      utilization: stats.utilization.percent,
      activeConnections: stats.activeCount,
      maxConnections: stats.maxConnections,
      waitingRequests: stats.waitingCount,
    };
    logger.error('[DB] Pool saturation CRITICAL', alert);
    return alert;
  }

  if (stats.warning.breached) {
    const alert = {
      severity: 'warning' as const,
      message: `Pool CHARGÉ: ${stats.utilization.percent}% utilisé (seuil warning: 70%)`,
      utilization: stats.utilization.percent,
      activeConnections: stats.activeCount,
      maxConnections: stats.maxConnections,
      waitingRequests: stats.waitingCount,
    };
    logger.warn('[DB] Pool saturation WARNING', alert);
    return alert;
  }

  if (stats.waitingCount > 0) {
    const alert = {
      severity: 'info' as const,
      message: `${stats.waitingCount} requête(s) en attente d'une connexion`,
      waitingRequests: stats.waitingCount,
    };
    logger.info('[DB] Requests waiting for connection', alert);
    return alert;
  }

  return null;
}

/**
 * Retourne un résumé formaté du statut du pool
 *
 * @example
 * console.log(getPoolSummary());
 * // Output: "Pool 3/5 (60%) | 1 idle, 0 waiting"
 */
export function getPoolSummary(): string {
  const stats = getPoolStats();
  return (
    `Pool ${stats.activeCount}/${stats.maxConnections} ` +
    `(${stats.utilization.percent}%) | ` +
    `${stats.idleCount} idle, ` +
    `${stats.waitingCount} waiting`
  );
}

/**
 * Retourne les statistiques du pool formatées pour logging
 *
 * @example
 * logger.info('Pool metrics', getPoolMetrics());
 */
export function getPoolMetrics() {
  const stats = getPoolStats();

  return {
    total: stats.totalCount,
    active: stats.activeCount,
    idle: stats.idleCount,
    waiting: stats.waitingCount,
    max: stats.maxConnections,
    min: stats.minConnections,
    utilization: `${stats.utilization.percent}%`,
    status: stats.utilization.status,
    available: stats.availableConnections,
  };
}

/**
 * Vérifie si le pool est en état critique
 * Utile pour les circuit breakers ou décisions d'escalade
 */
export function isPoolCritical(): boolean {
  const stats = getPoolStats();
  return stats.critical.breached;
}

/**
 * Vérifie si le pool est en état warning
 */
export function isPoolWarning(): boolean {
  const stats = getPoolStats();
  return stats.warning.breached && !stats.critical.breached;
}

/**
 * Vérifie si le pool est en bon état
 */
export function isPoolHealthy(): boolean {
  const stats = getPoolStats();
  return !stats.warning.breached;
}

/**
 * Retourne le nombre de connexions disponibles
 */
export function getAvailableConnections(): number {
  return getPoolStats().availableConnections;
}

/**
 * Retourne le taux d'utilisation du pool (0-100)
 */
export function getPoolUtilizationPercent(): number {
  return getPoolStats().utilization.percent;
}

/**
 * Crée un contexte de logging enrichi avec les stats du pool
 * Utile pour les middlewares/interceptors
 *
 * @example
 * const context = enrichContextWithPoolStats({ requestId: '123' });
 * logger.info('Request processing', context);
 */
export function enrichContextWithPoolStats<T extends Record<string, unknown>>(
  context: T
): T & { poolStats: Record<string, unknown> } {
  return {
    ...context,
    poolStats: getPoolMetrics(),
  };
}

/**
 * Log les statistiques du pool périodiquement (utile en development)
 * À appeler une seule fois au démarrage
 *
 * @example
 * if (process.env.NODE_ENV === 'development') {
 *   startPoolMonitoring(10000); // Log toutes les 10s
 * }
 */
export function startPoolMonitoring(intervalMs: number = 30000): NodeJS.Timer {
  return setInterval(() => {
    const alert = checkPoolHealth();
    if (!alert) {
      logger.debug('[DB] Pool stats', getPoolMetrics());
    }
  }, intervalMs);
}

/**
 * Détermine si un timeout supplémentaire est nécessaire
 * basé sur la charge du pool
 *
 * @example
 * const baseTimeout = 5000;
 * const timeout = baseTimeout + getAdditionalTimeout();
 * // Si pool à 80%, retourne 2000, donc 7000ms total
 */
export function getAdditionalTimeout(): number {
  const utilization = getPoolUtilizationPercent();

  if (utilization > 80) {
    return 3000; // +3s si pool chargé
  }

  if (utilization > 60) {
    return 1000; // +1s si pool partiellement chargé
  }

  return 0; // Pas de timeout supplémentaire si pool libre
}

/**
 * Suggère un timeout approprié basé sur les conditions actuelles
 * Prend en compte la charge du pool et l'environnement
 *
 * @example
 * const timeout = suggestTimeout('normal');
 * // Retourne 5000 si pool < 60%, 6000 si 60-80%, 8000 si > 80%
 */
export function suggestTimeout(
  profile: 'quick' | 'normal' | 'complex' | 'background'
): number {
  const baseTimeouts = {
    quick: 2000,
    normal: 5000,
    complex: 10000,
    background: 15000,
  };

  const baseTimeout = baseTimeouts[profile];
  const additionalTimeout = getAdditionalTimeout();

  return baseTimeout + additionalTimeout;
}
