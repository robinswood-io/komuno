import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import * as schema from '../../../../shared/schema';

/**
 * Type for Drizzle ORM database instance
 * Supports both Neon (serverless) and standard PostgreSQL providers
 */
export type DrizzleDb =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzlePg<typeof schema>>;

/**
 * Type for database pool (either Neon or PostgreSQL)
 */
export type DatabasePool = NeonPool | PgPool;
