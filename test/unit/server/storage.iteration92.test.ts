import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

type DbModuleLike = {
  runDbQuery: (callback: () => Promise<unknown>, profile: string) => Promise<unknown>;
};

describe('server/storage.js iteration 92', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFeatureConfigByKey returns existing config (non-null branch)', async () => {
    const storage = createStorage();

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: (_clause: unknown) => ({
          limit: async (_count: number) => [{ id: 'fc-92', featureKey: 'beta-feature', enabled: false }],
        }),
      }),
    });

    const cjsRequire = createRequire(import.meta.url);
    const dbModulePath = cjsRequire.resolve('../../../server/db.js');
    const dbModule = cjsRequire(dbModulePath) as DbModuleLike;
    dbModule.runDbQuery = async (callback: () => Promise<unknown>) => callback();

    const result = await storage.getFeatureConfigByKey('beta-feature');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeTruthy();
      expect(result.data?.featureKey).toBe('beta-feature');
      expect(result.data?.enabled).toBe(false);
    }
  });
});
