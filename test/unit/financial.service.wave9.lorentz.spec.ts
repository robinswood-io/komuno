import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  getRevenueById: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave9 lorentz - getRevenueById fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getRevenueById: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with "Unknown error" when revenue lookup fails without error payload', async () => {
    storageMock.getRevenueById.mockResolvedValue({ success: false });

    await expect(service.getRevenueById('revenue-404')).rejects.toThrow(NotFoundException);
    await expect(service.getRevenueById('revenue-404')).rejects.toThrow('Unknown error');
  });
});
