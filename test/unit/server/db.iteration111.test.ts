import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration111 neonConfig fetch endpoint branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('sets neonConfig fetch endpoint and query-via-fetch flag for neon provider', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    const neonModule = cjsRequire('@neondatabase/serverless') as {
      neonConfig: {
        poolQueryViaFetch?: boolean;
        fetchEndpoint?: (host: string) => string;
      };
    };

    expect(neonModule.neonConfig.poolQueryViaFetch).toBe(true);
    expect(neonModule.neonConfig.fetchEndpoint?.('neon-host')).toBe('https://neon-host/sql');
  });
});
