import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStorage, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 94', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('isFeatureEnabled propagates failed getFeatureConfigByKey result', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getFeatureConfigByKey').mockResolvedValue({
      success: false,
      error: new Error('feature lookup failed'),
    });

    const result = await storage.isFeatureEnabled('f94');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('feature lookup failed');
    }
  });
});
