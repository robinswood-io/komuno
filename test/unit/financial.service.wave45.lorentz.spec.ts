import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type DashboardData = {
  totalRevenueInCents: number;
  totalExpensesInCents: number;
};

type SuccessResult = { success: true; data: DashboardData };

type StorageMock = {
  getDashboardOverview: ReturnType<typeof vi.fn<[number | undefined], Promise<SuccessResult>>>;
};

describe('FinancialService wave45 lorentz - getDashboardOverview success undefined-year branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getDashboardOverview: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards undefined year and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: { totalRevenueInCents: 100000, totalExpensesInCents: 65000 },
    };
    storageMock.getDashboardOverview.mockResolvedValue(payload);

    const result = await service.getDashboardOverview(undefined);

    expect(storageMock.getDashboardOverview).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(payload);
  });
});
