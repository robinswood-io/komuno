import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  getSubscriptionTypeById: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave41 lorentz - getSubscriptionTypeById explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getSubscriptionTypeById: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.getSubscriptionTypeById.mockResolvedValue({ success: false, error: new Error('Type abonnement introuvable') });

    await expect(service.getSubscriptionTypeById('type-404')).rejects.toThrow(NotFoundException);
    await expect(service.getSubscriptionTypeById('type-404')).rejects.toThrow('Type abonnement introuvable');
  });
});
