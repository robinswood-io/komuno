import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type ForecastOptions = {
  period?: string;
  year?: number;
  category?: string;
};

type StorageMock = {
  getForecasts: ReturnType<typeof vi.fn<[ForecastOptions], Promise<FailureResult>>>;
};

describe('FinancialService wave24 lorentz - getForecasts explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getForecasts: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with storage error message', async () => {
    storageMock.getForecasts.mockResolvedValue({ success: false, error: new Error('Prévisions indisponibles') });

    await expect(service.getForecasts({ period: 'monthly', year: 2029 })).rejects.toThrow(BadRequestException);
    await expect(service.getForecasts({ period: 'monthly', year: 2029 })).rejects.toThrow('Prévisions indisponibles');
  });
});
