import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave5 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('configures neon provider with websocket and fetch endpoint settings', () => {
    class FakeWebSocket {}

    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@project.neon.tech/dbname',
      nodeEnv: 'development',
      wsExports: { __esModule: true, default: FakeWebSocket },
    });

    expect(setup.neonPools).toHaveLength(1);
    expect(setup.pgPools).toHaveLength(0);

    expect(setup.neonConfigRef.webSocketConstructor).toBe(FakeWebSocket);
    expect(setup.neonConfigRef.poolQueryViaFetch).toBe(true);

    const fetchEndpoint = setup.neonConfigRef.fetchEndpoint;
    expect(typeof fetchEndpoint).toBe('function');
    expect((fetchEndpoint as (host: string) => string)('api.neon.tech')).toBe('https://api.neon.tech/sql');

    expect(setup.neonPools[0].options.allowExitOnIdle).toBe(false);
  });
});
