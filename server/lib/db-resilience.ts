import { Pool as NeonPool } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { CircuitBreaker } from './circuit-breaker';
import { logger } from './logger';
import type { StatusCheck } from '@shared/schema';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;  // ms
  maxDelay: number;      // ms
  backoffMultiplier: number;
}

export interface QueryOptions {
  timeout?: number;
  retry?: boolean;
  retryConfig?: Partial<RetryConfig>;
  cacheable?: boolean;
}

interface CachedStatus {
  status: StatusCheck;
  timestamp: number;
  ttl: number;
}

type QueryClient = {
  query: (text: string) => Promise<unknown>;
  release: () => void;
};

export class DatabaseResilience {
  private circuitBreaker: CircuitBreaker;
  private statusCache: Map<string, CachedStatus> = new Map();
  
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 2000,
    backoffMultiplier: 2
  };

  constructor(private pool: NeonPool | PgPool, name: string = 'database') {
    this.circuitBreaker = new CircuitBreaker({
      name,
      failureThreshold: 5,      // 5 échecs consécutifs
      successThreshold: 2,       // 2 succès pour rouvrir
      timeout: 30000,           // 30s avant retry en HALF_OPEN
    });
  }

  /**
   * Exécute une requête avec protection circuit breaker et retry
   */
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      timeout = 10000,
      retry = true,
      retryConfig = {},
      cacheable = false
    } = options;

    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= (retry ? config.maxAttempts : 1); attempt++) {
      try {
        const result = await this.executeWithTimeout(
          () => this.circuitBreaker.execute(queryFn),
          timeout
        );
        
        if (attempt > 1) {
          logger.info(`[DB Resilience] Query succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Ne pas retry si c'est la dernière tentative
        if (!retry || attempt >= config.maxAttempts) {
          logger.error(`[DB Resilience] Query failed after ${attempt} attempts`, {
            error: lastError.message,
            circuitState: this.circuitBreaker.getState()
          });
          throw lastError;
        }

        // Calculer le délai avec backoff exponentiel
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        logger.warn(`[DB Resilience] Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms`, {
          error: lastError.message
        });

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Query failed with unknown error');
  }

  /**
   * Health check optimisé avec timeout court (2s) et cache
   */
  async healthCheck(cacheKey: string = 'default', cacheTTL: number = 5000): Promise<StatusCheck> {
    // Vérifier le cache d'abord
    const cached = this.statusCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      logger.debug(`[DB Resilience] Using cached health status for ${cacheKey}`);
      return cached.status;
    }

    const startTime = Date.now();
    
    try {
      // Query simple avec timeout court (2s)
      await this.executeQuery(
        async () => {
          const client = await this.pool.connect();
          try {
            // Type-safe query pour Neon et PostgreSQL standard
            // Les deux pools supportent query() avec une string simple
            await (client as unknown as QueryClient).query('SELECT 1');
          } finally {
            client.release();
          }
        },
        {
          timeout: 2000,  // 2s timeout pour health checks
          retry: false,    // Pas de retry pour health checks
          cacheable: true
        }
      );

      const responseTime = Date.now() - startTime;
      const status: StatusCheck = {
        name: 'Database',
        status: responseTime > 1000 ? 'warning' : 'healthy',
        message: responseTime > 1000 
          ? `Lent (${responseTime}ms)` 
          : `Connecté (${responseTime}ms)`,
        responseTime,
        details: {
          circuitState: this.circuitBreaker.getState(),
          successRate: this.circuitBreaker.getSuccessRate().toFixed(2) + '%'
        }
      };

      // Mettre en cache
      this.statusCache.set(cacheKey, {
        status,
        timestamp: Date.now(),
        ttl: cacheTTL
      });

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const metrics = this.circuitBreaker.getMetrics();
      
      // Si on a un statut en cache, le retourner avec un warning
      if (cached) {
        logger.warn(`[DB Resilience] Health check failed, using stale cache for ${cacheKey}`, {
          error: errorMessage,
          cacheAge: Date.now() - cached.timestamp
        });
        
        return {
          ...cached.status,
          status: 'warning',
          message: 'Utilise le dernier statut connu (DB inaccessible)',
          error: errorMessage
        };
      }

      const status: StatusCheck = {
        name: 'Database',
        status: 'unhealthy',
        message: 'Échec de connexion',
        responseTime: Date.now() - startTime,
        error: errorMessage,
        details: {
          circuitState: metrics.state,
          failures: metrics.failures,
          lastFailure: metrics.lastFailureTime 
            ? new Date(metrics.lastFailureTime).toISOString() 
            : undefined
        }
      };

      // Cacher même les échecs (avec TTL court) pour éviter de marteler la DB
      this.statusCache.set(cacheKey, {
        status,
        timestamp: Date.now(),
        ttl: 2000 // 2s seulement pour les échecs
      });

      return status;
    }
  }

  /**
   * Pool stats health check avec protection
   */
  async poolHealthCheck(): Promise<StatusCheck> {
    try {
      const stats = {
        totalCount: (this.pool as NeonPool | PgPool).totalCount,
        idleCount: (this.pool as NeonPool | PgPool).idleCount,
        waitingCount: (this.pool as NeonPool | PgPool).waitingCount,
      };

      const utilization = (stats.totalCount - stats.idleCount) / 20 * 100; // max 20 connexions
      
      let status: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
      let message = `${stats.totalCount} connexions (${stats.idleCount} idle)`;

      if (utilization > 90) {
        status = 'unhealthy';
        message = `Pool saturé (${utilization.toFixed(0)}%)`;
      } else if (utilization > 70) {
        status = 'warning';
        message = `Pool chargé (${utilization.toFixed(0)}%)`;
      }

      return {
        name: 'Database Pool',
        status,
        message,
        details: {
          ...stats,
          utilization: `${utilization.toFixed(1)}%`,
          maxConnections: 20
        }
      };
    } catch (error) {
      return {
        name: 'Database Pool',
        status: 'unknown',
        message: 'Impossible de récupérer les stats',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Vide le cache de statuts
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.statusCache.delete(cacheKey);
      logger.info(`[DB Resilience] Cache cleared for ${cacheKey}`);
    } else {
      this.statusCache.clear();
      logger.info('[DB Resilience] All cache cleared');
    }
  }

  /**
   * Récupère les métriques du circuit breaker
   */
  getMetrics() {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      cacheSize: this.statusCache.size,
      cachedKeys: Array.from(this.statusCache.keys())
    };
  }

  /**
   * Reset manuel du circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    this.clearCache();
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
