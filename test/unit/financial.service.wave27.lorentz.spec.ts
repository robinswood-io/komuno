import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type RevenueOptions = {
  year?: number;
  type?: string;
  categoryId?: string;
};

type StorageMock = {
  getRevenues: ReturnType<typeof vi.fn<[RevenueOptions | undefined], Promise<FailureResult>>>;
};

describe('FinancialService wave27 lorentz - getRevenues explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getRevenues: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with storage error message', async () => {
    storageMock.getRevenues.mockResolvedValue({ success: false, error: new Error('Filtre revenu invalide') });

    await expect(service.getRevenues({ year: 2026, type: 'unknown' })).rejects.toThrow(BadRequestException);
    await expect(service.getRevenues({ year: 2026, type: 'unknown' })).rejects.toThrow('Filtre revenu invalide');
  });
});
