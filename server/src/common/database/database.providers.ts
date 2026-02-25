import { Provider } from '@nestjs/common';
import { Pool as NeonPool } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../shared/schema';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Détecte le type de provider PostgreSQL
function detectDatabaseProvider(): 'neon' | 'standard' {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set');
  }

  if (databaseUrl.includes('neon.tech')) {
    return 'neon';
  }

  return 'standard';
}

const dbProvider = detectDatabaseProvider();

// Configuration Neon (seulement si provider est Neon)
if (dbProvider === 'neon') {
  neonConfig.webSocketConstructor = ws;
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;
}

// Créer le pool selon le provider
let pool: NeonPool | PgPool;

if (dbProvider === 'neon') {
  pool = new NeonPool({
    connectionString: process.env.DATABASE_URL!,
    max: 20,
    min: 2,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 3000,
    maxUses: 10000,
    allowExitOnIdle: false,
  });
} else {
  pool = new PgPool({
    connectionString: process.env.DATABASE_URL!,
    max: 20,
    min: 2,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 3000,
    application_name: 'komuno',
  });
}

// Créer l'instance Drizzle
const db = dbProvider === 'neon' 
  ? drizzleNeon(pool as NeonPool, { schema })
  : drizzlePg(pool as PgPool, { schema });

export const DATABASE_POOL = 'DATABASE_POOL';
export const DATABASE = 'DATABASE';

export const databaseProviders: Provider[] = [
  {
    provide: DATABASE_POOL,
    useValue: pool,
  },
  {
    provide: DATABASE,
    useValue: db,
  },
];

