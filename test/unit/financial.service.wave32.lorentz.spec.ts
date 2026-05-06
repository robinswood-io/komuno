import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  getExpenseById: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave32 lorentz - getExpenseById explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getExpenseById: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.getExpenseById.mockResolvedValue({ success: false, error: new Error('Dépense non trouvée') });

    await expect(service.getExpenseById('exp-404')).rejects.toThrow(NotFoundException);
    await expect(service.getExpenseById('exp-404')).rejects.toThrow('Dépense non trouvée');
  });
});
