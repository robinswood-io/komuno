import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type StorageMock = {
  createSubscriptionRecord: ReturnType<typeof vi.fn<[unknown], Promise<{ success: true; data: { id: string } }>>>;
};

describe('FinancialService wave38 lorentz - createSubscription zod-validation branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { createSubscriptionRecord: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException and does not call storage when payload is invalid', async () => {
    await expect(service.createSubscription(undefined)).rejects.toThrow(BadRequestException);
    expect(storageMock.createSubscriptionRecord).not.toHaveBeenCalled();
  });
});
