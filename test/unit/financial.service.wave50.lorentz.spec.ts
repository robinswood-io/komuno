import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type BudgetStatsData = {
  totalBudgetInCents: number;
};

type SuccessResult = { success: true; data: BudgetStatsData };

type StorageMock = {
  getBudgetStats: ReturnType<typeof vi.fn<[string | undefined, number | undefined], Promise<SuccessResult>>>;
};

describe('FinancialService wave50 lorentz - getBudgetStats success undefined-args branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getBudgetStats: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards undefined args and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: { totalBudgetInCents: 987654 },
    };
    storageMock.getBudgetStats.mockResolvedValue(payload);

    const result = await service.getBudgetStats(undefined, undefined);

    expect(storageMock.getBudgetStats).toHaveBeenCalledWith(undefined, undefined);
    expect(result).toEqual(payload);
  });
});
