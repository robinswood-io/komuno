import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  getBudgetById: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave21 lorentz - getBudgetById explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getBudgetById: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.getBudgetById.mockResolvedValue({ success: false, error: new Error('Budget introuvable') });

    await expect(service.getBudgetById('budget-404')).rejects.toThrow(NotFoundException);
    await expect(service.getBudgetById('budget-404')).rejects.toThrow('Budget introuvable');
  });
});
