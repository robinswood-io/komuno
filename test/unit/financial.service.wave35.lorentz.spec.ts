import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type ComparisonData = {
  first: { period: string; year: number };
  second: { period: string; year: number };
};

type SuccessResult = { success: true; data: ComparisonData };

type StorageMock = {
  getFinancialComparison: ReturnType<
    typeof vi.fn<
      [{ period: string; year: number }, { period: string; year: number }],
      Promise<SuccessResult>
    >
  >;
};

describe('FinancialService wave35 lorentz - getFinancialComparison success mapping branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getFinancialComparison: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('maps period/year pairs to object arguments and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: {
        first: { period: 'Q1', year: 2024 },
        second: { period: 'Q1', year: 2025 },
      },
    };
    storageMock.getFinancialComparison.mockResolvedValue(payload);

    const result = await service.getFinancialComparison('Q1', 2024, 'Q1', 2025);

    expect(storageMock.getFinancialComparison).toHaveBeenCalledWith(
      { period: 'Q1', year: 2024 },
      { period: 'Q1', year: 2025 },
    );
    expect(result).toEqual(payload);
  });
});
