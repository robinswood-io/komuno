import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type ExpenseStatsData = {
  totalExpensesInCents: number;
};

type SuccessResult = { success: true; data: ExpenseStatsData };

type StorageMock = {
  getExpenseStats: ReturnType<typeof vi.fn<[string | undefined, number | undefined], Promise<SuccessResult>>>;
};

describe('FinancialService wave49 lorentz - getExpenseStats success undefined-args branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getExpenseStats: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards undefined args and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: { totalExpensesInCents: 123456 },
    };
    storageMock.getExpenseStats.mockResolvedValue(payload);

    const result = await service.getExpenseStats(undefined, undefined);

    expect(storageMock.getExpenseStats).toHaveBeenCalledWith(undefined, undefined);
    expect(result).toEqual(payload);
  });
});
