import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave1 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('throws when DATABASE_URL targets Neon because PostgresSessionStore is unsupported', () => {
    process.env.DATABASE_URL = 'postgresql://user:pwd@ep-test.neon.tech/dbname';

    expect(() => createStorage()).toThrow(
      'PostgresSessionStore ne supporte pas Neon. Utilisez un autre store de sessions.',
    );
  });

  it('creates storage when DATABASE_URL is standard postgres', () => {
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';

    const storage = createStorage();

    expect(storage).toBeDefined();
    expect(storage.sessionStore).toBeDefined();
  });

  it('delegates getUserByEmail to getUser with same email', async () => {
    const storage = createStorage();
    const getUserSpy = vi.spyOn(storage, 'getUser').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.getUserByEmail('locke@example.com');

    expect(getUserSpy).toHaveBeenCalledTimes(1);
    expect(getUserSpy).toHaveBeenCalledWith('locke@example.com');
    expect(result).toEqual({ success: true, data: null });
  });
});
