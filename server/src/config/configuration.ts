// @rbw-module komuno:server/config-configuration
// @rbw-role Configuration typée NestJS avec validation stricte des secrets en production et compatibilité des alias d'environnement
// @rbw-bounds in=[process.env] | out=[registerAs('app') configuration] | invariants=[Fail-closed en production si secret requis absent, support POSTGRES_PASSWORD|DB_PASSWORD et MINIO_*|S3_*]
// @rbw-memory project:komuno#mod:server/config-configuration

import { registerAs } from '@nestjs/config';

export function extractPasswordFromDatabaseUrl(databaseUrl?: string): string {
  if (!databaseUrl) return '';
  try {
    const parsed = new URL(databaseUrl);
    return parsed.password ? decodeURIComponent(parsed.password) : '';
  } catch {
    return '';
  }
}

export function requiredInProduction(
  name: string,
  developmentFallback = '',
  aliases: readonly string[] = [],
  env: NodeJS.ProcessEnv = process.env,
): string {
  const directOrAlias = env[name] || aliases.map((alias) => env[alias]).find(Boolean);
  const value =
    directOrAlias ||
    (name === 'POSTGRES_PASSWORD' ? extractPasswordFromDatabaseUrl(env.DATABASE_URL) : '');
  if (value) return value;
  if ((env.NODE_ENV || 'development') === 'production') {
    throw new Error(`${name} must be set in production`);
  }
  return developmentFallback;
}

/**
 * Configuration typée pour l'application
 * Utilise @nestjs/config pour la validation et le typage
 */
export default registerAs('app', () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '',
  siteUrl: process.env.SITE_URL || 'http://localhost:5000',

  // Base de données
  databaseUrl: requiredInProduction('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5433/cjd80'),
  postgresUser: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
  postgresPassword: requiredInProduction('POSTGRES_PASSWORD', 'postgres', ['DB_PASSWORD']),
  postgresDb: process.env.POSTGRES_DB || process.env.DB_NAME || 'cjd80',
  postgresHost: process.env.PGHOST || 'localhost',
  postgresPort: parseInt(process.env.PGPORT || '5433', 10),

  // Session
  sessionSecret: requiredInProduction('SESSION_SECRET', 'development-session-secret-change-me'),

  // MinIO
  minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
  minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
  minioExternalPort: parseInt(process.env.MINIO_EXTERNAL_PORT || '9002', 10),
  minioUseSSL: process.env.MINIO_USE_SSL === 'true',
  minioAccessKey: requiredInProduction('MINIO_ACCESS_KEY', 'minioadmin', ['MINIO_ROOT_USER', 'S3_ACCESS_KEY_ID']),
  minioSecretKey: requiredInProduction('MINIO_SECRET_KEY', 'minioadmin', ['MINIO_ROOT_PASSWORD', 'S3_SECRET_ACCESS_KEY']),
  minioBucketLoanItems: process.env.MINIO_BUCKET_LOAN_ITEMS || 'loan-items',
  minioBucketAssets: process.env.MINIO_BUCKET_ASSETS || 'assets',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6381',
  redisPassword: process.env.REDIS_PASSWORD || '',

  // Email
  smtpHost: process.env.SMTP_HOST || 'ssl0.ovh.net',
  smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
  smtpSecure: process.env.SMTP_SECURE !== 'false',
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || '',
  smtpFromName: process.env.SMTP_FROM_NAME || '',

  // VAPID (Web Push)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@komuno.org',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // Tracking
  trackingAlertsIntervalMinutes: parseInt(process.env.TRACKING_ALERTS_INTERVAL_MINUTES || '1440', 10),

  // GitHub
  githubToken: process.env.GITHUB_TOKEN || '',
  githubRepo: process.env.GITHUB_REPO_NAME || process.env.GITHUB_REPO || '',
  githubOwner: process.env.GITHUB_REPO_OWNER || process.env.GITHUB_OWNER || '',
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',

  // Version
  appVersion: process.env.APP_VERSION || process.env.GIT_TAG || '1.0.0',
}));
