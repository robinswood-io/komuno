import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  deleteRevenue: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave43 lorentz - deleteRevenue explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { deleteRevenue: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.deleteRevenue.mockResolvedValue({ success: false, error: new Error('Suppression revenu impossible') });

    await expect(service.deleteRevenue('rev-404')).rejects.toThrow(NotFoundException);
    await expect(service.deleteRevenue('rev-404')).rejects.toThrow('Suppression revenu impossible');
  });
});
