import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  deleteBudget: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave33 lorentz - deleteBudget explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { deleteBudget: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.deleteBudget.mockResolvedValue({ success: false, error: new Error('Suppression budget impossible') });

    await expect(service.deleteBudget('budget-9')).rejects.toThrow(NotFoundException);
    await expect(service.deleteBudget('budget-9')).rejects.toThrow('Suppression budget impossible');
  });
});
