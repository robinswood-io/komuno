import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave50 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('registers exactly two signal handlers on module load', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const processOnMock = vi.mocked(process.on);
    const signalRegistrations = processOnMock.mock.calls.filter(
      ([signal]) => signal === 'SIGTERM' || signal === 'SIGINT'
    );

    expect(signalRegistrations).toHaveLength(2);
  });
});
