import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type StorageMock = {
  updateExpense: ReturnType<typeof vi.fn<[string, unknown], Promise<{ success: true; data: { id: string } }>>>;
};

describe('FinancialService wave37 lorentz - updateExpense zod-validation branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { updateExpense: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException and does not call storage when payload is invalid', async () => {
    await expect(service.updateExpense('exp-7', undefined)).rejects.toThrow(BadRequestException);
    expect(storageMock.updateExpense).not.toHaveBeenCalled();
  });
});
