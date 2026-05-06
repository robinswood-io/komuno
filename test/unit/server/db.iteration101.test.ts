import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration101 neon config branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('configures neonConfig websocket/fetch options for neon provider', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    const neonModule = cjsRequire('@neondatabase/serverless') as {
      neonConfig: {
        webSocketConstructor?: unknown;
        poolQueryViaFetch?: boolean;
        fetchEndpoint?: (host: string) => string;
      };
    };

    expect(neonModule.neonConfig.webSocketConstructor).toBeDefined();
    expect(neonModule.neonConfig.poolQueryViaFetch).toBe(true);
    expect(neonModule.neonConfig.fetchEndpoint?.('db.example')).toBe('https://db.example/sql');
  });
});
