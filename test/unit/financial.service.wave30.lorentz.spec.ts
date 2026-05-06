import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type RenewData = {
  id: string;
  status: string;
  renewedUntil: string;
};

type SuccessResult = { success: true; data: RenewData };

type StorageMock = {
  renewSubscription: ReturnType<typeof vi.fn<[unknown], Promise<SuccessResult>>>;
};

describe('FinancialService wave30 lorentz - renewSubscription success branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { renewSubscription: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('returns successful renewal payload and forwards input data', async () => {
    const input = { subscriptionId: 'sub-77', months: 12 };
    const payload: SuccessResult = {
      success: true,
      data: {
        id: 'sub-77',
        status: 'active',
        renewedUntil: '2032-01-01',
      },
    };

    storageMock.renewSubscription.mockResolvedValue(payload);

    const result = await service.renewSubscription(input);

    expect(storageMock.renewSubscription).toHaveBeenCalledWith(input);
    expect(result).toEqual(payload);
  });
});
