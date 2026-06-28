import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const URL_ENV_KEYS = [
  'PUBLIC_APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'APP_URL',
  'BASE_URL',
  'SITE_URL',
  'FRONTEND_URL',
  'NEXTAUTH_URL',
] as const;

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '*') return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function addOrigin(origins: Set<string>, value: string | null | undefined) {
  const normalized = normalizeOrigin(value);
  if (normalized) origins.add(normalized);
}

export function getAllowedCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = new Set<string>();

  for (const raw of (env.CORS_ORIGIN ?? '').split(',')) {
    addOrigin(origins, raw);
  }

  for (const key of URL_ENV_KEYS) {
    addOrigin(origins, env[key]);
  }

  if (env.DOMAIN) {
    addOrigin(origins, `https://${env.DOMAIN}`);
    addOrigin(origins, `https://www.${env.DOMAIN}`);
  }

  if (env.NODE_ENV !== 'production') {
    for (const origin of [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'https://komuno.rbw.ovh',
    ]) {
      addOrigin(origins, origin);
    }
  }

  return [...origins].sort();
}

export function buildCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const allowedOrigins = new Set(getAllowedCorsOrigins(env));

  return {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Komuno-Federation-Token',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['Content-Disposition'],
    origin(origin, callback) {
      // Requêtes serveur-à-serveur, curl, healthchecks, ou same-origin sans CORS.
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);
      if (normalized && allowedOrigins.has(normalized)) {
        callback(null, normalized);
        return;
      }

      // Ne jamais renvoyer Access-Control-Allow-Origin: * avec credentials.
      // Retourner false laisse le navigateur bloquer les vraies requêtes cross-origin
      // sans empêcher les requêtes same-origin classiques.
      callback(null, false);
    },
  };
}
