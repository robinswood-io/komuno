import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  deleteSubscriptionType: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave15 lorentz - deleteSubscriptionType fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      deleteSubscriptionType: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when deletion fails without error payload', async () => {
    storageMock.deleteSubscriptionType.mockResolvedValue({ success: false });

    await expect(service.deleteSubscriptionType('type-missing')).rejects.toThrow(BadRequestException);
    await expect(service.deleteSubscriptionType('type-missing')).rejects.toThrow('Unknown error');
  });
});
