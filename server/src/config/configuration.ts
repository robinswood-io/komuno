import { registerAs } from '@nestjs/config';

/**
 * Configuration typée pour l'application
 * Utilise @nestjs/config pour la validation et le typage
 */
export default registerAs('app', () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  siteUrl: process.env.SITE_URL || 'http://localhost:5000',

  // Base de données
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cjd80',
  postgresUser: process.env.POSTGRES_USER || 'postgres',
  postgresPassword: process.env.POSTGRES_PASSWORD || 'postgres',
  postgresDb: process.env.POSTGRES_DB || 'cjd80',
  postgresHost: process.env.PGHOST || 'localhost',
  postgresPort: parseInt(process.env.PGPORT || '5433', 10),

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',

  // MinIO
  minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
  minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
  minioExternalPort: parseInt(process.env.MINIO_EXTERNAL_PORT || '9002', 10),
  minioUseSSL: process.env.MINIO_USE_SSL === 'true',
  minioAccessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  minioSecretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
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
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@cjd-amiens.fr',
  smtpFromName: process.env.SMTP_FROM_NAME || 'CJD Amiens',

  // VAPID (Web Push)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@cjd-amiens.fr',

  // OpenAI (Chatbot)
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

