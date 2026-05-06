import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type BudgetOptions = {
  period?: string;
  year?: number;
  category?: string;
};

type FailureResult = { success: false; error: Error };

type StorageMock = {
  getBudgets: ReturnType<typeof vi.fn<[BudgetOptions], Promise<FailureResult>>>;
};

describe('FinancialService wave31 lorentz - getBudgets explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getBudgets: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with storage error message', async () => {
    storageMock.getBudgets.mockResolvedValue({ success: false, error: new Error('Budget query invalide') });

    await expect(service.getBudgets({ period: 'Q1', year: 2026 })).rejects.toThrow(BadRequestException);
    await expect(service.getBudgets({ period: 'Q1', year: 2026 })).rejects.toThrow('Budget query invalide');
  });
});
