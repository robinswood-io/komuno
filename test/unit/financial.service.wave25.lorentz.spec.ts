import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  generateForecasts: ReturnType<typeof vi.fn<[string, number], Promise<FailureResult>>>;
};

describe('FinancialService wave25 lorentz - generateForecasts explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { generateForecasts: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException when generation fails with explicit error', async () => {
    storageMock.generateForecasts.mockResolvedValue({ success: false, error: new Error('Échec génération') });

    await expect(service.generateForecasts('yearly', 2031)).rejects.toThrow(BadRequestException);
    await expect(service.generateForecasts('yearly', 2031)).rejects.toThrow('Échec génération');
  });
});
