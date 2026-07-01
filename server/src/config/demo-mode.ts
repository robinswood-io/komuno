const DEMO_HOSTS = new Set(['demo.komuno.org']);

type EnvLike = NodeJS.ProcessEnv | Record<string, unknown>;

function envString(env: EnvLike, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' ? value : undefined;
}

function normalizeHost(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^www\./, '').split('/')[0] || null;
  }
}

export function isKnownDemoHost(env: EnvLike = process.env): boolean {
  const candidates = [
    envString(env, 'DOMAIN'),
    envString(env, 'PUBLIC_APP_URL'),
    envString(env, 'NEXT_PUBLIC_APP_URL'),
    envString(env, 'APP_URL'),
    envString(env, 'CORS_ORIGIN'),
  ];
  return candidates.some((candidate) => {
    const host = normalizeHost(candidate);
    return host ? DEMO_HOSTS.has(host) : false;
  });
}

export function isProductionDemoStack(env: EnvLike = process.env): boolean {
  const appName = envString(env, 'APP_NAME') === 'komuno-demo' || envString(env, 'COMPOSE_PROJECT_NAME') === 'komuno-demo';
  return appName && isKnownDemoHost(env);
}

export function isDemoModeAllowed(env: EnvLike = process.env): boolean {
  if (envString(env, 'KOMUNO_DEMO_MODE') !== 'true') return false;
  if (envString(env, 'NODE_ENV') !== 'production') return true;
  return isProductionDemoStack(env);
}
