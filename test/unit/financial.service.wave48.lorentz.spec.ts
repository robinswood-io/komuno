import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type KpiData = {
  marginRate: number;
  burnRate: number;
};

type SuccessResult = { success: true; data: KpiData };

type StorageMock = {
  getFinancialKPIsExtended: ReturnType<typeof vi.fn<[string | undefined, number | undefined], Promise<SuccessResult>>>;
};

describe('FinancialService wave48 lorentz - getFinancialKPIsExtended success undefined-args branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getFinancialKPIsExtended: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards undefined args and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: { marginRate: 0.42, burnRate: 0.18 },
    };
    storageMock.getFinancialKPIsExtended.mockResolvedValue(payload);

    const result = await service.getFinancialKPIsExtended(undefined, undefined);

    expect(storageMock.getFinancialKPIsExtended).toHaveBeenCalledWith(undefined, undefined);
    expect(result).toEqual(payload);
  });
});
