import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  getFinancialKPIsExtended: ReturnType<
    typeof vi.fn<[string | undefined, number | undefined], Promise<FailureResult>>
  >;
};

describe('FinancialService wave18 lorentz - getFinancialKPIsExtended fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getFinancialKPIsExtended: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when KPI retrieval fails without error payload', async () => {
    storageMock.getFinancialKPIsExtended.mockResolvedValue({ success: false });

    await expect(service.getFinancialKPIsExtended('annual', 2030)).rejects.toThrow(BadRequestException);
    await expect(service.getFinancialKPIsExtended('annual', 2030)).rejects.toThrow('Unknown error');
  });
});
