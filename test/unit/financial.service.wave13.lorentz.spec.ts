import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  getSubscriptionById: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave13 lorentz - getSubscriptionById not-found fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getSubscriptionById: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with "Unknown error" when lookup fails without error payload', async () => {
    storageMock.getSubscriptionById.mockResolvedValue({ success: false });

    await expect(service.getSubscriptionById('sub-missing')).rejects.toThrow(NotFoundException);
    await expect(service.getSubscriptionById('sub-missing')).rejects.toThrow('Unknown error');
  });
});
