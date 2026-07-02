#!/usr/bin/env tsx

/**
 * Script de monitoring et statistiques PostgreSQL
 * Affiche des informations sur la base de données, les connexions, les performances
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

interface DatabaseStats {
  databaseName: string;
  databaseSize: string;
  activeConnections: number;
  maxConnections: number;
  cacheHitRatio: number;
  totalTables: number;
  totalIndexes: number;
}

interface TableStats {
  tableName: string;
  rowCount: number;
  totalSize: string;
  indexSize: string;
}

interface ConnectionInfo {
  pid: number;
  usename: string;
  applicationName: string;
  state: string;
  query: string;
  queryStart: Date;
  stateChange: Date;
}

async function getDatabaseStats(): Promise<DatabaseStats> {
  const result = await db.execute(sql`
    SELECT 
      current_database() as database_name,
      pg_size_pretty(pg_database_size(current_database())) as database_size,
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
      (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
      (
        SELECT 
          CASE 
            WHEN sum(blks_hit) + sum(blks_read) = 0 THEN 0
            ELSE round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2)
          END
        FROM pg_stat_database 
        WHERE datname = current_database()
      ) as cache_hit_ratio,
      (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
      (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes
  `);

  return result.rows[0] as DatabaseStats;
}

async function getTableStats(): Promise<TableStats[]> {
  const result = await db.execute(sql`
    SELECT 
      schemaname || '.' || tablename as table_name,
      n_live_tup as row_count,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
      pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 20
  `);

  return result.rows as TableStats[];
}

async function getActiveConnections(): Promise<ConnectionInfo[]> {
  const result = await db.execute(sql`
    SELECT 
      pid,
      usename,
      COALESCE(application_name, '') as application_name,
      state,
      LEFT(query, 100) as query,
      query_start as query_start,
      state_change as state_change
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid != pg_backend_pid()
    ORDER BY query_start DESC
    LIMIT 10
  `);

  return result.rows as ConnectionInfo[];
}

async function getSlowQueries(): Promise<unknown[]> {
  const result = await db.execute(sql`
    SELECT 
      LEFT(query, 200) as query,
      calls,
      total_exec_time,
      mean_exec_time,
      max_exec_time
    FROM pg_stat_statements
    WHERE mean_exec_time > 100
    ORDER BY mean_exec_time DESC
    LIMIT 10
  `).catch(() => ({ rows: [] })); // pg_stat_statements peut ne pas être activé

  return result.rows;
}

async function main() {
  console.log('📊 Statistiques PostgreSQL\n');
  console.log('=' .repeat(60));

  try {
    // Statistiques générales
    console.log('\n📈 Statistiques générales:');
    const dbStats = await getDatabaseStats();
    console.log(`   Base de données: ${dbStats.databaseName}`);
    console.log(`   Taille: ${dbStats.databaseSize}`);
    console.log(`   Connexions actives: ${dbStats.activeConnections}/${dbStats.maxConnections}`);
    console.log(`   Cache hit ratio: ${dbStats.cacheHitRatio}%`);
    console.log(`   Tables: ${dbStats.totalTables}`);
    console.log(`   Indexes: ${dbStats.totalIndexes}`);

    // Statistiques par table
    console.log('\n📋 Top 20 tables (par taille):');
    const tableStats = await getTableStats();
    if (tableStats.length > 0) {
      console.log('   Table'.padEnd(30) + 'Lignes'.padEnd(12) + 'Taille'.padEnd(12) + 'Indexes');
      console.log('-'.repeat(70));
      tableStats.forEach(table => {
        console.log(
          `   ${table.tableName.padEnd(28)}${table.rowCount.toString().padEnd(12)}${table.totalSize.padEnd(12)}${table.indexSize}`
        );
      });
    } else {
      console.log('   Aucune table trouvée');
    }

    // Connexions actives
    console.log('\n🔌 Connexions actives:');
    const connections = await getActiveConnections();
    if (connections.length > 0) {
      connections.forEach(conn => {
        console.log(`   PID ${conn.pid}: ${conn.usename} (${conn.state})`);
        if (conn.query) {
          console.log(`      Query: ${conn.query.substring(0, 80)}...`);
        }
      });
    } else {
      console.log('   Aucune connexion active (hors cette session)');
    }

    // Requêtes lentes (si pg_stat_statements est activé)
    const slowQueries = await getSlowQueries();
    if (slowQueries.length > 0) {
      console.log('\n🐌 Top 10 requêtes lentes:');
      slowQueries.forEach((query, index) => {
        console.log(`   ${index + 1}. ${query.query.substring(0, 80)}...`);
        console.log(`      Appels: ${query.calls}, Temps moyen: ${Math.round(query.mean_exec_time)}ms`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Monitoring terminé\n');

  } catch (error) {
    console.error('❌ Erreur lors du monitoring:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();

