import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  getBudgetStats: ReturnType<typeof vi.fn<[string | undefined, number | undefined], Promise<FailureResult>>>;
};

describe('FinancialService wave3 lorentz - getBudgetStats fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getBudgetStats: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when stats retrieval fails without explicit error', async () => {
    storageMock.getBudgetStats.mockResolvedValue({ success: false });

    await expect(service.getBudgetStats('Q2', 2027)).rejects.toThrow(BadRequestException);
    await expect(service.getBudgetStats('Q2', 2027)).rejects.toThrow('Unknown error');
  });
});
