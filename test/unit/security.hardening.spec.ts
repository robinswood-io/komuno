import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildCorsOptions, getAllowedCorsOrigins } from '../../server/src/config/cors';
import { cookieBackedCsrfOriginGuard } from '../../server/src/config/security-middleware';
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


  it('installe le garde CSRF après la session Passport pour cibler les vraies sessions authentifiées', () => {
    const main = fs.readFileSync('server/src/main.ts', 'utf8');
    expect(main.indexOf('expressApp.use(passport.session()')).toBeLessThan(main.indexOf('expressApp.use(cookieBackedCsrfOriginGuard())'));
  });

  it('bloque les mutations de session authentifiée sans Origin/Referer autorisé sans casser les webhooks sans session', () => {
    const guard = cookieBackedCsrfOriginGuard({
      NODE_ENV: 'production',
      DOMAIN: 'cjd80.fr',
      APP_URL: 'https://cjd80.fr',
    } as NodeJS.ProcessEnv);

    const run = (method: string, headers: Record<string, string | undefined>, authenticated = true) => {
      const req = {
        method,
        headers: { host: 'cjd80.fr', ...headers },
        protocol: 'https',
        isAuthenticated: () => authenticated,
      } as any;
      const res = { statusCode: 200, body: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } } as any;
      const next = { called: false };
      guard(req, res, () => { next.called = true; });
      return { res, next };
    };

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(run(method, { origin: 'https://cjd80.fr' }).next.called).toBe(true);
      expect(run(method, { referer: 'https://www.cjd80.fr/admin' }).next.called).toBe(true);
      expect(run(method, { origin: 'https://evil.example' }).res.statusCode).toBe(403);
      expect(run(method, { origin: 'https://cjd80.fr.evil.example' }).res.statusCode).toBe(403);
      expect(run(method, { origin: 'null' }).res.statusCode).toBe(403);
      expect(run(method, {}).res.statusCode).toBe(403);
    }

    expect(run('POST', { origin: 'https://evil.example', referer: 'https://cjd80.fr/admin' }).res.statusCode).toBe(403);
    expect(run('POST', { origin: 'https://cjd80.fr' }, false).next.called).toBe(true);
    expect(run('POST', { origin: 'https://evil.example' }, false).next.called).toBe(true);
    expect(run('GET', { origin: 'https://evil.example' }).next.called).toBe(true);
  });


  it('réserve les contournements dev-login localStorage au développement', () => {
    for (const file of ['app/(authenticated)/layout.tsx', 'app/(protected)/layout.tsx']) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'");
    }
  });

  it('durcit les familles restantes exploitables sans refonte arbitraire', () => {
    const brandingController = fs.readFileSync('server/src/branding/branding.controller.ts', 'utf8');
    expect(brandingController).toContain('PUBLIC_LOGO_FILENAME_REGEX');
    expect(brandingController).toContain('Nom de fichier logo invalide');

    const adminController = fs.readFileSync('server/src/admin/admin.controller.ts', 'utf8');
    expect(adminController).toContain('sanitizeFrontendLogField');
    expect(adminController).toContain('@Throttle({ default: { limit: 10, ttl: 60_000 } })');

    const adminService = fs.readFileSync('server/src/admin/admin.service.ts', 'utf8');
    expect(adminService).toContain('data: this.sanitizeAdmin(result.data)');

    const healthController = fs.readFileSync('server/src/health/health.controller.ts', 'utf8');
    expect(healthController).toContain("@Get('db')\n  @UseGuards(JwtAuthGuard)");
    expect(healthController).toContain('return this.healthService.getPublicStatus();');

    const healthService = fs.readFileSync('server/src/health/health.service.ts', 'utf8');
    expect(healthService).toContain('async getPublicStatus(): Promise<StatusResponse>');
    expect(healthService).toContain("environment: 'public'");

    const integrationsService = fs.readFileSync('server/src/integrations/integrations.service.ts', 'utf8');
    expect(integrationsService).toContain("Webhook entrant non signé non accepté");

    const membersController = fs.readFileSync('server/src/members/members.controller.ts', 'utf8');
    expect(membersController).toContain("@Patch('bulk-status')\n  @Permissions('admin.edit')");
    expect(membersController).toContain("@Patch(':email/assign')\n  @Permissions('admin.edit')");
    expect(membersController).toContain("@Post(':email/subscriptions')\n  @Permissions('admin.edit')");
  });

});
