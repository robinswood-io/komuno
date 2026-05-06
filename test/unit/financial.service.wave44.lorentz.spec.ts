import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  getRevenueById: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave44 lorentz - getRevenueById explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getRevenueById: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.getRevenueById.mockResolvedValue({ success: false, error: new Error('Revenu introuvable') });

    await expect(service.getRevenueById('rev-000')).rejects.toThrow(NotFoundException);
    await expect(service.getRevenueById('rev-000')).rejects.toThrow('Revenu introuvable');
  });
});
