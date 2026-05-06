import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  getRevenueStats: ReturnType<typeof vi.fn<[number | undefined], Promise<FailureResult>>>;
};

describe('FinancialService wave28 lorentz - getRevenueStats explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getRevenueStats: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with storage error message', async () => {
    storageMock.getRevenueStats.mockResolvedValue({ success: false, error: new Error('Stats revenus indisponibles') });

    await expect(service.getRevenueStats(2024)).rejects.toThrow(BadRequestException);
    await expect(service.getRevenueStats(2024)).rejects.toThrow('Stats revenus indisponibles');
  });
});
