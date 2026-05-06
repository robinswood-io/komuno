import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type ReportData = {
  reportType: 'monthly' | 'quarterly' | 'yearly';
  period: number;
  year: number;
};

type SuccessResult = { success: true; data: ReportData };

type StorageMock = {
  getFinancialReport: ReturnType<
    typeof vi.fn<['monthly' | 'quarterly' | 'yearly', number, number], Promise<SuccessResult>>
  >;
};

describe('FinancialService wave47 lorentz - getFinancialReport success branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getFinancialReport: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards report arguments and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: { reportType: 'quarterly', period: 3, year: 2027 },
    };
    storageMock.getFinancialReport.mockResolvedValue(payload);

    const result = await service.getFinancialReport('quarterly', 3, 2027);

    expect(storageMock.getFinancialReport).toHaveBeenCalledWith('quarterly', 3, 2027);
    expect(result).toEqual(payload);
  });
});
