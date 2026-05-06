import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStorage, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 93', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('isFeatureEnabled returns false when config exists with enabled=false', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getFeatureConfigByKey').mockResolvedValue({
      success: true,
      data: { featureKey: 'f93', enabled: false },
    });

    const result = await storage.isFeatureEnabled('f93');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(false);
    }
  });
});
