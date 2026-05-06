import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  deleteSubscription: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave42 lorentz - deleteSubscription explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { deleteSubscription: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.deleteSubscription.mockResolvedValue({ success: false, error: new Error('Suppression abonnement impossible') });

    await expect(service.deleteSubscription('sub-404')).rejects.toThrow(NotFoundException);
    await expect(service.deleteSubscription('sub-404')).rejects.toThrow('Suppression abonnement impossible');
  });
});
