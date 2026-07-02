import { describe, expect, it } from 'vitest';

import { buildCorsOptions, getAllowedCorsOrigins } from '../../server/src/config/cors';
import { isDemoModeEnabled } from '../../server/src/auth/demo-user';

describe('Sécurité — durcissement transversal', () => {
  it('publie un Content-Security-Policy applicatif non permissif', async () => {
    const module = await import('../../next.config.js');
    const nextConfig = module.default ?? module;
    const headerGroups = await nextConfig.headers();
    const headers = headerGroups.flatMap((group: { headers: Array<{ key: string; value: string }> }) => group.headers);
    const csp = headers.find((header: { key: string }) => header.key.toLowerCase() === 'content-security-policy')?.value;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('default-src *');
  });

  it('limite le demo-mode production à la stack demo officielle', () => {
    expect(isDemoModeEnabled({ NODE_ENV: 'production', KOMUNO_DEMO_MODE: 'true' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isDemoModeEnabled({ NODE_ENV: 'production', KOMUNO_DEMO_MODE: 'true', APP_NAME: 'komuno-demo', DOMAIN: 'demo.komuno.org' } as NodeJS.ProcessEnv)).toBe(true);
    expect(isDemoModeEnabled({ NODE_ENV: 'production', KOMUNO_DEMO_MODE: 'true', APP_NAME: 'komuno-demo', DOMAIN: 'cjd80.fr' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isDemoModeEnabled({ NODE_ENV: 'development', KOMUNO_DEMO_MODE: 'true' } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('ne configure jamais CORS wildcard avec credentials', async () => {
    const env = {
      NODE_ENV: 'production',
      CORS_ORIGIN: '*',
      DOMAIN: 'cjd80.fr',
      APP_URL: 'https://cjd80.fr/admin',
    } as NodeJS.ProcessEnv;

    expect(getAllowedCorsOrigins(env)).toEqual(['https://cjd80.fr', 'https://www.cjd80.fr']);

    const options = buildCorsOptions(env);
    expect(options.credentials).toBe(true);
    expect(options.origin).toEqual(expect.any(Function));

    const resolveOrigin = (origin?: string) => new Promise<unknown>((resolve, reject) => {
      if (typeof options.origin !== 'function') {
        reject(new Error('origin callback missing'));
        return;
      }
      options.origin(origin, (error, allowed) => {
        if (error) reject(error);
        else resolve(allowed);
      });
    });

    await expect(resolveOrigin('https://cjd80.fr')).resolves.toBe('https://cjd80.fr');
    await expect(resolveOrigin('https://evil.example')).resolves.toBe(false);
    await expect(resolveOrigin(undefined)).resolves.toBe(true);
  });
});
