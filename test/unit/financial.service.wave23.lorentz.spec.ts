import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  getFinancialCategories: ReturnType<typeof vi.fn<[string | undefined], Promise<FailureResult>>>;
};

describe('FinancialService wave23 lorentz - getCategories explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getFinancialCategories: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with storage error message', async () => {
    storageMock.getFinancialCategories.mockResolvedValue({ success: false, error: new Error('Type de catégorie inconnu') });

    await expect(service.getCategories('invalid-type')).rejects.toThrow(BadRequestException);
    await expect(service.getCategories('invalid-type')).rejects.toThrow('Type de catégorie inconnu');
  });
});
