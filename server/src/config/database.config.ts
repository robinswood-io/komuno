import { registerAs } from '@nestjs/config';

/**
 * Configuration centralisée du pool de connexions PostgreSQL
 * Optimisée pour Neon (serverless) et PostgreSQL standard
 *
 * Profils:
 * - development: Pool minimal (2 min, 5 max) pour économiser les ressources
 * - production: Pool optimisé (5 min, 20 max) pour haute charge
 * - testing: Pool minimal (1 min, 2 max) pour isolation des tests
 */
export default registerAs('database', () => {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  const isTesting = env === 'testing';

  // Configuration de base commune à tous les environnements
  const baseConfig = {
    // Valeur obligatoire
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cjd80',

    // Détection du provider
    provider: (process.env.DATABASE_URL || '').includes('neon.tech') ? 'neon' : 'standard',

    // Timeouts
    connectionTimeoutMillis: isProduction ? 30000 : 10000, // 30s en prod, 10s en dev
    idleTimeoutMillis: isProduction ? 600000 : 60000,      // 10min en prod, 1min en dev
    statementTimeoutMillis: isProduction ? 30000 : 10000,   // Query timeout

    // Validation des connexions
    validationQuery: 'SELECT 1',
    validationInterval: 30000, // 30 secondes entre validations

    // Application metadata
    application_name: 'komuno-app',
  };

  // Configuration du pool (min/max connexions)
  const poolConfig = (() => {
    if (isTesting) {
      return {
        min: 1,
        max: 2,
        acquireTimeoutMillis: 5000,
      };
    }

    if (isProduction) {
      return {
        min: 5,
        max: 20,
        acquireTimeoutMillis: 30000,
      };
    }

    // Development
    return {
      min: 2,
      max: 5,
      acquireTimeoutMillis: 10000,
    };
  })();

  // Configuration Neon spécifique
  const neonConfig = baseConfig.provider === 'neon' ? {
    // Neon utilise WebSocket pour les connexions serverless
    poolQueryViaFetch: true,
    fetchEndpoint: (host: string) => `https://${host}/sql`,
    // Max uses avant de recycler la connexion (prévient les fuites mémoire)
    maxUses: isProduction ? 10000 : 1000,
    // Ne pas sortir à la fermeture du serveur (important pour serverless)
    allowExitOnIdle: false,
  } : {};

  // Configuration de monitoring et reporting
  const monitoringConfig = {
    // Health check
    healthCheckInterval: 5000,  // 5 secondes
    healthCheckTimeout: 3000,   // 3 secondes

    // Pool saturation thresholds
    saturationWarningThreshold: 70,   // Warning si > 70% utilisé
    saturationCriticalThreshold: 90,  // Critical si > 90% utilisé

    // Monitoring détaillé
    enablePoolMetrics: true,
    metricsReportInterval: process.env.NODE_ENV === 'development' ? 30000 : 300000, // 30s dev, 5min prod

    // Logging
    logPoolEvents: process.env.NODE_ENV === 'development',
    logPoolStats: process.env.NODE_ENV === 'development',
  };

  // Retry configuration pour requêtes
  const retryConfig = {
    maxAttempts: isProduction ? 3 : 2,
    initialDelay: 100,        // ms
    maxDelay: 2000,           // ms
    backoffMultiplier: 2,
  };

  // Circuit breaker configuration
  const circuitBreakerConfig = {
    failureThreshold: 5,      // Nombre d'échecs avant ouverture
    successThreshold: 2,      // Nombre de succès pour fermeture
    timeout: 30000,           // Timeout avant tentative en HALF_OPEN
    monitoringInterval: 5000, // Vérifier les métriques toutes les 5s
  };

  return {
    ...baseConfig,
    pool: poolConfig,
    neon: neonConfig,
    monitoring: monitoringConfig,
    retry: retryConfig,
    circuitBreaker: circuitBreakerConfig,

    /**
     * Récupère la configuration du profil de timeout
     * Utilisé par runDbQuery() pour adapter les timeouts
     */
    getTimeoutProfile: (profile: 'quick' | 'normal' | 'complex' | 'background') => {
      const profiles = {
        quick: {
          timeout: 2000,    // 2s - requêtes simples
          retry: false,
        },
        normal: {
          timeout: 5000,    // 5s - requêtes standards
          retry: true,
        },
        complex: {
          timeout: 10000,   // 10s - requêtes complexes
          retry: true,
        },
        background: {
          timeout: 15000,   // 15s - tâches background
          retry: true,
        },
      };
      return profiles[profile];
    },
  };
});

/**
 * Type de la configuration
 */
export type DatabaseConfig = ReturnType<typeof registerAs>;
