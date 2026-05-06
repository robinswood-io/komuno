import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type StatsData = {
  total: number;
  active: number;
};

type SuccessResult = { success: true; data: StatsData };

type StorageMock = {
  getSubscriptionStats: ReturnType<typeof vi.fn<[number | undefined], Promise<SuccessResult>>>;
};

describe('FinancialService wave40 lorentz - getSubscriptionStats success undefined-year branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getSubscriptionStats: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards undefined year and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: { total: 120, active: 95 },
    };
    storageMock.getSubscriptionStats.mockResolvedValue(payload);

    const result = await service.getSubscriptionStats(undefined);

    expect(storageMock.getSubscriptionStats).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(payload);
  });
});
