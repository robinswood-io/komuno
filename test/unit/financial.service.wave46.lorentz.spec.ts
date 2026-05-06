import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type SubscriptionTypeData = {
  id: string;
  name: string;
  isActive: boolean;
};

type SuccessResult = { success: true; data: SubscriptionTypeData[] };

type StorageMock = {
  getSubscriptionTypes: ReturnType<typeof vi.fn<[boolean], Promise<SuccessResult>>>;
};

describe('FinancialService wave46 lorentz - getSubscriptionTypes includeInactive=true success branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { getSubscriptionTypes: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('forwards includeInactive=true and returns success payload', async () => {
    const payload: SuccessResult = {
      success: true,
      data: [
        { id: 't-active', name: 'Actif', isActive: true },
        { id: 't-inactive', name: 'Inactif', isActive: false },
      ],
    };
    storageMock.getSubscriptionTypes.mockResolvedValue(payload);

    const result = await service.getSubscriptionTypes(true);

    expect(storageMock.getSubscriptionTypes).toHaveBeenCalledWith(true);
    expect(result).toEqual(payload);
  });
});
