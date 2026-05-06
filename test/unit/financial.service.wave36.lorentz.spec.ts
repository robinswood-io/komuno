import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type StorageMock = {
  createBudget: ReturnType<typeof vi.fn<[unknown], Promise<{ success: true; data: { id: string } }>>>;
};

describe('FinancialService wave36 lorentz - createBudget zod-validation branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { createBudget: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException and does not call storage when payload is invalid', async () => {
    await expect(service.createBudget(undefined)).rejects.toThrow(BadRequestException);
    expect(storageMock.createBudget).not.toHaveBeenCalled();
  });
});
