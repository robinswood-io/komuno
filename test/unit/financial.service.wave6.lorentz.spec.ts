import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type UpdatePayload = {
  name: string;
  amountInCents: number;
  durationMonths: number;
};

type StorageMock = {
  updateSubscriptionType: ReturnType<typeof vi.fn<[string, unknown], Promise<FailureResult>>>;
};

describe('FinancialService wave6 lorentz - updateSubscriptionType not-found fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      updateSubscriptionType: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws NotFoundException with "Unknown error" when update fails without error payload', async () => {
    const payload: UpdatePayload = {
      name: 'Type premium',
      amountInCents: 15000,
      durationMonths: 12,
    };

    storageMock.updateSubscriptionType.mockResolvedValue({ success: false });

    await expect(service.updateSubscriptionType('sub-type-9', payload)).rejects.toThrow(NotFoundException);
    await expect(service.updateSubscriptionType('sub-type-9', payload)).rejects.toThrow('Unknown error');
  });
});
