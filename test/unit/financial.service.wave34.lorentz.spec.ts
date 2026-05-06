import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  deleteExpense: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave34 lorentz - deleteExpense explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { deleteExpense: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with storage error message', async () => {
    storageMock.deleteExpense.mockResolvedValue({ success: false, error: new Error('Suppression dépense impossible') });

    await expect(service.deleteExpense('exp-10')).rejects.toThrow(NotFoundException);
    await expect(service.deleteExpense('exp-10')).rejects.toThrow('Suppression dépense impossible');
  });
});
