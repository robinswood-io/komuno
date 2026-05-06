import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave40 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('registers SIGTERM then SIGINT with the same close handler reference', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const processOnMock = vi.mocked(process.on);
    const sigtermCall = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM');
    const sigintCall = processOnMock.mock.calls.find(([signal]) => signal === 'SIGINT');

    expect(sigtermCall).toBeDefined();
    expect(sigintCall).toBeDefined();
    expect(sigtermCall?.[1]).toBe(sigintCall?.[1]);
  });
});
