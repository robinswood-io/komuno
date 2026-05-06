import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type ExpenseOptions = {
  period?: string;
  year?: number;
  category?: string;
  budgetId?: string;
  startDate?: string;
  endDate?: string;
};

type StorageMock = {
  getExpenses: ReturnType<typeof vi.fn<[ExpenseOptions], Promise<FailureResult>>>;
};

describe('FinancialService wave22 lorentz - getExpenses explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getExpenses: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with storage error message', async () => {
    storageMock.getExpenses.mockResolvedValue({ success: false, error: new Error('Filtres invalides') });

    await expect(service.getExpenses({ period: 'Q2', year: 2027 })).rejects.toThrow(BadRequestException);
    await expect(service.getExpenses({ period: 'Q2', year: 2027 })).rejects.toThrow('Filtres invalides');
  });
});
