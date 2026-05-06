import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };
type SubscriptionTypePayload = {
  name: string;
  amountInCents: number;
  durationMonths: number;
  isActive: boolean;
};

type StorageMock = {
  createSubscriptionType: ReturnType<typeof vi.fn<[unknown], Promise<FailureResult>>>;
};

describe('FinancialService wave2 lorentz - createSubscriptionType fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      createSubscriptionType: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when storage fails without error payload', async () => {
    const payload: SubscriptionTypePayload = {
      name: 'Type annuel',
      amountInCents: 5000,
      durationMonths: 12,
      isActive: true,
    };

    storageMock.createSubscriptionType.mockResolvedValue({ success: false });

    await expect(service.createSubscriptionType(payload)).rejects.toThrow(BadRequestException);
    await expect(service.createSubscriptionType(payload)).rejects.toThrow('Unknown error');
  });
});
