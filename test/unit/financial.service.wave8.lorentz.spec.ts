import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  revokeSubscription: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave8 lorentz - revokeSubscription fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      revokeSubscription: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when revoke fails without error payload', async () => {
    storageMock.revokeSubscription.mockResolvedValue({ success: false });

    await expect(service.revokeSubscription('subscription-1')).rejects.toThrow(BadRequestException);
    await expect(service.revokeSubscription('subscription-1')).rejects.toThrow('Unknown error');
  });
});
