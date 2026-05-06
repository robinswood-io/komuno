import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  getMembersBySubscriptionType: ReturnType<typeof vi.fn<[string], Promise<FailureResult>>>;
};

describe('FinancialService wave5 lorentz - getMembersBySubscriptionType fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getMembersBySubscriptionType: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when storage fails without error property', async () => {
    storageMock.getMembersBySubscriptionType.mockResolvedValue({ success: false });

    await expect(service.getMembersBySubscriptionType('type-42')).rejects.toThrow(BadRequestException);
    await expect(service.getMembersBySubscriptionType('type-42')).rejects.toThrow('Unknown error');
  });
});
