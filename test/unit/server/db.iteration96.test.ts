import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration96 process signal handlers registration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('registers SIGTERM and SIGINT shutdown handlers', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const processOnMock = vi.mocked(process.on);
    expect(processOnMock).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnMock).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });
});
