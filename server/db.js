"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoolStats = exports.QUERY_TIMEOUT_PROFILES = exports.db = exports.dbResilience = exports.pool = void 0;
exports.runDbQuery = runDbQuery;
const serverless_1 = require("@neondatabase/serverless");
const pg_1 = require("pg");
const neon_serverless_1 = require("drizzle-orm/neon-serverless");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const ws_1 = __importDefault(require("ws"));
const schema = __importStar(require("../shared/schema"));
const logger_1 = require("./lib/logger");
const db_resilience_1 = require("./lib/db-resilience");
// ========================================
// DÉTECTION AUTOMATIQUE DU PROVIDER
// ========================================
/**
 * Détecte le type de provider PostgreSQL basé sur DATABASE_URL
 * - Neon: contient "neon.tech" (utilise neon-serverless)
 * - Supabase/Standard PostgreSQL: format postgresql:// standard (utilise node-postgres)
 */
function detectDatabaseProvider() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    // Détection Neon (serverless avec WebSocket)
    if (databaseUrl.includes('neon.tech')) {
        return 'neon';
    }
    // Tout le reste est considéré comme PostgreSQL standard (Supabase ou autre)
    return 'standard';
}
const dbProvider = detectDatabaseProvider();
// Configuration Neon (seulement si provider est Neon)
if (dbProvider === 'neon') {
    serverless_1.neonConfig.webSocketConstructor = ws_1.default;
    serverless_1.neonConfig.poolQueryViaFetch = true;
    serverless_1.neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;
}
// ========================================
// CONFIGURATION DU POOL DE CONNEXIONS
// OPTIMISÉE POUR PRODUCTION HAUTE-CHARGE
// ========================================
/**
 * Configuration du pool adaptée à l'environnement
 * - Production: Min 5, Max 20 connexions (haute charge)
 * - Development: Min 2, Max 5 connexions (économe)
 * - Testing: Min 1, Max 2 connexions (isolation)
 */
const getPoolConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';
    if (isProduction) {
        return {
            min: 5,
            max: 20,
            connectionTimeoutMillis: 30000, // 30s pour acquérir une connexion
            idleTimeoutMillis: 600000, // 10min avant fermeture idle
            statementTimeout: 30000, // 30s par requête
            maxUses: 10000, // Recycle après 10k uses (Neon)
        };
    }
    if (env === 'testing') {
        return {
            min: 1,
            max: 2,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            statementTimeout: 10000,
            maxUses: 1000,
        };
    }
    // Development
    return {
        min: 2,
        max: 5,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 60000,
        statementTimeout: 10000,
        maxUses: 1000,
    };
};
const poolConfig = getPoolConfig();
let pool;
let dbResilience;
if (dbProvider === 'neon') {
    // Pool Neon (serverless avec WebSocket)
    // Documentation: https://neon.tech/docs/connect/connection-pooling
    const neonPool = new serverless_1.Pool({
        connectionString: process.env.DATABASE_URL,
        max: poolConfig.max,
        min: poolConfig.min,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
        maxUses: poolConfig.maxUses,
        allowExitOnIdle: false, // Important pour serverless
    });
    exports.pool = pool = neonPool;
    exports.dbResilience = dbResilience = new db_resilience_1.DatabaseResilience(neonPool, 'neon-database');
}
else {
    // Pool PostgreSQL standard (Supabase ou autre)
    const pgPool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        max: poolConfig.max,
        min: poolConfig.min,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
        application_name: 'komuno-app',
    });
    exports.pool = pool = pgPool;
    exports.dbResilience = dbResilience = new db_resilience_1.DatabaseResilience(pgPool, 'postgresql-database');
}
// Gestionnaire d'événements pour le monitoring du pool (logs réduits)
if (process.env.NODE_ENV === 'development') {
    if (dbProvider === 'neon') {
        pool.on('connect', () => {
            const stats = { totalCount: pool.totalCount };
            console.log(`[DB] Nouvelle connexion établie (provider: ${dbProvider}, pool: ${stats.totalCount})`);
        });
        pool.on('remove', () => {
            const stats = { totalCount: pool.totalCount };
            console.log(`[DB] Connexion fermée (provider: ${dbProvider}, pool: ${stats.totalCount})`);
        });
    }
    else {
        pool.on('connect', () => {
            const stats = { totalCount: pool.totalCount };
            console.log(`[DB] Nouvelle connexion établie (provider: ${dbProvider}, pool: ${stats.totalCount})`);
        });
        pool.on('remove', () => {
            const stats = { totalCount: pool.totalCount };
            console.log(`[DB] Connexion fermée (provider: ${dbProvider}, pool: ${stats.totalCount})`);
        });
    }
}
// Gestion des erreurs du pool (compatible Neon et pg)
if (dbProvider === 'neon') {
    pool.on('error', (err, _client) => {
        const stats = {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };
        logger_1.logger.error('CRITICAL: Database pool error', {
            type: 'dbPoolError',
            provider: dbProvider,
            message: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
            poolStats: stats
        });
    });
}
else {
    pool.on('error', (err, _client) => {
        const stats = {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };
        logger_1.logger.error('CRITICAL: Database pool error', {
            type: 'dbPoolError',
            provider: dbProvider,
            message: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
            poolStats: stats
        });
    });
}
// Configuration Drizzle avec optimisations
exports.db = dbProvider === 'neon'
    ? (0, neon_serverless_1.drizzle)({
        client: pool,
        schema,
        logger: process.env.NODE_ENV === 'development' ? {
            logQuery: (query, _params) => {
                console.log(`[DB Query] ${query.slice(0, 100)}...`);
            }
        } : false
    })
    : (0, node_postgres_1.drizzle)({
        client: pool,
        schema,
        logger: process.env.NODE_ENV === 'development' ? {
            logQuery: (query, _params) => {
                console.log(`[DB Query] ${query.slice(0, 100)}...`);
            }
        } : false
    });
// Profils de timeout pour différents types de requêtes
exports.QUERY_TIMEOUT_PROFILES = {
    quick: {
        timeout: 2000, // 2s - Pour les requêtes simples (SELECT simple, COUNT)
        retry: false
    },
    normal: {
        timeout: 5000, // 5s - Pour les requêtes standards (SELECT avec JOIN)
        retry: true
    },
    complex: {
        timeout: 10000, // 10s - Pour les requêtes complexes (INSERT/UPDATE/DELETE)
        retry: true
    },
    background: {
        timeout: 15000, // 15s - Pour les tâches background non-critiques
        retry: true
    }
};
/**
 * Wrapper pour exécuter des requêtes DB avec protection circuit breaker
 *
 * @param queryFn - Fonction qui exécute la requête DB
 * @param profile - Profil de timeout ('quick' | 'normal' | 'complex' | 'background')
 * @returns Résultat de la requête
 *
 * @example
 * // Requête rapide (2s timeout, pas de retry)
 * const count = await runDbQuery(
 *   async () => db.select().from(users).limit(1),
 *   'quick'
 * );
 *
 * @example
 * // Requête normale (5s timeout, avec retry)
 * const users = await runDbQuery(
 *   async () => db.select().from(users).where(eq(users.email, email)),
 *   'normal'
 * );
 */
async function runDbQuery(queryFn, profile = 'normal') {
    const config = exports.QUERY_TIMEOUT_PROFILES[profile];
    return dbResilience.executeQuery(queryFn, {
        timeout: config.timeout,
        retry: config.retry
    });
}
/**
 * Obtient les statistiques complètes du pool
 * Inclut: total, idle, waiting, utilization, saturation alerts
 */
const getPoolStats = () => {
    const poolCfg = getPoolConfig();
    const stats = dbProvider === 'neon'
        ? {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
        }
        : {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
        };
    // Calcul du taux d'utilisation
    const activeConnections = stats.totalCount - stats.idleCount;
    const utilizationPercent = (activeConnections / poolCfg.max) * 100;
    // Déterminer le statut
    let poolStatus = 'healthy';
    if (utilizationPercent > 90) {
        poolStatus = 'critical';
    }
    else if (utilizationPercent > 70) {
        poolStatus = 'warning';
    }
    return {
        // Stats brutes
        totalCount: stats.totalCount,
        idleCount: stats.idleCount,
        activeCount: activeConnections,
        waitingCount: stats.waitingCount,
        // Configuration
        provider: dbProvider,
        minConnections: poolCfg.min,
        maxConnections: poolCfg.max,
        // Métriques calculées
        utilization: {
            percent: Math.round(utilizationPercent * 10) / 10, // 1 décimale
            status: poolStatus,
        },
        // Capacité disponible
        availableConnections: poolCfg.max - stats.totalCount,
        availableFromIdle: stats.idleCount,
        // Thresholds
        warning: {
            threshold: Math.round(poolCfg.max * 0.7),
            current: activeConnections,
            breached: activeConnections > Math.round(poolCfg.max * 0.7),
        },
        critical: {
            threshold: Math.round(poolCfg.max * 0.9),
            current: activeConnections,
            breached: activeConnections > Math.round(poolCfg.max * 0.9),
        },
    };
};
exports.getPoolStats = getPoolStats;
// Graceful shutdown du pool
let isPoolClosed = false;
const closePool = async () => {
    if (isPoolClosed) {
        return;
    }
    isPoolClosed = true;
    console.log('[DB] Fermeture gracieuse du pool de connexions...');
    try {
        await pool.end();
        console.log('[DB] Pool fermé');
    }
    catch (error) {
        console.error('[DB] Erreur lors de la fermeture du pool:', error);
    }
};
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);
