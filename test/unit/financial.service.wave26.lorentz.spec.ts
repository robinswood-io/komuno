import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type SubscriptionData = {
  id: string;
  memberEmail: string;
  status: string;
};

type SuccessResult = { success: true; data: SubscriptionData[] };

type StorageMock = {
  getSubscriptions: ReturnType<typeof vi.fn<[({ year?: number; status?: string; memberEmail?: string } | undefined)], Promise<SuccessResult>>>;
};

describe('FinancialService wave26 lorentz - getSubscriptions undefined-options success branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getSubscriptions: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards undefined options and returns successful payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: [{ id: 'sub-1', memberEmail: 'member@example.com', status: 'active' }],
    };
    storageMock.getSubscriptions.mockResolvedValue(payload);

    const result = await service.getSubscriptions(undefined);

    expect(storageMock.getSubscriptions).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(payload);
  });
});
